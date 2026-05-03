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

type DailySummary = {
  date: string
  carsWashed: number
  ticketRevenue: number
  expensesTotal: number
  result: number
  courtesyCount: number
  voidedCount: number
  recentTickets: Ticket[]
  cashVariance?: number | null
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

const codeSchema = z.string()
  .min(1, 'Escribe un codigo')
  .max(40, 'Maximo 40 caracteres')
  .regex(/^[A-Z0-9_]+$/, 'Usa mayusculas, numeros o guion bajo')

const employeeSchema = z.object({
  fullName: z.string().min(1, 'Escribe el nombre').max(120, 'Maximo 120 caracteres'),
  phone: z.string().max(40, 'Maximo 40 caracteres').optional(),
})

type EmployeeFormValues = z.infer<typeof employeeSchema>

const serviceTypeSchema = z.object({
  code: codeSchema,
  name: z.string().min(1, 'Escribe el nombre').max(120, 'Maximo 120 caracteres'),
  description: z.string().max(500, 'Maximo 500 caracteres').optional(),
})

type ServiceTypeFormValues = z.infer<typeof serviceTypeSchema>

const vehicleSizeSchema = z.object({
  code: codeSchema,
  name: z.string().min(1, 'Escribe el nombre').max(120, 'Maximo 120 caracteres'),
  sortOrder: z.coerce.number().int('Debe ser numero entero').min(0, 'Minimo 0'),
})

type VehicleSizeFormValues = z.infer<typeof vehicleSizeSchema>

const servicePriceSchema = z.object({
  serviceTypeId: z.coerce.number().positive('Selecciona servicio'),
  vehicleSizeId: z.coerce.number().positive('Selecciona tamano'),
  amount: z.coerce.number().positive('El precio debe ser mayor que 0'),
  currency: z.enum(['MXN', 'USD']),
  effectiveFrom: z.string().min(1, 'Selecciona fecha'),
})

type ServicePriceFormValues = z.infer<typeof servicePriceSchema>

const operationsSchema = z.object({
  businessDate: z.string().min(1, 'Selecciona fecha'),
  shiftType: z.enum(['MATUTINO', 'VESPERTINO']),
})

type OperationsFormValues = z.infer<typeof operationsSchema>

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
          <SideLink to="/catalogos" label="Catalogos" />
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phase 4 MVP</p>
              <p className="text-lg font-semibold">Tickets y lavadores</p>
            </div>
            <nav className="flex gap-2 lg:hidden">
              <MobileLink to="/" label="Inicio" />
              <MobileLink to="/tickets/nuevo" label="Nuevo" />
              <MobileLink to="/tickets" label="Tickets" />
              <MobileLink to="/catalogos" label="Datos" />
            </nav>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tickets/nuevo" element={<NewTicketScreen />} />
            <Route path="/tickets" element={<TicketsBrowser />} />
            <Route path="/catalogos" element={<CatalogsScreen />} />
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
  const [date, setDate] = useState(today)
  const summary = useQuery({
    queryKey: ['daily-summary', date],
    queryFn: () => api<DailySummary>(`/api/v1/reports/daily-summary?date=${date}`),
  })

  const data = summary.data

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-slate-600">Resumen diario de ventas, carros y tickets recientes.</p>
        </div>
        <label className="w-full max-w-48">
          <span className="mb-1 block text-sm font-medium text-slate-700">Fecha</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>

      {summary.error && <ErrorMessage message={summary.error.message} />}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Ingresos autos" value={data ? money(data.ticketRevenue, 'MXN') : '...'} />
        <Metric label="Gastos" value={data ? money(data.expensesTotal, 'MXN') : '...'} />
        <Metric label="Resultado" value={data ? money(data.result, 'MXN') : '...'} />
        <Metric label="Carros lavados" value={String(data?.carsWashed ?? '...')} />
        <Metric label="Cortesias" value={String(data?.courtesyCount ?? '...')} />
        <Metric label="Tickets anulados" value={String(data?.voidedCount ?? '...')} />
      </div>

      <Panel title="Tickets recientes">
        <div className="overflow-hidden rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nota</th>
                <th className="px-4 py-3">Vehiculo</th>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Lavadores</th>
                <th className="px-4 py-3 text-right">Importe</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.recentTickets ?? []).map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">{ticket.notaNumber}</td>
                  <td className="px-4 py-3">{ticket.vehicleDescription || '-'}</td>
                  <td className="px-4 py-3">{ticket.serviceTypeName} / {ticket.vehicleSizeName}</td>
                  <td className="px-4 py-3">{ticket.assignments.map((assignment) => assignment.employeeName).join(', ')}</td>
                  <td className="px-4 py-3 text-right">{money(ticket.priceAmount, ticket.currency)}</td>
                  <td className="px-4 py-3">
                    <TicketStatusPill ticket={ticket} />
                  </td>
                </tr>
              ))}
              {!summary.isLoading && (data?.recentTickets.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No hay tickets para esta fecha. Crea tickets desde Nuevo ticket para ver el resumen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
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
          {disabledReason} Abre el dia y el turno desde Catalogos antes de capturar tickets.
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

function CatalogsScreen() {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState<string | null>(null)
  const data = usePhaseData()
  const openShifts = (data.shifts.data ?? []).filter((shift) => shift.status === 'OPEN')

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  const employeeForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { fullName: '', phone: '' },
  })
  const serviceForm = useForm<ServiceTypeFormValues>({
    resolver: zodResolver(serviceTypeSchema),
    defaultValues: { code: '', name: '', description: '' },
  })
  const sizeForm = useForm<VehicleSizeFormValues>({
    resolver: zodResolver(vehicleSizeSchema),
    defaultValues: { code: '', name: '', sortOrder: 0 },
  })
  const priceForm = useForm<ServicePriceFormValues>({
    resolver: zodResolver(servicePriceSchema),
    defaultValues: { serviceTypeId: 0, vehicleSizeId: 0, amount: 0, currency: 'MXN', effectiveFrom: today },
  })
  const operationsForm = useForm<OperationsFormValues>({
    resolver: zodResolver(operationsSchema),
    defaultValues: { businessDate: today, shiftType: 'MATUTINO' },
  })

  const employees = data.employees.data ?? []
  const services = data.services.data ?? []
  const sizes = data.sizes.data ?? []
  const prices = data.prices.data ?? []

  const createEmployee = useMutation({
    mutationFn: (values: EmployeeFormValues) => api<Employee>('/api/v1/employees', {
      method: 'POST',
      body: JSON.stringify({
        fullName: values.fullName.trim(),
        phone: values.phone?.trim() || undefined,
      }),
    }),
    onSuccess: async () => {
      employeeForm.reset({ fullName: '', phone: '' })
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      showToast('Lavador guardado')
    },
  })

  const createService = useMutation({
    mutationFn: (values: ServiceTypeFormValues) => api<ServiceType>('/api/v1/service-types', {
      method: 'POST',
      body: JSON.stringify({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      }),
    }),
    onSuccess: async () => {
      serviceForm.reset({ code: '', name: '', description: '' })
      await queryClient.invalidateQueries({ queryKey: ['service-types'] })
      showToast('Servicio guardado')
    },
  })

  const createSize = useMutation({
    mutationFn: (values: VehicleSizeFormValues) => api<VehicleSize>('/api/v1/vehicle-sizes', {
      method: 'POST',
      body: JSON.stringify({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        sortOrder: Number(values.sortOrder),
      }),
    }),
    onSuccess: async () => {
      sizeForm.reset({ code: '', name: '', sortOrder: 0 })
      await queryClient.invalidateQueries({ queryKey: ['vehicle-sizes'] })
      showToast('Tamano guardado')
    },
  })

  const createPrice = useMutation({
    mutationFn: (values: ServicePriceFormValues) => api<ServicePrice>('/api/v1/service-prices', {
      method: 'POST',
      body: JSON.stringify({
        serviceTypeId: Number(values.serviceTypeId),
        vehicleSizeId: Number(values.vehicleSizeId),
        amount: Number(values.amount),
        currency: values.currency,
        effectiveFrom: values.effectiveFrom,
      }),
    }),
    onSuccess: async () => {
      priceForm.reset({ serviceTypeId: 0, vehicleSizeId: 0, amount: 0, currency: 'MXN', effectiveFrom: today })
      await queryClient.invalidateQueries({ queryKey: ['service-prices'] })
      showToast('Precio guardado')
    },
  })

  const openBusinessDay = useMutation({
    mutationFn: (values: OperationsFormValues) => api<BusinessDay>('/api/v1/business-days/open', {
      method: 'POST',
      body: JSON.stringify({ businessDate: values.businessDate }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['business-days'] })
      showToast('Dia abierto')
    },
  })

  const openShift = useMutation({
    mutationFn: (values: OperationsFormValues) => api<Shift>('/api/v1/shifts/open', {
      method: 'POST',
      body: JSON.stringify({
        businessDayId: data.currentBusinessDay?.id,
        shiftType: values.shiftType,
      }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
      showToast('Turno abierto')
    },
  })

  return (
    <section className="space-y-5">
      {toast && <Toast message={toast} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Catalogos</h2>
          <p className="text-sm text-slate-600">Datos base para que el dueno configure tickets sin usar la base de datos.</p>
        </div>
        <NavLink to="/tickets/nuevo" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Ir a nuevo ticket
        </NavLink>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Panel title="Lavadores">
            <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]" onSubmit={employeeForm.handleSubmit((values) => createEmployee.mutate(values))}>
              <TextField label="Nombre" error={employeeForm.formState.errors.fullName?.message}>
                <input placeholder="Ej. Juan Perez" {...employeeForm.register('fullName')} />
              </TextField>
              <TextField label="Telefono" error={employeeForm.formState.errors.phone?.message}>
                <input placeholder="Opcional" {...employeeForm.register('phone')} />
              </TextField>
              <FormButton label="Agregar" loading={createEmployee.isPending} />
            </form>
            {createEmployee.error && <ErrorMessage message={createEmployee.error.message} />}
            <SimpleList
              empty="No hay lavadores activos."
              rows={employees.map((employee) => ({
                id: employee.id,
                title: employee.fullName,
                detail: employee.phone || 'Sin telefono',
              }))}
            />
          </Panel>

          <Panel title="Servicios">
            <form className="grid gap-3 md:grid-cols-[140px_1fr_auto]" onSubmit={serviceForm.handleSubmit((values) => createService.mutate(values))}>
              <TextField label="Codigo" error={serviceForm.formState.errors.code?.message}>
                <input placeholder="LAVADO" {...serviceForm.register('code')} />
              </TextField>
              <TextField label="Nombre" error={serviceForm.formState.errors.name?.message}>
                <input placeholder="Lavado exterior" {...serviceForm.register('name')} />
              </TextField>
              <FormButton label="Agregar" loading={createService.isPending} />
              <div className="md:col-span-3">
                <TextField label="Descripcion" error={serviceForm.formState.errors.description?.message}>
                  <textarea rows={2} placeholder="Opcional" {...serviceForm.register('description')} />
                </TextField>
              </div>
            </form>
            {createService.error && <ErrorMessage message={createService.error.message} />}
            <SimpleList
              empty="No hay servicios."
              rows={services.map((service) => ({
                id: service.id,
                title: service.name,
                detail: service.code,
              }))}
            />
          </Panel>

          <Panel title="Tamanos de vehiculo">
            <form className="grid gap-3 md:grid-cols-[140px_1fr_120px_auto]" onSubmit={sizeForm.handleSubmit((values) => createSize.mutate(values))}>
              <TextField label="Codigo" error={sizeForm.formState.errors.code?.message}>
                <input placeholder="CHICO" {...sizeForm.register('code')} />
              </TextField>
              <TextField label="Nombre" error={sizeForm.formState.errors.name?.message}>
                <input placeholder="Chico" {...sizeForm.register('name')} />
              </TextField>
              <TextField label="Orden" error={sizeForm.formState.errors.sortOrder?.message}>
                <input type="number" min={0} {...sizeForm.register('sortOrder')} />
              </TextField>
              <FormButton label="Agregar" loading={createSize.isPending} />
            </form>
            {createSize.error && <ErrorMessage message={createSize.error.message} />}
            <SimpleList
              empty="No hay tamanos."
              rows={sizes.map((size) => ({
                id: size.id,
                title: size.name,
                detail: `${size.code} / orden ${size.sortOrder}`,
              }))}
            />
          </Panel>

          <Panel title="Precios">
            <form className="grid gap-3 md:grid-cols-5" onSubmit={priceForm.handleSubmit((values) => createPrice.mutate(values))}>
              <SelectField label="Servicio" error={priceForm.formState.errors.serviceTypeId?.message}>
                <select {...priceForm.register('serviceTypeId')}>
                  <option value={0}>Servicio</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </SelectField>
              <SelectField label="Tamano" error={priceForm.formState.errors.vehicleSizeId?.message}>
                <select {...priceForm.register('vehicleSizeId')}>
                  <option value={0}>Tamano</option>
                  {sizes.map((size) => (
                    <option key={size.id} value={size.id}>{size.name}</option>
                  ))}
                </select>
              </SelectField>
              <TextField label="Precio" error={priceForm.formState.errors.amount?.message}>
                <input type="number" min={0} step="0.01" {...priceForm.register('amount')} />
              </TextField>
              <SelectField label="Moneda" error={priceForm.formState.errors.currency?.message}>
                <select {...priceForm.register('currency')}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </SelectField>
              <TextField label="Desde" error={priceForm.formState.errors.effectiveFrom?.message}>
                <input type="date" {...priceForm.register('effectiveFrom')} />
              </TextField>
              <div className="md:col-span-5">
                <FormButton label="Guardar precio" loading={createPrice.isPending} />
              </div>
            </form>
            {createPrice.error && <ErrorMessage message={createPrice.error.message} />}
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Tamano</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3">Desde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prices.map((price) => (
                    <tr key={price.id}>
                      <td className="px-4 py-3">{price.serviceTypeName}</td>
                      <td className="px-4 py-3">{price.vehicleSizeName}</td>
                      <td className="px-4 py-3 text-right">{money(price.amount, price.currency)}</td>
                      <td className="px-4 py-3">{price.effectiveFrom}</td>
                    </tr>
                  ))}
                  {prices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No hay precios vigentes para hoy.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Operacion de hoy">
            <form className="space-y-4" onSubmit={operationsForm.handleSubmit((values) => openBusinessDay.mutate(values))}>
              <TextField label="Fecha" error={operationsForm.formState.errors.businessDate?.message}>
                <input type="date" {...operationsForm.register('businessDate')} />
              </TextField>
              <button
                type="submit"
                disabled={openBusinessDay.isPending}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                {openBusinessDay.isPending ? 'Abriendo...' : 'Abrir dia'}
              </button>
            </form>
            {openBusinessDay.error && <ErrorMessage message={openBusinessDay.error.message} />}
            <div className="rounded-md bg-slate-50 p-3 text-sm">
              <p className="text-slate-500">Dia abierto</p>
              <p className="font-semibold">{data.currentBusinessDay?.businessDate ?? 'Sin abrir'}</p>
            </div>
          </Panel>

          <Panel title="Turnos">
            <form className="space-y-4" onSubmit={operationsForm.handleSubmit((values) => openShift.mutate(values))}>
              <SelectField label="Tipo de turno" error={operationsForm.formState.errors.shiftType?.message}>
                <select {...operationsForm.register('shiftType')}>
                  <option value="MATUTINO">MATUTINO</option>
                  <option value="VESPERTINO">VESPERTINO</option>
                </select>
              </SelectField>
              <button
                type="submit"
                disabled={openShift.isPending || !data.currentBusinessDay}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                {openShift.isPending ? 'Abriendo...' : 'Abrir turno'}
              </button>
            </form>
            {openShift.error && <ErrorMessage message={openShift.error.message} />}
            <SimpleList
              empty="No hay turno abierto."
              rows={openShifts.map((shift) => ({
                id: shift.id,
                title: shift.shiftType,
                detail: shift.status,
              }))}
            />
          </Panel>
        </aside>
      </div>
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
                  <TicketStatusPill ticket={ticket} />
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

function FormButton({ label, loading }: { label: string; loading: boolean }) {
  return (
    <div className="flex items-end">
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        {loading ? 'Guardando...' : label}
      </button>
    </div>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p>
}

function SimpleList({ rows, empty }: { rows: { id: number; title: string; detail: string }[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">{empty}</p>
  }

  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
          <span className="font-medium">{row.title}</span>
          <span className="text-right text-slate-500">{row.detail}</span>
        </div>
      ))}
    </div>
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

function TicketStatusPill({ ticket }: { ticket: Ticket }) {
  if (ticket.status === 'VOIDED') {
    return <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Cancelado</span>
  }
  if (ticket.courtesy) {
    return <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Cortesia</span>
  }
  return <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Activo</span>
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
