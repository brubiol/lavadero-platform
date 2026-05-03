import { useMemo, useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type Currency = 'MXN' | 'USD'
type TicketStatus = 'ACTIVE' | 'VOIDED'

type Employee = {
  id: number
  fullName: string
  phone?: string
  active: boolean
}

type ServiceType = {
  id: number
  code: string
  name: string
  description?: string
  active: boolean
}

type VehicleSize = {
  id: number
  code: string
  name: string
  sortOrder: number
  active: boolean
}

type ServicePrice = {
  id: number
  serviceTypeId: number
  serviceTypeName: string
  vehicleSizeId: number
  vehicleSizeName: string
  amount: number
  currency: Currency
  effectiveFrom: string
  effectiveTo?: string | null
}

type BusinessDay = {
  id: number
  businessDate: string
  status: 'OPEN' | 'CLOSED' | 'LOCKED'
}

type Shift = {
  id: number
  businessDayId: number
  shiftType: 'MATUTINO' | 'VESPERTINO'
  status: 'OPEN' | 'CLOSED'
}

type TicketAssignment = {
  employeeId: number
  employeeName: string
  sharePct: number
}

type Ticket = {
  id: number
  businessDayId: number
  shiftId: number
  serviceTypeId: number
  serviceTypeName: string
  vehicleSizeId: number
  vehicleSizeName: string
  dailySeq: number
  notaNumber: string
  vehicleDescription?: string | null
  priceAmount: number
  currency: Currency
  courtesy: boolean
  courtesyReason?: string | null
  status: TicketStatus
  voidReason?: string | null
  voidedAt?: string | null
  assignments: TicketAssignment[]
  createdAt: string
  updatedAt: string
}

const ticketSchema = z.object({
  businessDayId: z.coerce.number().positive('Abre un dia de trabajo primero'),
  shiftId: z.coerce.number().positive('Selecciona un turno abierto'),
  serviceTypeId: z.coerce.number().positive('Selecciona un servicio'),
  vehicleSizeId: z.coerce.number().positive('Selecciona un tamano'),
  currency: z.enum(['MXN', 'USD']),
  vehicleDescription: z.string().max(160, 'Maximo 160 caracteres').optional(),
  notes: z.string().max(500, 'Maximo 500 caracteres').optional(),
  courtesy: z.boolean().default(false),
  courtesyReason: z.string().max(500, 'Maximo 500 caracteres').optional(),
  employeeIds: z.array(z.coerce.number()).min(1, 'Selecciona al menos un lavador'),
}).superRefine((value, ctx) => {
  if (value.courtesy && !value.courtesyReason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['courtesyReason'],
      message: 'La cortesia requiere motivo',
    })
  }
})

type TicketFormValues = z.infer<typeof ticketSchema>

const voidSchema = z.object({
  reason: z.string().min(1, 'Escribe el motivo').max(500, 'Maximo 500 caracteres'),
})

type VoidFormValues = z.infer<typeof voidSchema>

const today = new Date().toISOString().slice(0, 10)

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Error ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json()
}

function money(value: number, currency: Currency) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value)
}

function AppShell() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Lavadero</p>
          <h1 className="text-xl font-bold">Operacion diaria</h1>
        </div>
        <nav className="space-y-1">
          <SideLink to="/" label="Dashboard" />
          <SideLink to="/tickets/nuevo" label="Nuevo ticket" />
          <SideLink to="/tickets" label="Tickets" />
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phase 3 MVP</p>
              <p className="text-lg font-semibold">Tickets y lavadores</p>
            </div>
            <nav className="flex gap-2 lg:hidden">
              <MobileLink to="/" label="Inicio" />
              <MobileLink to="/tickets/nuevo" label="Nuevo" />
              <MobileLink to="/tickets" label="Tickets" />
            </nav>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tickets/nuevo" element={<NewTicketScreen />} />
            <Route path="/tickets" element={<TicketsBrowser />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function SideLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block rounded-md px-3 py-2 text-sm font-medium ${
          isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

function MobileLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 text-sm font-medium ${
          isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

function Dashboard() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api<{ status: string }>('/api/v1/health'),
  })

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-slate-600">Resumen operativo pendiente para la siguiente fase.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Backend" value={health.data?.status ?? '...' } />
        <Metric label="Modulo activo" value="Tickets" />
        <Metric label="Reportes" value="Pendiente" />
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

function NewTicketScreen() {
  const navigate = useNavigate()
  return (
    <TicketWorkspace
      mode="create"
      onSaved={() => navigate('/tickets')}
    />
  )
}

function usePhaseData() {
  const businessDays = useQuery({
    queryKey: ['business-days', today],
    queryFn: () => api<BusinessDay[]>(`/api/v1/business-days?from=${today}&to=${today}`),
  })
  const currentBusinessDay = businessDays.data?.find((day) => day.status === 'OPEN')

  const shifts = useQuery({
    queryKey: ['shifts', currentBusinessDay?.id],
    enabled: Boolean(currentBusinessDay?.id),
    queryFn: () => api<Shift[]>(`/api/v1/shifts?business_day_id=${currentBusinessDay!.id}`),
  })

  const services = useQuery({
    queryKey: ['service-types'],
    queryFn: () => api<ServiceType[]>('/api/v1/service-types'),
  })
  const sizes = useQuery({
    queryKey: ['vehicle-sizes'],
    queryFn: () => api<VehicleSize[]>('/api/v1/vehicle-sizes'),
  })
  const prices = useQuery({
    queryKey: ['service-prices', currentBusinessDay?.businessDate ?? today],
    queryFn: () => api<ServicePrice[]>(`/api/v1/service-prices?effective_on=${currentBusinessDay?.businessDate ?? today}`),
  })
  const employees = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => api<Employee[]>('/api/v1/employees?active=true'),
  })

  return {
    businessDays,
    currentBusinessDay,
    shifts,
    services,
    sizes,
    prices,
    employees,
  }
}

function TicketWorkspace({
  mode,
  ticket,
  onSaved,
}: {
  mode: 'create' | 'edit'
  ticket?: Ticket
  onSaved: () => void
}) {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState<string | null>(null)
  const data = usePhaseData()
  const openShifts = (data.shifts.data ?? []).filter((shift) => shift.status === 'OPEN')
  const defaultShift = openShifts[0]

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    values: {
      businessDayId: ticket?.businessDayId ?? data.currentBusinessDay?.id ?? 0,
      shiftId: ticket?.shiftId ?? defaultShift?.id ?? 0,
      serviceTypeId: ticket?.serviceTypeId ?? 0,
      vehicleSizeId: ticket?.vehicleSizeId ?? 0,
      currency: ticket?.currency ?? 'MXN',
      vehicleDescription: ticket?.vehicleDescription ?? '',
      notes: '',
      courtesy: ticket?.courtesy ?? false,
      courtesyReason: ticket?.courtesyReason ?? '',
      employeeIds: ticket?.assignments.map((assignment) => assignment.employeeId) ?? [],
    },
  })

  const watched = form.watch()
  const livePrice = useMemo(() => {
    if (watched.courtesy) return 0
    return (data.prices.data ?? []).find((price) =>
      price.serviceTypeId === Number(watched.serviceTypeId) &&
      price.vehicleSizeId === Number(watched.vehicleSizeId) &&
      price.currency === watched.currency
    )?.amount
  }, [data.prices.data, watched.courtesy, watched.currency, watched.serviceTypeId, watched.vehicleSizeId])

  const save = useMutation({
    mutationFn: (values: TicketFormValues) => {
      const payload = {
        businessDayId: Number(values.businessDayId),
        shiftId: Number(values.shiftId),
        serviceTypeId: Number(values.serviceTypeId),
        vehicleSizeId: Number(values.vehicleSizeId),
        currency: values.currency,
        vehicleDescription: values.vehicleDescription || undefined,
        courtesy: values.courtesy,
        courtesyReason: values.courtesyReason || undefined,
        employeeIds: values.employeeIds.map(Number),
      }
      if (mode === 'edit' && ticket) {
        return api<Ticket>(`/api/v1/tickets/${ticket.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      }
      return api<Ticket>('/api/v1/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setToast(mode === 'edit' ? 'Ticket actualizado' : 'Ticket guardado')
      setTimeout(onSaved, 500)
    },
  })

  const disabledReason = !data.currentBusinessDay
    ? 'No hay dia de trabajo abierto para hoy.'
    : openShifts.length === 0
      ? 'No hay turno abierto para hoy.'
      : null

  return (
    <section className="space-y-5">
      {toast && <Toast message={toast} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{mode === 'edit' ? 'Editar ticket' : 'Nuevo ticket'}</h2>
          <p className="text-sm text-slate-600">Captura rapida para operacion de mostrador.</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm">
          <span className="text-slate-500">Dia: </span>
          <strong>{data.currentBusinessDay?.businessDate ?? 'Sin abrir'}</strong>
        </div>
      </div>

      {disabledReason && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {disabledReason} Abre un business day y un turno desde Swagger o API antes de capturar tickets.
        </div>
      )}

      <form className="grid gap-5 xl:grid-cols-[1fr_360px]" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <div className="space-y-5">
          <Panel title="Datos del servicio">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Turno" error={form.formState.errors.shiftId?.message}>
                <select {...form.register('shiftId')} disabled={Boolean(disabledReason)}>
                  <option value={0}>Selecciona turno</option>
                  {openShifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>{shift.shiftType}</option>
                  ))}
                </select>
              </SelectField>
              <SelectField label="Moneda" error={form.formState.errors.currency?.message}>
                <select {...form.register('currency')}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </SelectField>
              <SelectField label="Servicio" error={form.formState.errors.serviceTypeId?.message}>
                <select {...form.register('serviceTypeId')}>
                  <option value={0}>Selecciona servicio</option>
                  {(data.services.data ?? []).map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </SelectField>
              <SelectField label="Tamano de vehiculo" error={form.formState.errors.vehicleSizeId?.message}>
                <select {...form.register('vehicleSizeId')}>
                  <option value={0}>Selecciona tamano</option>
                  {(data.sizes.data ?? []).map((size) => (
                    <option key={size.id} value={size.id}>{size.name}</option>
                  ))}
                </select>
              </SelectField>
            </div>
            <TextField label="Descripcion del vehiculo" error={form.formState.errors.vehicleDescription?.message}>
              <input placeholder="Ej. Tsuru rojo, Tacoma blanca" {...form.register('vehicleDescription')} />
            </TextField>
            <TextField label="Notas internas" error={form.formState.errors.notes?.message}>
              <textarea rows={3} placeholder="Notas visibles solo en esta pantalla por ahora" {...form.register('notes')} />
            </TextField>
          </Panel>

          <Panel title="Lavadores">
            <div className="grid gap-2 md:grid-cols-2">
              {(data.employees.data ?? []).map((employee) => (
                <label key={employee.id} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    value={employee.id}
                    {...form.register('employeeIds')}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>{employee.fullName}</span>
                </label>
              ))}
            </div>
            {form.formState.errors.employeeIds?.message && <p className="mt-2 text-sm text-red-600">{form.formState.errors.employeeIds.message}</p>}
          </Panel>

          <Panel title="Cortesia">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" {...form.register('courtesy')} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
              Marcar como cortesia
            </label>
            {watched.courtesy && (
              <TextField label="Motivo de cortesia" error={form.formState.errors.courtesyReason?.message}>
                <textarea rows={3} placeholder="Ej. Cliente del dueno" {...form.register('courtesyReason')} />
              </TextField>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Resumen">
            <div className="space-y-3 text-sm">
              <SummaryRow label="Precio preview" value={livePrice === undefined ? 'Sin precio' : money(livePrice, watched.currency)} />
              <SummaryRow label="Lavadores" value={String(watched.employeeIds?.length ?? 0)} />
              <SummaryRow label="Tipo" value={watched.courtesy ? 'Cortesia' : 'Venta'} />
            </div>
            {save.error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{save.error.message}</p>}
            <button
              type="submit"
              disabled={save.isPending || Boolean(disabledReason)}
              className="mt-5 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {save.isPending ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar ticket'}
            </button>
          </Panel>
        </aside>
      </form>
    </section>
  )
}

function TicketsBrowser() {
  const queryClient = useQueryClient()
  const data = usePhaseData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<TicketStatus>('ACTIVE')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [voiding, setVoiding] = useState<Ticket | null>(null)

  const tickets = useQuery({
    queryKey: ['tickets', data.currentBusinessDay?.id, status],
    enabled: Boolean(data.currentBusinessDay?.id),
    queryFn: () => api<Ticket[]>(`/api/v1/tickets?business_day_id=${data.currentBusinessDay!.id}&status=${status}`),
  })

  const filtered = (tickets.data ?? []).filter((ticket) => {
    const haystack = `${ticket.notaNumber} ${ticket.vehicleDescription ?? ''} ${ticket.serviceTypeName} ${ticket.vehicleSizeName} ${ticket.assignments.map((a) => a.employeeName).join(' ')}`
      .toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Tickets</h2>
          <p className="text-sm text-slate-600">Busqueda y revision de tickets capturados.</p>
        </div>
        <NavLink to="/tickets/nuevo" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Nuevo ticket
        </NavLink>
      </div>

      <Panel title="Filtros">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <input
            className="field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nota, vehiculo, servicio o lavador"
          />
          <select className="field" value={status} onChange={(event) => setStatus(event.target.value as TicketStatus)}>
            <option value="ACTIVE">Activos</option>
            <option value="VOIDED">Cancelados</option>
          </select>
        </div>
      </Panel>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nota</th>
              <th className="px-4 py-3">Vehiculo</th>
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Lavadores</th>
              <th className="px-4 py-3 text-right">Importe</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">{ticket.notaNumber}</td>
                <td className="px-4 py-3">{ticket.vehicleDescription || '-'}</td>
                <td className="px-4 py-3">{ticket.serviceTypeName} / {ticket.vehicleSizeName}</td>
                <td className="px-4 py-3">{ticket.assignments.map((a) => a.employeeName).join(', ')}</td>
                <td className="px-4 py-3 text-right">{money(ticket.priceAmount, ticket.currency)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${ticket.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {ticket.status === 'ACTIVE' ? 'Activo' : 'Cancelado'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-sm font-semibold text-blue-700 hover:text-blue-900" onClick={() => setSelected(ticket)}>Ver</button>
                  {ticket.status === 'ACTIVE' && (
                    <button className="ml-3 text-sm font-semibold text-red-700 hover:text-red-900" onClick={() => setVoiding(ticket)}>Cancelar</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">No hay tickets para estos filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title={`Ticket ${selected.notaNumber}`} onClose={() => setSelected(null)}>
          <TicketWorkspace mode="edit" ticket={selected} onSaved={() => setSelected(null)} />
        </Modal>
      )}
      {voiding && (
        <VoidDialog
          ticket={voiding}
          onClose={() => setVoiding(null)}
          onVoided={async () => {
            await queryClient.invalidateQueries({ queryKey: ['tickets'] })
            setVoiding(null)
          }}
        />
      )}
    </section>
  )
}

function VoidDialog({ ticket, onClose, onVoided }: { ticket: Ticket; onClose: () => void; onVoided: () => void }) {
  const form = useForm<VoidFormValues>({ resolver: zodResolver(voidSchema), defaultValues: { reason: '' } })
  const mutation = useMutation({
    mutationFn: (values: VoidFormValues) => api<Ticket>(`/api/v1/tickets/${ticket.id}/void`, {
      method: 'POST',
      body: JSON.stringify(values),
    }),
    onSuccess: onVoided,
  })

  return (
    <Modal title="Cancelar ticket" onClose={onClose} narrow>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <p className="text-sm text-slate-600">El ticket queda guardado como cancelado y no cuenta para ingresos.</p>
        <TextField label="Motivo" error={form.formState.errors.reason?.message}>
          <textarea rows={4} placeholder="Ej. Capturado por error" {...form.register('reason')} />
        </TextField>
        {mutation.error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{mutation.error.message}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={onClose}>Volver</button>
          <button type="submit" className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Confirmar cancelacion
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function SelectField({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  )
}

function TextField({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2">
      <span className="text-slate-500">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Modal({ title, children, onClose, narrow = false }: { title: string; children: React.ReactNode; onClose: () => void; narrow?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">
      <div className={`rounded-md bg-white shadow-xl ${narrow ? 'w-full max-w-lg' : 'w-full max-w-6xl'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100" onClick={onClose}>Cerrar</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed right-5 top-5 z-50 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg">
      {message}
    </div>
  )
}

export default function App() {
  return <AppShell />
}
