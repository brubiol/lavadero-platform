import { createContext, useContext, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type Currency = 'MXN' | 'USD'
type PaymentMethod = 'CASH' | 'CARD'
type TicketStatus = 'ACTIVE' | 'VOIDED'
type AuthRole = 'OPERADOR' | 'GERENTE' | 'DUENO'

type AuthUser = {
  id: number
  username: string
  fullName: string
  role: AuthRole
}

type AuthPayload = {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  user: AuthUser
}

type Employee = {
  id: number
  fullName: string
  phone?: string
  active: boolean
  baseWeeklySalary: number
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

type CashCount = {
  id: number
  shiftId: number
  currency: Currency
  bills1000: number
  bills500: number
  bills200: number
  bills100: number
  bills50: number
  bills20: number
  coins10: number
  coins5: number
  coins2: number
  coins1: number
  coins05: number
  morrallaTotal: number
  totalCounted: number
}

type ShiftCloseSummary = {
  id?: number | null
  shiftId: number
  businessDayId: number
  shiftStatus: Shift['status']
  ticketRevenue: number
  cashRevenue: number
  cardRevenue: number
  expensesTotal: number
  withdrawalsTotal: number
  expectedCash: number
  totalCounted?: number | null
  variance?: number | null
  closingReason?: string | null
  closedAt?: string | null
  cashCount?: CashCount | null
  closed: boolean
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
  paymentMethod: PaymentMethod
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

type ExpenseCategory = 'CFE' | 'TELMEX' | 'BASURA' | 'NOMINA' | 'MATERIAL' | 'GARRAFON_DE_AGUA' | 'TAXI' | 'COMISION_DEPOSITO' | 'OTHER'

type Expense = {
  id: number
  businessDayId?: number | null
  shiftId?: number | null
  expenseDate: string
  category: ExpenseCategory
  amount: number
  description?: string | null
}

type Withdrawal = {
  id: number
  businessDayId?: number | null
  shiftId?: number | null
  withdrawalDate: string
  amount: number
  reason?: string | null
}

type EmployeeAdvance = {
  id: number
  businessDayId?: number | null
  shiftId?: number | null
  employeeId: number
  employeeName: string
  advanceDate: string
  amount: number
  reason?: string | null
}

type PayrollPeriodStatus = 'OPEN' | 'COMPUTED' | 'LOCKED'

type PayrollEntry = {
  id: number
  employeeId: number
  employeeName: string
  carsWashed: number
  baseSalary: number
  carsBonusRate: number
  carsBonus: number
  commissions: number
  tipsPoolShare: number
  advancesDeducted: number
  netPay: number
}

type PayrollDay = {
  id: number
  employeeId: number
  employeeName: string
  workDate: string
  carsWashed: number
  ticketRevenue: number
}

type PayrollPeriod = {
  id: number
  startDate: string
  endDate: string
  status: PayrollPeriodStatus
  computedAt?: string | null
  lockedAt?: string | null
  entries: PayrollEntry[]
  days: PayrollDay[]
}

type DebtBalance = {
  employeeId: number
  balance: number
}

type MovementType = 'SALE' | 'FIADO' | 'PURCHASE' | 'ADJUSTMENT' | 'OPENING_COUNT' | 'CLOSING_COUNT'

type Product = {
  id: number
  name: string
  sku: string
  currentUnitPrice: number
  trackInventory: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

type ProductMovement = {
  id: number
  productId: number
  productName: string
  movementType: MovementType
  movementDate: string
  quantity: number
  unitPrice: number
  totalAmount: number
  reason?: string | null
}

type ProductSnapshot = {
  product: Product
  quantityOnHand: number
  recentMovements: ProductMovement[]
}

type InventorySnapshot = {
  asOf: string
  products: ProductSnapshot[]
}

type DailySummaryRange = {
  from: string
  to: string
  carsWashed: number
  ticketRevenue: number
  expensesTotal: number
  withdrawalsTotal: number
  advancesTotal: number
  result: number
  courtesyCount: number
  voidedCount: number
  cashVariance?: number | null
  days: DailySummary[]
}

type MonthlySummary = DailySummaryRange & {
  year: number
  month: number
}

type CashVarianceRow = {
  date: string
  shiftId: number
  shiftType: string
  expectedCash: number
  totalCounted: number
  variance: number
  closingReason?: string | null
}

type CashVarianceReport = {
  from: string
  to: string
  expectedCash: number
  totalCounted: number
  variance: number
  rows: CashVarianceRow[]
}

type EmployeePerformanceRow = {
  employeeId: number
  employeeName: string
  carsWashed: number
  ticketRevenue: number
  ticketCount: number
}

type EmployeePerformanceReport = {
  from: string
  to: string
  employees: EmployeePerformanceRow[]
}

type ExportPreview = {
  type: string
  from: string
  to: string
  ticketCount: number
  ticketRevenue: number
  expensesTotal: number
  withdrawalsTotal: number
  advancesTotal: number
  shiftCloseCount: number
  inventoryMovementCount: number
  payrollPeriodCount: number
}

type HistoricalSnapshotRow = {
  date: string
  totalCars: number | null
  revenueMxn: number
  expensesMxn: number
  resultadoMxn: number
  source: string
}
type HistoricalRangeResponse = {
  from: string
  to: string
  totalDays: number
  totalCars: number
  totalRevenue: number
  totalExpenses: number
  totalResultado: number
  days: HistoricalSnapshotRow[]
}

type AiFeatureType = 'DAILY_BRIEF' | 'ANOMALY_ALERT' | 'MONTHLY_ADVISOR' | 'ANALYST_CHAT' | 'AGENT_INVESTIGATION'
type AiSeverity = 'INFO' | 'WARNING' | 'CRITICAL'
type AiInsightStatus = 'NEW' | 'ACKNOWLEDGED' | 'DISMISSED'
type InvestigationConfidence = 'LOW' | 'MEDIUM' | 'HIGH'

type AiInsight = {
  id: number
  featureType: AiFeatureType
  severity: AiSeverity
  title: string
  summary: string
  details: Record<string, unknown> | null
  sourceFrom: string
  sourceTo: string
  status: AiInsightStatus
  generatedBy: string
  generatedAt: string
  createdAt: string
  updatedAt: string
}

type AnalystChatResponse = {
  answer: string
  supportingNumbers: string[]
  sourceFrom: string
  sourceTo: string
  suggestedFollowUps: string[]
  insight: AiInsight
}

type InvestigationResponse = {
  conclusion: string
  evidence: string[]
  steps: string[]
  confidence: InvestigationConfidence
  sourceFrom: string
  sourceTo: string
  insight: AiInsight
}

type MonthAggregate = {
  month: string
  cars: number
  revenue: number
  expenses: number
  resultado: number
  sources: Set<string>
}

function groupByMonth(days: HistoricalSnapshotRow[]): MonthAggregate[] {
  const map = new Map<string, MonthAggregate>()
  for (const d of days) {
    const key = d.date.slice(0, 7)
    if (!map.has(key)) map.set(key, { month: key, cars: 0, revenue: 0, expenses: 0, resultado: 0, sources: new Set() })
    const agg = map.get(key)!
    agg.cars += d.totalCars ?? 0
    agg.revenue += d.revenueMxn
    agg.expenses += d.expensesMxn
    agg.resultado += d.resultadoMxn
    agg.sources.add(d.source)
  }
  return Array.from(map.values())
}

const expenseCategories: ExpenseCategory[] = [
  'CFE',
  'TELMEX',
  'BASURA',
  'NOMINA',
  'MATERIAL',
  'GARRAFON_DE_AGUA',
  'TAXI',
  'COMISION_DEPOSITO',
  'OTHER',
]

const ticketSchema = z.object({
  businessDayId: z.coerce.number().positive('Abre un dia de trabajo primero'),
  shiftId: z.coerce.number().positive('Selecciona un turno abierto'),
  serviceTypeId: z.coerce.number().positive('Selecciona un servicio'),
  vehicleSizeId: z.coerce.number().positive('Selecciona un tamano'),
  currency: z.enum(['MXN', 'USD']),
  paymentMethod: z.enum(['CASH', 'CARD']).default('CASH'),
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
  baseWeeklySalary: z.coerce.number().min(0, 'Minimo 0'),
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

const expenseSchema = z.object({
  expenseDate: z.string().min(1, 'Selecciona fecha'),
  businessDayId: z.coerce.number().optional(),
  shiftId: z.coerce.number().optional(),
  category: z.enum(expenseCategories),
  amount: z.coerce.number().positive('El monto debe ser mayor que 0'),
  description: z.string().max(500, 'Maximo 500 caracteres').optional(),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

const withdrawalSchema = z.object({
  withdrawalDate: z.string().min(1, 'Selecciona fecha'),
  businessDayId: z.coerce.number().optional(),
  shiftId: z.coerce.number().optional(),
  amount: z.coerce.number().positive('El monto debe ser mayor que 0'),
  reason: z.string().max(500, 'Maximo 500 caracteres').optional(),
})

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>

const advanceSchema = z.object({
  advanceDate: z.string().min(1, 'Selecciona fecha'),
  businessDayId: z.coerce.number().optional(),
  shiftId: z.coerce.number().optional(),
  employeeId: z.coerce.number().positive('Selecciona lavador'),
  amount: z.coerce.number().positive('El monto debe ser mayor que 0'),
  reason: z.string().max(500, 'Maximo 500 caracteres').optional(),
})

type AdvanceFormValues = z.infer<typeof advanceSchema>

const cashCountSchema = z.object({
  shiftId: z.coerce.number().positive('Selecciona turno'),
  currency: z.enum(['MXN', 'USD']),
  bills1000: z.coerce.number().int().min(0),
  bills500: z.coerce.number().int().min(0),
  bills200: z.coerce.number().int().min(0),
  bills100: z.coerce.number().int().min(0),
  bills50: z.coerce.number().int().min(0),
  bills20: z.coerce.number().int().min(0),
  coins10: z.coerce.number().int().min(0),
  coins5: z.coerce.number().int().min(0),
  coins2: z.coerce.number().int().min(0),
  coins1: z.coerce.number().int().min(0),
  coins05: z.coerce.number().int().min(0),
  morrallaTotal: z.coerce.number().min(0),
})

type CashCountFormValues = z.infer<typeof cashCountSchema>

const closeShiftSchema = z.object({
  closingReason: z.string().max(500, 'Maximo 500 caracteres').optional(),
})

type CloseShiftFormValues = z.infer<typeof closeShiftSchema>

const payrollPeriodSchema = z.object({
  startDate: z.string().min(1, 'Selecciona domingo'),
})

type PayrollPeriodFormValues = z.infer<typeof payrollPeriodSchema>

const productSchema = z.object({
  name: z.string().min(1, 'Escribe el nombre').max(120, 'Maximo 120 caracteres'),
  sku: z.string().max(60, 'Maximo 60 caracteres').optional(),
  currentUnitPrice: z.coerce.number().min(0, 'Minimo 0'),
  trackInventory: z.boolean().default(true),
  active: z.boolean().default(true),
})

type ProductFormValues = z.infer<typeof productSchema>

const inventorySaleSchema = z.object({
  productId: z.coerce.number().positive('Selecciona producto'),
  quantity: z.coerce.number().positive('Cantidad mayor que 0'),
  unitPrice: z.coerce.number().min(0, 'Minimo 0').optional(),
  movementDate: z.string().optional(),
  fiado: z.boolean().default(false),
})

type InventorySaleFormValues = z.infer<typeof inventorySaleSchema>

const inventoryPurchaseSchema = z.object({
  productId: z.coerce.number().positive('Selecciona producto'),
  quantity: z.coerce.number().positive('Cantidad mayor que 0'),
  unitPrice: z.coerce.number().min(0, 'Minimo 0').optional(),
  movementDate: z.string().optional(),
})

type InventoryPurchaseFormValues = z.infer<typeof inventoryPurchaseSchema>

const inventoryAdjustmentSchema = z.object({
  productId: z.coerce.number().positive('Selecciona producto'),
  quantity: z.coerce.number().refine((value) => value !== 0, 'Cantidad no puede ser 0'),
  reason: z.string().min(1, 'El ajuste requiere motivo').max(500, 'Maximo 500 caracteres'),
  movementDate: z.string().optional(),
})

type InventoryAdjustmentFormValues = z.infer<typeof inventoryAdjustmentSchema>

const analystChatSchema = z.object({
  message: z.string().min(1, 'Escribe una pregunta').max(500, 'Maximo 500 caracteres'),
})

type AnalystChatFormValues = z.infer<typeof analystChatSchema>

const investigationSchema = z.object({
  question: z.string().min(1, 'Escribe que investigar').max(500, 'Maximo 500 caracteres'),
})

type InvestigationFormValues = z.infer<typeof investigationSchema>

const today = new Date().toISOString().slice(0, 10)

const authStorageKey = 'lavadero.auth'

function readStoredAuth(): AuthPayload | null {
  const raw = window.localStorage.getItem(authStorageKey)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthPayload
  } catch {
    window.localStorage.removeItem(authStorageKey)
    return null
  }
}

function writeStoredAuth(payload: AuthPayload | null) {
  if (payload) {
    window.localStorage.setItem(authStorageKey, JSON.stringify(payload))
  } else {
    window.localStorage.removeItem(authStorageKey)
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = readStoredAuth()
  const headers = {
    'Content-Type': 'application/json',
    ...(auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
    ...(init?.headers ?? {}),
  }
  let response = await fetch(path, {
    ...init,
    headers,
  })
  if (response.status === 401 && auth?.refreshToken && !path.includes('/api/v1/auth/refresh')) {
    const refreshed = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    })
    if (refreshed.ok) {
      const nextAuth = await refreshed.json() as AuthPayload
      writeStoredAuth(nextAuth)
      response = await fetch(path, {
        ...init,
        headers: {
          ...headers,
          Authorization: `Bearer ${nextAuth.accessToken}`,
        },
      })
    } else {
      writeStoredAuth(null)
    }
  }
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

type AuthContextValue = {
  auth: AuthPayload | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (role: AuthRole) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthPayload | null>(() => readStoredAuth())

  const login = async (username: string, password: string) => {
    const payload = await api<AuthPayload>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    writeStoredAuth(payload)
    setAuth(payload)
  }

  const logout = async () => {
    const current = readStoredAuth()
    if (current?.refreshToken) {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${current.accessToken}`,
        },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      }).catch(() => undefined)
    }
    writeStoredAuth(null)
    setAuth(null)
  }

  const hasRole = (role: AuthRole) => {
    if (!auth) return false
    const rank: Record<AuthRole, number> = { OPERADOR: 1, GERENTE: 2, DUENO: 3 }
    return rank[auth.user.role] >= rank[role]
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is missing')
  return context
}

// ── Icons ─────────────────────────────────────────────────────────────────
function IconHome() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}
function IconPlus() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
function IconList() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  )
}
function IconWallet() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  )
}
function IconCalc() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.616 4.5 4.709v.791a23.935 23.935 0 0 1 3-.26M12 2.25c1.892 0 3.758.11 5.593.322C18.693 2.7 19.5 3.616 19.5 4.709v.791a23.933 23.933 0 0 0-3-.26M12 2.25v2M4.5 6h15" />
    </svg>
  )
}
function IconUsers() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}
function IconBox() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  )
}
function IconChart() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}
function IconLogout() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
    </svg>
  )
}

function AppShell() {
  const { auth, logout, hasRole } = useAuth()
  if (!auth) {
    return <LoginScreen />
  }

  const initials = auth.user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col bg-slate-900 lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-5">
          <img src="/logo.png" alt="Turbo Lavado" className="h-9 w-9 shrink-0 rounded-xl object-contain shadow" />
          <div>
            <p className="text-sm font-bold tracking-wide text-white">Turbo Lavado</p>
            <p className="text-xs text-slate-500">Operacion diaria</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            <SideLink to="/" label="Dashboard" icon={<IconHome />} />
            <SideLink to="/tickets/nuevo" label="Nuevo ticket" icon={<IconPlus />} />
            <SideLink to="/tickets" label="Tickets" icon={<IconList />} />
            <SideLink to="/gastos" label="Gastos" icon={<IconWallet />} />
            <SideLink to="/corte" label="Corte" icon={<IconCalc />} />
          </div>

          {hasRole('GERENTE') && (
            <div className="mt-6 space-y-0.5">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Gestion</p>
              <SideLink to="/nomina" label="Nomina" icon={<IconUsers />} />
              <SideLink to="/inventario" label="Inventario" icon={<IconBox />} />
              <SideLink to="/catalogos" label="Catalogos" icon={<IconSettings />} />
            </div>
          )}

          {hasRole('DUENO') && (
            <div className="mt-6 space-y-0.5">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Dueno</p>
              <SideLink to="/reportes" label="Reportes" icon={<IconChart />} />
            </div>
          )}
        </nav>
        <div className="shrink-0 border-t border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{auth.user.fullName}</p>
              <p className="text-xs text-slate-500">{roleLabel(auth.user.role)}</p>
            </div>
            <button
              onClick={() => void logout()}
              title="Cerrar sesion"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        {/* ── Mobile top bar ── */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-7 w-7 rounded-lg object-contain" />
            <span className="text-sm font-bold">Turbo Lavado</span>
          </div>
          <span className="text-xs text-gray-400">{auth.user.fullName}</span>
        </header>

        <main className="px-4 py-6 pb-24 lg:px-8 lg:pb-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tickets/nuevo" element={<NewTicketScreen />} />
            <Route path="/tickets" element={<TicketsBrowser />} />
            <Route path="/gastos" element={<ExpenseLedgerScreen />} />
            <Route path="/corte" element={<ShiftCloseScreen />} />
            <Route path="/nomina" element={<RequireRole role="GERENTE"><PayrollScreen /></RequireRole>} />
            <Route path="/inventario" element={<RequireRole role="GERENTE"><InventoryScreen /></RequireRole>} />
            <Route path="/reportes" element={<RequireRole role="DUENO"><ReportsScreen /></RequireRole>} />
            <Route path="/catalogos" element={<RequireRole role="GERENTE"><CatalogsScreen /></RequireRole>} />
          </Routes>
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-gray-200 bg-white lg:hidden">
          <MobileLink to="/" label="Inicio" icon={<IconHome />} />
          <MobileLink to="/tickets/nuevo" label="Nuevo" icon={<IconPlus />} />
          <MobileLink to="/tickets" label="Tickets" icon={<IconList />} />
          <MobileLink to="/gastos" label="Gastos" icon={<IconWallet />} />
          <MobileLink to="/corte" label="Corte" icon={<IconCalc />} />
        </nav>
      </div>
    </div>
  )
}

function SideLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/20'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

function MobileLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-1 py-2.5 text-center transition-colors ${
          isActive ? 'text-sky-600' : 'text-gray-400 hover:text-gray-700'
        }`
      }
    >
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </NavLink>
  )
}

function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('dueno')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/20 shadow-2xl">
            <img src="/logo.png" alt="Turbo Lavado" className="h-16 w-16 rounded-2xl object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white">Turbo Lavado</h1>
          <p className="mt-2 text-sm text-slate-400">Sistema de operacion diaria</p>
        </div>
        <form className="rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-black/5" onSubmit={submit}>
          <div className="space-y-5">
            <TextField label="Usuario">
              <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
            </TextField>
            <TextField label="Contrasena">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </TextField>
            {error && <ErrorMessage message={error} />}
            <button
              disabled={loading}
              className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
            >
              {loading ? 'Entrando...' : 'Iniciar sesion'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

function roleLabel(role: AuthRole) {
  const labels: Record<AuthRole, string> = {
    OPERADOR: 'Operador',
    GERENTE: 'Gerente',
    DUENO: 'Dueno',
  }
  return labels[role]
}

function RequireRole({ role, children }: { role: AuthRole; children: ReactNode }) {
  const { hasRole } = useAuth()
  if (!hasRole(role)) {
    return (
      <Panel title="Sin permiso">
        <p className="text-sm text-gray-500">Tu usuario no tiene permiso para esta pantalla.</p>
      </Panel>
    )
  }
  return <>{children}</>
}

function DayStatusCard() {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const data = usePhaseData()
  const [shiftType, setShiftType] = useState<'MATUTINO' | 'VESPERTINO'>('MATUTINO')
  const [toast, setToast] = useState<string | null>(null)

  const openShifts = (data.shifts.data ?? []).filter((s) => s.status === 'OPEN')
  const allShifts = data.shifts.data ?? []
  const day = data.currentBusinessDay

  const openDayMutation = useMutation({
    mutationFn: () => api<BusinessDay>('/api/v1/business-days/open', {
      method: 'POST',
      body: JSON.stringify({ businessDate: today }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['business-days'] })
      await queryClient.invalidateQueries({ queryKey: ['daily-summary'] })
      setToast('Dia abierto')
      setTimeout(() => setToast(null), 2000)
    },
  })

  const openShiftMutation = useMutation({
    mutationFn: (type: 'MATUTINO' | 'VESPERTINO') => api<Shift>('/api/v1/shifts/open', {
      method: 'POST',
      body: JSON.stringify({ businessDayId: day?.id, shiftType: type }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
      await queryClient.invalidateQueries({ queryKey: ['daily-summary'] })
      setToast('Turno abierto')
      setTimeout(() => setToast(null), 2000)
    },
  })

  const canAct = hasRole('GERENTE')

  if (!day) {
    return (
      <>
        {toast && <Toast message={toast} />}
        <div className="flex items-center justify-between gap-4 rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-5 py-4 shadow-sm">
          <div>
            <p className="font-bold text-amber-900">Sin dia de trabajo abierto</p>
            <p className="text-sm text-amber-700 mt-0.5">Hoy es {today}. Abre el dia para poder capturar tickets.</p>
          </div>
          {canAct && (
            <button
              onClick={() => openDayMutation.mutate()}
              disabled={openDayMutation.isPending}
              className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-amber-600 active:scale-[0.98] disabled:bg-amber-300"
            >
              {openDayMutation.isPending ? 'Abriendo...' : 'Abrir dia de hoy'}
            </button>
          )}
          {openDayMutation.error && <p className="text-sm text-red-700">{openDayMutation.error.message}</p>}
        </div>
      </>
    )
  }

  if (openShifts.length === 0) {
    const matiExists = allShifts.some((s) => s.shiftType === 'MATUTINO')
    const vespeExists = allShifts.some((s) => s.shiftType === 'VESPERTINO')
    return (
      <>
        {toast && <Toast message={toast} />}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-l-4 border-sky-400 bg-sky-50 px-5 py-4 shadow-sm">
          <div>
            <p className="font-bold text-sky-900">Dia abierto — sin turno activo</p>
            <p className="text-sm text-sky-700 mt-0.5">
              {allShifts.length === 0
                ? 'Abre el turno para empezar a capturar tickets.'
                : 'Todos los turnos de hoy estan cerrados.'}
            </p>
          </div>
          {canAct && (
            <div className="flex gap-2">
              {!matiExists && (
                <button
                  onClick={() => openShiftMutation.mutate('MATUTINO')}
                  disabled={openShiftMutation.isPending}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98] disabled:bg-sky-300"
                >
                  {openShiftMutation.isPending ? 'Abriendo...' : 'Turno Matutino'}
                </button>
              )}
              {!vespeExists && (
                <button
                  onClick={() => openShiftMutation.mutate('VESPERTINO')}
                  disabled={openShiftMutation.isPending}
                  className="rounded-xl border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition-all hover:bg-sky-50 active:scale-[0.98]"
                >
                  {openShiftMutation.isPending ? 'Abriendo...' : 'Turno Vespertino'}
                </button>
              )}
            </div>
          )}
          {openShiftMutation.error && <p className="w-full text-sm text-red-700">{openShiftMutation.error.message}</p>}
        </div>
      </>
    )
  }

  return (
    <>
      {toast && <Toast message={toast} />}
      <div className="flex items-center justify-between gap-4 rounded-2xl border-l-4 border-emerald-400 bg-emerald-50 px-5 py-4 shadow-sm">
        <div>
          <p className="font-bold text-emerald-900">En operacion — {today}</p>
          <p className="text-sm text-emerald-700 mt-0.5">
            {openShifts.map((s) => s.shiftType === 'MATUTINO' ? 'Turno Matutino' : 'Turno Vespertino').join(' + ')} activo
          </p>
        </div>
        <div className="flex items-center gap-2">
          {openShifts.map((s) => (
            <span key={s.id} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              {s.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino'} activo
            </span>
          ))}
          {canAct && !allShifts.some((s) => s.shiftType === 'VESPERTINO') && (
            <button
              onClick={() => openShiftMutation.mutate('VESPERTINO')}
              disabled={openShiftMutation.isPending}
              className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-50 active:scale-[0.98]"
            >
              + Turno Vespertino
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function Dashboard() {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const canSeeAi = hasRole('DUENO')
  const [date, setDate] = useState(today)
  const summary = useQuery({
    queryKey: ['daily-summary', date],
    queryFn: () => api<DailySummary>(`/api/v1/reports/daily-summary?date=${date}`),
  })
  const monthStart = today.slice(0, 7) + '-01'
  const monthHist = useQuery({
    queryKey: ['historical-month', monthStart],
    queryFn: () => api<HistoricalRangeResponse>(`/api/v1/reports/historical?from=${monthStart}&to=${today}`),
  })
  const aiBrief = useQuery({
    queryKey: ['ai-daily-brief', date],
    enabled: canSeeAi,
    queryFn: () => api<AiInsight>(`/api/v1/ai/briefs/daily?date=${date}`, { method: 'POST' }),
  })
  const aiInsights = useQuery({
    queryKey: ['ai-insights', 'dashboard', date],
    enabled: canSeeAi,
    queryFn: () => api<AiInsight[]>(`/api/v1/ai/insights?status=NEW&from=${date}&to=${date}`),
  })
  const runAlerts = useMutation({
    mutationFn: () => api<AiInsight[]>(`/api/v1/ai/alerts/run?from=${date}&to=${date}`, { method: 'POST' }),
    onSuccess: async () => {
      await invalidateAi(queryClient)
    },
  })

  const data = summary.data

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-gray-500">Resumen del dia — ventas, carros, estado del turno.</p>
        </div>
        <label className="w-full max-w-48">
          <span className="mb-1 block text-sm font-medium text-gray-700">Fecha</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>

      <DayStatusCard />

      {canSeeAi && (
        <AiInsightsPanel
          date={date}
          brief={aiBrief.data}
          insights={aiInsights.data ?? []}
          loading={aiBrief.isLoading || aiInsights.isLoading}
          error={aiBrief.error?.message || aiInsights.error?.message || runAlerts.error?.message}
          onRunAlerts={() => runAlerts.mutate()}
          runningAlerts={runAlerts.isPending}
        />
      )}

      {monthHist.data && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Historico del mes:</span>
          {' '}{monthHist.data.totalCars} carros
          {' · '}${Number(monthHist.data.totalRevenue).toLocaleString('es-MX', { maximumFractionDigits: 0 })} ingresos
          {' · '}
          <span className={monthHist.data.totalResultado >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
            ${Number(monthHist.data.totalResultado).toLocaleString('es-MX', { maximumFractionDigits: 0 })} resultado
          </span>
          {' '}
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">Excel</span>
        </div>
      )}

      {summary.error && <ErrorMessage message={summary.error.message} />}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <Metric label="Ingresos autos" value={data ? money(data.ticketRevenue, 'MXN') : '...'} variant="success" />
        <Metric label="Gastos" value={data ? money(data.expensesTotal, 'MXN') : '...'} variant="danger" />
        <Metric label="Resultado" value={data ? money(data.result, 'MXN') : '...'} variant="info" />
        <Metric label="Carros lavados" value={String(data?.carsWashed ?? '...')} variant="info" />
        <Metric label="Cortesias" value={String(data?.courtesyCount ?? '...')} />
        <Metric label="Anulados" value={String(data?.voidedCount ?? '...')} />
        <Metric label="Sobrante/Faltante" value={data?.cashVariance == null ? 'Pendiente' : money(data.cashVariance, 'MXN')} />
      </div>

      <Panel title="Tickets recientes">
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Nota</th>
                <th className="px-4 py-3">Vehiculo</th>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Lavadores</th>
                <th className="px-4 py-3 text-right">Importe</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data?.recentTickets ?? []).map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{ticket.notaNumber}</td>
                  <td className="px-4 py-3">{ticket.vehicleDescription || '-'}</td>
                  <td className="px-4 py-3">{ticket.serviceTypeName} / {ticket.vehicleSizeName}</td>
                  <td className="px-4 py-3">{ticket.assignments.map((assignment) => assignment.employeeName).join(', ')}</td>
                  <td className="px-4 py-3 text-right">{money(ticket.priceAmount, ticket.currency)}</td>
                  <td className="px-4 py-3">
                    {!ticket.courtesy && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ticket.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {ticket.paymentMethod === 'CARD' ? 'Tarjeta' : 'Efectivo'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TicketStatusPill ticket={ticket} />
                  </td>
                </tr>
              ))}
              {!summary.isLoading && (data?.recentTickets.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
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

type MetricVariant = 'default' | 'success' | 'danger' | 'info'

function Metric({ label, value, variant = 'default' }: { label: string; value: string; variant?: MetricVariant }) {
  const bg: Record<MetricVariant, string> = {
    default: 'bg-white border border-gray-100',
    success: 'bg-emerald-50 border border-emerald-100',
    danger:  'bg-red-50 border border-red-100',
    info:    'bg-sky-50 border border-sky-100',
  }
  const text: Record<MetricVariant, string> = {
    default: 'text-gray-900',
    success: 'text-emerald-700',
    danger:  'text-red-700',
    info:    'text-sky-700',
  }
  const label_: Record<MetricVariant, string> = {
    default: 'text-gray-500',
    success: 'text-emerald-600',
    danger:  'text-red-500',
    info:    'text-sky-600',
  }
  return (
    <div className={`rounded-2xl p-6 shadow-md ${bg[variant]}`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${label_[variant]}`}>{label}</p>
      <p className={`mt-2 text-3xl font-bold ${text[variant]}`}>{value}</p>
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
      paymentMethod: ticket?.paymentMethod ?? 'CASH',
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
        paymentMethod: values.courtesy ? 'CASH' : values.paymentMethod,
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
          <p className="text-sm text-gray-500">Captura rapida para operacion de mostrador.</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white px-4 py-2 text-sm">
          <span className="text-gray-400">Dia: </span>
          <strong>{data.currentBusinessDay?.businessDate ?? 'Sin abrir'}</strong>
        </div>
      </div>

      {disabledReason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
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
                    <option key={shift.id} value={shift.id}>{shift.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino'}</option>
                  ))}
                </select>
              </SelectField>
              <SelectField label="Moneda" error={form.formState.errors.currency?.message}>
                <select {...form.register('currency')}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </SelectField>
              <SelectField label="Forma de pago" error={form.formState.errors.paymentMethod?.message}>
                <select {...form.register('paymentMethod')} disabled={watched.courtesy}>
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
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
                <label key={employee.id} className="flex items-center gap-3 rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    value={employee.id}
                    {...form.register('employeeIds')}
                    className="h-4 w-4 rounded border-gray-200 text-sky-600"
                  />
                  <span>{employee.fullName}</span>
                </label>
              ))}
            </div>
            {form.formState.errors.employeeIds?.message && <p className="mt-2 text-sm text-red-600">{form.formState.errors.employeeIds.message}</p>}
          </Panel>

          <Panel title="Cortesia">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" {...form.register('courtesy')} className="h-4 w-4 rounded border-gray-200 text-sky-600" />
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
              <SummaryRow label="Pago" value={watched.courtesy ? 'Cortesia' : watched.paymentMethod === 'CARD' ? 'Tarjeta' : 'Efectivo'} />
            </div>
            {save.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{save.error.message}</p>}
            <button
              type="submit"
              disabled={save.isPending || Boolean(disabledReason)}
              className="mt-5 w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
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
    defaultValues: { fullName: '', phone: '', baseWeeklySalary: 0 },
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
        baseWeeklySalary: Number(values.baseWeeklySalary),
      }),
    }),
    onSuccess: async () => {
      employeeForm.reset({ fullName: '', phone: '', baseWeeklySalary: 0 })
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
          <p className="text-sm text-gray-500">Datos base para que el dueno configure tickets sin usar la base de datos.</p>
        </div>
        <NavLink to="/tickets/nuevo" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98]">
          Ir a nuevo ticket
        </NavLink>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Panel title="Lavadores">
            <form className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto]" onSubmit={employeeForm.handleSubmit((values) => createEmployee.mutate(values))}>
              <TextField label="Nombre" error={employeeForm.formState.errors.fullName?.message}>
                <input placeholder="Ej. Juan Perez" {...employeeForm.register('fullName')} />
              </TextField>
              <TextField label="Telefono" error={employeeForm.formState.errors.phone?.message}>
                <input placeholder="Opcional" {...employeeForm.register('phone')} />
              </TextField>
              <TextField label="Sueldo base" error={employeeForm.formState.errors.baseWeeklySalary?.message}>
                <input type="number" min={0} step="0.01" {...employeeForm.register('baseWeeklySalary')} />
              </TextField>
              <FormButton label="Agregar" loading={createEmployee.isPending} />
            </form>
            {createEmployee.error && <ErrorMessage message={createEmployee.error.message} />}
            <SimpleList
              empty="No hay lavadores activos."
              rows={employees.map((employee) => ({
                id: employee.id,
                title: employee.fullName,
                detail: `${employee.phone || 'Sin telefono'} / ${money(employee.baseWeeklySalary, 'MXN')}`,
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
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Tamano</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3">Desde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
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
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No hay precios vigentes para hoy.</td>
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
                className="w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
              >
                {openBusinessDay.isPending ? 'Abriendo...' : 'Abrir dia'}
              </button>
            </form>
            {openBusinessDay.error && <ErrorMessage message={openBusinessDay.error.message} />}
            <div className="rounded-md bg-gray-50 p-3 text-sm">
              <p className="text-gray-400">Dia abierto</p>
              <p className="font-semibold">{data.currentBusinessDay?.businessDate ?? 'Sin abrir'}</p>
            </div>
          </Panel>

          <Panel title="Turnos">
            <form className="space-y-4" onSubmit={operationsForm.handleSubmit((values) => openShift.mutate(values))}>
              <SelectField label="Tipo de turno" error={operationsForm.formState.errors.shiftType?.message}>
                <select {...operationsForm.register('shiftType')}>
                  <option value="MATUTINO">Matutino (manana)</option>
                  <option value="VESPERTINO">Vespertino (tarde)</option>
                </select>
              </SelectField>
              <button
                type="submit"
                disabled={openShift.isPending || !data.currentBusinessDay}
                className="w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
              >
                {openShift.isPending ? 'Abriendo...' : 'Abrir turno'}
              </button>
            </form>
            {openShift.error && <ErrorMessage message={openShift.error.message} />}
            <SimpleList
              empty="No hay turno abierto."
              rows={openShifts.map((shift) => ({
                id: shift.id,
                title: shift.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino',
                detail: shift.status === 'OPEN' ? 'Abierto' : 'Cerrado',
              }))}
            />
          </Panel>
        </aside>
      </div>
    </section>
  )
}

function ExpenseLedgerScreen() {
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [modal, setModal] = useState<'expense' | 'withdrawal' | 'advance' | null>(null)
  const data = usePhaseData()

  const expenses = useQuery({
    queryKey: ['expenses', from, to, category],
    queryFn: () => api<Expense[]>(`/api/v1/expenses?from=${from}&to=${to}${category ? `&category=${category}` : ''}`),
  })
  const withdrawals = useQuery({
    queryKey: ['withdrawals', from, to],
    queryFn: () => api<Withdrawal[]>(`/api/v1/withdrawals?from=${from}&to=${to}`),
  })
  const advances = useQuery({
    queryKey: ['employee-advances', from, to],
    queryFn: () => api<EmployeeAdvance[]>(`/api/v1/employee-advances?from=${from}&to=${to}`),
  })

  const totals = {
    expenses: (expenses.data ?? []).reduce((sum, row) => sum + row.amount, 0),
    withdrawals: (withdrawals.data ?? []).reduce((sum, row) => sum + row.amount, 0),
    advances: (advances.data ?? []).reduce((sum, row) => sum + row.amount, 0),
  }
  const combinedTotal = totals.expenses + totals.withdrawals + totals.advances

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Gastos</h2>
          <p className="text-sm text-gray-500">Registro de gastos, retiros y prestamos a lavadores.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98]" onClick={() => setModal('expense')}>Nuevo gasto</button>
          <button className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98]" onClick={() => setModal('withdrawal')}>Nuevo retiro</button>
          <button className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98]" onClick={() => setModal('advance')}>Nuevo prestamo</button>
        </div>
      </div>

      <Panel title="Filtros">
        <div className="grid gap-3 md:grid-cols-[180px_180px_220px]">
          <TextField label="Desde">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </TextField>
          <TextField label="Hasta">
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </TextField>
          <SelectField label="Categoria">
            <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory | '')}>
              <option value="">Todas</option>
              {expenseCategories.map((item) => (
                <option key={item} value={item}>{categoryLabel(item)}</option>
              ))}
            </select>
          </SelectField>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Gastos" value={money(totals.expenses, 'MXN')} />
        <Metric label="Retiros" value={money(totals.withdrawals, 'MXN')} />
        <Metric label="Prestamos" value={money(totals.advances, 'MXN')} />
        <Metric label="Total salida" value={money(combinedTotal, 'MXN')} />
      </div>

      <MoneyTable
        title="Gastos"
        rows={(expenses.data ?? []).map((row) => ({
          id: row.id,
          date: row.expenseDate,
          concept: categoryLabel(row.category),
          detail: row.description || '-',
          amount: row.amount,
        }))}
        empty="No hay gastos en este rango."
      />
      <MoneyTable
        title="Retiros"
        rows={(withdrawals.data ?? []).map((row) => ({
          id: row.id,
          date: row.withdrawalDate,
          concept: 'Retiro',
          detail: row.reason || '-',
          amount: row.amount,
        }))}
        empty="No hay retiros en este rango."
      />
      <MoneyTable
        title="Prestamos a lavadores"
        rows={(advances.data ?? []).map((row) => ({
          id: row.id,
          date: row.advanceDate,
          concept: row.employeeName,
          detail: row.reason || '-',
          amount: row.amount,
        }))}
        empty="No hay prestamos en este rango."
      />

      {modal === 'expense' && <ExpenseModal data={data} onClose={() => setModal(null)} />}
      {modal === 'withdrawal' && <WithdrawalModal data={data} onClose={() => setModal(null)} />}
      {modal === 'advance' && <AdvanceModal data={data} onClose={() => setModal(null)} />}
    </section>
  )
}

function ShiftCloseScreen() {
  const queryClient = useQueryClient()
  const data = usePhaseData()
  const shifts = data.shifts.data ?? []
  const defaultShiftId = shifts.find((shift) => shift.status === 'OPEN')?.id ?? shifts[0]?.id ?? 0
  const [selectedShiftId, setSelectedShiftId] = useState(defaultShiftId)
  const [cashCount, setCashCount] = useState<CashCount | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const effectiveShiftId = selectedShiftId || defaultShiftId
  const closeSummary = useQuery({
    queryKey: ['close-summary', effectiveShiftId],
    enabled: Boolean(effectiveShiftId),
    queryFn: () => api<ShiftCloseSummary>(`/api/v1/shifts/${effectiveShiftId}/close-summary`),
  })
  const summary = closeSummary.data
  const counted = cashCount?.totalCounted ?? summary?.totalCounted ?? null
  const variance = counted == null || !summary ? null : counted - summary.expectedCash
  const isShort = variance != null && variance < 0

  const cashForm = useForm<CashCountFormValues>({
    resolver: zodResolver(cashCountSchema),
    values: {
      shiftId: effectiveShiftId,
      currency: 'MXN',
      bills1000: 0,
      bills500: 0,
      bills200: 0,
      bills100: 0,
      bills50: 0,
      bills20: 0,
      coins10: 0,
      coins5: 0,
      coins2: 0,
      coins1: 0,
      coins05: 0,
      morrallaTotal: 0,
    },
  })
  const closeForm = useForm<CloseShiftFormValues>({
    resolver: zodResolver(closeShiftSchema),
    defaultValues: { closingReason: '' },
  })

  const countMutation = useMutation({
    mutationFn: (values: CashCountFormValues) => api<CashCount>('/api/v1/cash-counts', {
      method: 'POST',
      body: JSON.stringify({
        ...values,
        shiftId: Number(effectiveShiftId),
        morrallaTotal: Number(values.morrallaTotal),
      }),
    }),
    onSuccess: async (created) => {
      setCashCount(created)
      await queryClient.invalidateQueries({ queryKey: ['close-summary', effectiveShiftId] })
    },
  })

  const closeMutation = useMutation({
    mutationFn: (values: CloseShiftFormValues) => api<ShiftCloseSummary>(`/api/v1/shifts/${effectiveShiftId}/close`, {
      method: 'POST',
      body: JSON.stringify({
        cashCountId: cashCount?.id ?? summary?.cashCount?.id,
        closingReason: values.closingReason || undefined,
      }),
    }),
    onSuccess: async () => {
      setToast('Turno cerrado')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['close-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['shifts'] }),
        queryClient.invalidateQueries({ queryKey: ['tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-summary'] }),
      ])
    },
  })

  const watchedCount = cashForm.watch()
  const localCountPreview = calculateCashCount(watchedCount)

  return (
    <section className="space-y-5">
      {toast && <Toast message={toast} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Corte de turno</h2>
          <p className="text-sm text-gray-500">Conteo de efectivo, revision de salidas y cierre del turno.</p>
        </div>
        <SelectField label="Turno">
          <select value={effectiveShiftId} onChange={(event) => {
            setSelectedShiftId(Number(event.target.value))
            setCashCount(null)
          }}>
            <option value={0}>Selecciona turno</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino'} — {shift.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
              </option>
            ))}
          </select>
        </SelectField>
      </div>

      {!data.currentBusinessDay && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No hay dia abierto para hoy. Ve al Dashboard y abre el dia antes de hacer corte.
        </div>
      )}
      {data.currentBusinessDay && shifts.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No hay turnos para hoy. Ve al Dashboard y abre un turno.
        </div>
      )}
      {closeSummary.error && <ErrorMessage message={closeSummary.error.message} />}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Panel title="1. Conteo de efectivo">
            <form className="space-y-4" onSubmit={cashForm.handleSubmit((values) => countMutation.mutate(values))}>
              <div className="grid gap-3 md:grid-cols-4">
                <SelectField label="Moneda" error={cashForm.formState.errors.currency?.message}>
                  <select {...cashForm.register('currency')}>
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </SelectField>
                <CashInput label="$1000" name="bills1000" form={cashForm} />
                <CashInput label="$500" name="bills500" form={cashForm} />
                <CashInput label="$200" name="bills200" form={cashForm} />
                <CashInput label="$100" name="bills100" form={cashForm} />
                <CashInput label="$50" name="bills50" form={cashForm} />
                <CashInput label="$20" name="bills20" form={cashForm} />
                <CashInput label="$10" name="coins10" form={cashForm} />
                <CashInput label="$5" name="coins5" form={cashForm} />
                <CashInput label="$2" name="coins2" form={cashForm} />
                <CashInput label="$1" name="coins1" form={cashForm} />
                <CashInput label="$0.50" name="coins05" form={cashForm} />
              </div>
              <TextField label="Morralla total">
                <input type="number" min={0} step="0.01" {...cashForm.register('morrallaTotal')} />
              </TextField>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-gray-50 p-3 text-sm">
                <span className="text-gray-500">Total contado preview</span>
                <strong className="text-lg">{money(localCountPreview, watchedCount.currency)}</strong>
              </div>
              {countMutation.error && <ErrorMessage message={countMutation.error.message} />}
              <button
                type="submit"
                disabled={countMutation.isPending || !effectiveShiftId || summary?.closed}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
              >
                {countMutation.isPending ? 'Calculando...' : 'Guardar conteo'}
              </button>
            </form>
          </Panel>

          <Panel title="2. Gastos y retiros del turno">
            <div className="grid gap-4 md:grid-cols-3">
              <Metric label="Ingresos totales" value={summary ? money(summary.ticketRevenue, 'MXN') : '...'} />
              <Metric label="Gastos" value={summary ? money(summary.expensesTotal, 'MXN') : '...'} />
              <Metric label="Retiros" value={summary ? money(summary.withdrawalsTotal, 'MXN') : '...'} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-500">Efectivo</span>
                <strong>{summary ? money(summary.cashRevenue, 'MXN') : '...'}</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm">
                <span className="text-blue-600">Tarjeta</span>
                <strong className="text-blue-700">{summary ? money(summary.cardRevenue, 'MXN') : '...'}</strong>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Efectivo esperado = ingresos en efectivo - gastos - retiros. Los pagos con tarjeta no cuentan para el conteo de caja.
            </p>
          </Panel>

          <Panel title="3. Revision del corte">
            <div className="grid gap-4 md:grid-cols-3">
              <Metric label="Esperado" value={summary ? money(summary.expectedCash, 'MXN') : '...'} />
              <Metric label="Contado" value={counted == null ? 'Sin conteo' : money(counted, 'MXN')} />
              <Metric label="Diferencia" value={variance == null ? 'Pendiente' : money(variance, 'MXN')} />
            </div>
            {isShort && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Hay faltante. El sistema exige motivo antes de cerrar el turno.
              </div>
            )}
            {variance != null && variance > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Hay sobrante. Puedes cerrar sin motivo obligatorio.
              </div>
            )}
          </Panel>
        </div>

        <aside>
          <Panel title="4. Cerrar turno">
            <form className="space-y-4" onSubmit={closeForm.handleSubmit((values) => closeMutation.mutate(values))}>
              <SummaryRow label="Estado" value={summary?.closed ? 'Cerrado' : summary?.shiftStatus ?? 'Pendiente'} />
              <SummaryRow label="Conteo guardado" value={cashCount || summary?.cashCount ? 'Si' : 'No'} />
              <SummaryRow label="Diferencia" value={variance == null ? 'Pendiente' : money(variance, 'MXN')} />
              {isShort && (
                <TextField label="Motivo de faltante" error={closeForm.formState.errors.closingReason?.message}>
                  <textarea rows={4} placeholder="Ej. Falto cambio en caja" {...closeForm.register('closingReason')} />
                </TextField>
              )}
              {closeMutation.error && <ErrorMessage message={closeMutation.error.message} />}
              <button
                type="submit"
                disabled={closeMutation.isPending || summary?.closed || !(cashCount || summary?.cashCount)}
                className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
              >
                {closeMutation.isPending ? 'Cerrando...' : summary?.closed ? 'Turno cerrado' : 'Cerrar turno'}
              </button>
            </form>
          </Panel>
        </aside>
      </div>
    </section>
  )
}

function ReportsScreen() {
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [exportType, setExportType] = useState('full')
  const [histFrom, setHistFrom] = useState('2025-01-01')
  const [histTo, setHistTo] = useState(today)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const daily = useQuery({
    queryKey: ['reports-daily-range', from, to],
    queryFn: () => api<DailySummaryRange>(`/api/v1/reports/daily-summary?from=${from}&to=${to}`),
  })
  const monthly = useQuery({
    queryKey: ['reports-monthly', from],
    queryFn: () => {
      const [year, month] = from.split('-').map(Number)
      return api<MonthlySummary>(`/api/v1/reports/monthly?year=${year}&month=${month}`)
    },
  })
  const cashVariance = useQuery({
    queryKey: ['reports-cash-variance', from, to],
    queryFn: () => api<CashVarianceReport>(`/api/v1/reports/cash-variance?from=${from}&to=${to}`),
  })
  const performance = useQuery({
    queryKey: ['reports-employee-performance', from, to],
    queryFn: () => api<EmployeePerformanceReport>(`/api/v1/reports/employee-performance?from=${from}&to=${to}`),
  })
  const preview = useQuery({
    queryKey: ['reports-export-preview', exportType, from, to],
    queryFn: () => api<ExportPreview>(`/api/v1/reports/export/preview?type=${exportType}&from=${from}&to=${to}`),
  })

  const historical = useQuery({
    queryKey: ['reports-historical', histFrom, histTo],
    queryFn: () => api<HistoricalRangeResponse>(`/api/v1/reports/historical?from=${histFrom}&to=${histTo}`),
  })

  const range = daily.data

  const downloadExport = async () => {
    setDownloadError(null)
    try {
      const auth = readStoredAuth()
      const response = await fetch(`/api/v1/reports/export?type=${exportType}&from=${from}&to=${to}&format=xlsx`, {
        headers: auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {},
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || `Error ${response.status}`)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `lavadero-${exportType}-${from}-${to}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'No se pudo descargar el Excel')
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Reportes</h2>
          <p className="text-sm text-gray-500">Resumen diario, mensual, corte de caja, lavadores y exportacion Excel.</p>
        </div>
      </div>

      <Panel title="Rango">
        <div className="grid gap-3 md:grid-cols-[180px_180px_220px_auto]">
          <TextField label="Desde">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </TextField>
          <TextField label="Hasta">
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </TextField>
          <SelectField label="Tipo exportacion">
            <select value={exportType} onChange={(event) => setExportType(event.target.value)}>
              <option value="full">Completo</option>
              <option value="daily">Diario</option>
              <option value="monthly">Mensual</option>
            </select>
          </SelectField>
          <div className="flex items-end">
            <button
              type="button"
              onClick={downloadExport}
              className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Descargar Excel
            </button>
          </div>
        </div>
        {downloadError && <ErrorMessage message={downloadError} />}
      </Panel>

      {(daily.error || monthly.error || cashVariance.error || performance.error || preview.error) && (
        <ErrorMessage message={(daily.error || monthly.error || cashVariance.error || performance.error || preview.error)!.message} />
      )}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Ingresos" value={range ? money(range.ticketRevenue, 'MXN') : '...'} />
        <Metric label="Salidas" value={range ? money(range.expensesTotal, 'MXN') : '...'} />
        <Metric label="Resultado" value={range ? money(range.result, 'MXN') : '...'} />
        <Metric label="Carros" value={String(range?.carsWashed ?? '...')} />
        <Metric label="Cortesias" value={String(range?.courtesyCount ?? '...')} />
        <Metric label="Anulados" value={String(range?.voidedCount ?? '...')} />
      </div>

      <AiAnalystSection from={from} to={to} />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Panel title="Resumen por dia">
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Carros</th>
                    <th className="px-4 py-3 text-right">Ingresos</th>
                    <th className="px-4 py-3 text-right">Gastos</th>
                    <th className="px-4 py-3 text-right">Resultado</th>
                    <th className="px-4 py-3 text-right">Varianza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(range?.days ?? []).map((day) => (
                    <tr key={day.date} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{day.date}</td>
                      <td className="px-4 py-3 text-right">{day.carsWashed}</td>
                      <td className="px-4 py-3 text-right">{money(day.ticketRevenue, 'MXN')}</td>
                      <td className="px-4 py-3 text-right">{money(day.expensesTotal, 'MXN')}</td>
                      <td className="px-4 py-3 text-right">{money(day.result, 'MXN')}</td>
                      <td className="px-4 py-3 text-right">{day.cashVariance == null ? '-' : money(day.cashVariance, 'MXN')}</td>
                    </tr>
                  ))}
                  {!daily.isLoading && (range?.days.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay datos en este rango.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Rendimiento de lavadores">
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Lavador</th>
                    <th className="px-4 py-3 text-right">Tickets</th>
                    <th className="px-4 py-3 text-right">Carros acreditados</th>
                    <th className="px-4 py-3 text-right">Ingreso referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(performance.data?.employees ?? []).map((employee) => (
                    <tr key={employee.employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{employee.employeeName}</td>
                      <td className="px-4 py-3 text-right">{employee.ticketCount}</td>
                      <td className="px-4 py-3 text-right">{employee.carsWashed.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{money(employee.ticketRevenue, 'MXN')}</td>
                    </tr>
                  ))}
                  {!performance.isLoading && (performance.data?.employees.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No hay lavadores con tickets en este rango.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Varianza de caja">
            <div className="grid gap-4 md:grid-cols-3">
              <Metric label="Esperado" value={cashVariance.data ? money(cashVariance.data.expectedCash, 'MXN') : '...'} />
              <Metric label="Contado" value={cashVariance.data ? money(cashVariance.data.totalCounted, 'MXN') : '...'} />
              <Metric label="Diferencia" value={cashVariance.data ? money(cashVariance.data.variance, 'MXN') : '...'} />
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Turno</th>
                    <th className="px-4 py-3 text-right">Esperado</th>
                    <th className="px-4 py-3 text-right">Contado</th>
                    <th className="px-4 py-3 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(cashVariance.data?.rows ?? []).map((row) => (
                    <tr key={`${row.shiftId}-${row.date}`}>
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3">{row.shiftType}</td>
                      <td className="px-4 py-3 text-right">{money(row.expectedCash, 'MXN')}</td>
                      <td className="px-4 py-3 text-right">{money(row.totalCounted, 'MXN')}</td>
                      <td className="px-4 py-3 text-right">{money(row.variance, 'MXN')}</td>
                    </tr>
                  ))}
                  {!cashVariance.isLoading && (cashVariance.data?.rows.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hay cortes cerrados en este rango.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Export preview">
            <div className="space-y-3 text-sm">
              <SummaryRow label="Tickets" value={String(preview.data?.ticketCount ?? '...')} />
              <SummaryRow label="Ingresos" value={preview.data ? money(preview.data.ticketRevenue, 'MXN') : '...'} />
              <SummaryRow label="Gastos" value={preview.data ? money(preview.data.expensesTotal, 'MXN') : '...'} />
              <SummaryRow label="Retiros" value={preview.data ? money(preview.data.withdrawalsTotal, 'MXN') : '...'} />
              <SummaryRow label="Prestamos" value={preview.data ? money(preview.data.advancesTotal, 'MXN') : '...'} />
              <SummaryRow label="Cortes" value={String(preview.data?.shiftCloseCount ?? '...')} />
              <SummaryRow label="Inventario" value={String(preview.data?.inventoryMovementCount ?? '...')} />
              <SummaryRow label="Nomina" value={String(preview.data?.payrollPeriodCount ?? '...')} />
            </div>
          </Panel>

          <Panel title="Resumen mensual">
            <div className="space-y-3 text-sm">
              <SummaryRow label="Mes" value={monthly.data ? `${monthly.data.year}-${String(monthly.data.month).padStart(2, '0')}` : '...'} />
              <SummaryRow label="Carros" value={String(monthly.data?.carsWashed ?? '...')} />
              <SummaryRow label="Ingresos" value={monthly.data ? money(monthly.data.ticketRevenue, 'MXN') : '...'} />
              <SummaryRow label="Resultado" value={monthly.data ? money(monthly.data.result, 'MXN') : '...'} />
            </div>
          </Panel>
        </aside>
      </div>

      <Panel title="Historico (Excel 2025 + 2026)">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[180px_180px]">
            <TextField label="Desde">
              <input type="date" value={histFrom} onChange={(e) => setHistFrom(e.target.value)} />
            </TextField>
            <TextField label="Hasta">
              <input type="date" value={histTo} onChange={(e) => setHistTo(e.target.value)} />
            </TextField>
          </div>

          {historical.error && <ErrorMessage message={historical.error.message} />}

          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Dias" value={String(historical.data?.totalDays ?? '...')} />
            <Metric label="Carros" value={String(historical.data?.totalCars ?? '...')} />
            <Metric label="Ingresos" value={historical.data ? money(historical.data.totalRevenue, 'MXN') : '...'} variant="success" />
            <Metric label="Resultado" value={historical.data ? money(historical.data.totalResultado, 'MXN') : '...'} variant="info" />
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Mes</th>
                  <th className="px-4 py-3 text-right">Carros</th>
                  <th className="px-4 py-3 text-right">Ingresos</th>
                  <th className="px-4 py-3 text-right">Gastos</th>
                  <th className="px-4 py-3 text-right">Resultado</th>
                  <th className="px-4 py-3">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groupByMonth(historical.data?.days ?? []).map((row) => (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.month}</td>
                    <td className="px-4 py-3 text-right">{row.cars}</td>
                    <td className="px-4 py-3 text-right">{money(row.revenue, 'MXN')}</td>
                    <td className="px-4 py-3 text-right">{money(row.expenses, 'MXN')}</td>
                    <td className={`px-4 py-3 text-right font-medium ${row.resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(row.resultado, 'MXN')}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {Array.from(row.sources).join(', ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {!historical.isLoading && (historical.data?.days.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin datos historicos en este rango.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </section>
  )
}

function InventoryScreen() {
  const [asOf, setAsOf] = useState('')
  const [modal, setModal] = useState<'product' | 'sale' | 'purchase' | 'adjustment' | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const products = useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => api<Product[]>('/api/v1/products?active=true'),
  })
  const snapshot = useQuery({
    queryKey: ['inventory-snapshot', asOf],
    queryFn: () => api<InventorySnapshot>(`/api/v1/inventory/snapshot${asOf ? `?as_of=${encodeURIComponent(toIsoDateTime(asOf))}` : ''}`),
  })

  const rows = snapshot.data?.products ?? []
  const totalValue = rows.reduce((sum, row) => sum + row.quantityOnHand * row.product.currentUnitPrice, 0)
  const lowCount = rows.filter((row) => row.product.trackInventory && row.quantityOnHand <= 5).length

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Inventario</h2>
          <p className="text-sm text-gray-500">Productos y movimientos. El stock se calcula desde entradas y salidas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98]" onClick={() => setModal('product')}>Nuevo producto</button>
          <button className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98]" onClick={() => setModal('sale')}>Registrar venta</button>
          <button className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98]" onClick={() => setModal('purchase')}>Registrar compra</button>
          <button className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98]" onClick={() => setModal('adjustment')}>Ajuste</button>
        </div>
      </div>

      <Panel title="Corte de inventario">
        <div className="grid gap-3 md:grid-cols-[260px_1fr]">
          <TextField label="Ver hasta">
            <input type="datetime-local" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
          </TextField>
          <div className="flex items-end text-sm text-gray-500">
            Si lo dejas vacio, el snapshot usa la hora actual.
          </div>
        </div>
      </Panel>

      {(products.error || snapshot.error) && <ErrorMessage message={(products.error || snapshot.error)!.message} />}

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Productos activos" value={String(products.data?.length ?? '...')} />
        <Metric label="Valor estimado" value={money(totalValue, 'MXN')} />
        <Metric label="Stock bajo" value={String(lowCount)} />
      </div>

      <Panel title="Productos">
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3">Ultimo movimiento</th>
                <th className="px-4 py-3">Indicador</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const latest = row.recentMovements[0]
                const lowStock = row.product.trackInventory && row.quantityOnHand <= 5
                return (
                  <tr key={row.product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{row.product.name}</td>
                    <td className="px-4 py-3">{row.product.sku || '-'}</td>
                    <td className="px-4 py-3 text-right">{row.quantityOnHand.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{money(row.product.currentUnitPrice, 'MXN')}</td>
                    <td className="px-4 py-3">
                      {latest ? `${movementLabel(latest.movementType)} / ${latest.quantity}` : 'Sin movimientos'}
                    </td>
                    <td className="px-4 py-3">
                      <InventoryStatusPill lowStock={lowStock} tracked={row.product.trackInventory} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                        onClick={() => {
                          setEditingProduct(row.product)
                          setModal('product')
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!snapshot.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    No hay productos todavia. Crea un producto y registra una compra inicial.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {modal === 'product' && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setModal(null)
            setEditingProduct(null)
          }}
        />
      )}
      {modal === 'sale' && <InventorySaleModal products={products.data ?? []} onClose={() => setModal(null)} />}
      {modal === 'purchase' && <InventoryPurchaseModal products={products.data ?? []} onClose={() => setModal(null)} />}
      {modal === 'adjustment' && <InventoryAdjustmentModal products={products.data ?? []} onClose={() => setModal(null)} />}
    </section>
  )
}

function ProductModal({ product, onClose }: { product?: Product | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku,
          currentUnitPrice: product.currentUnitPrice,
          trackInventory: product.trackInventory,
          active: product.active,
        }
      : { name: '', sku: '', currentUnitPrice: 0, trackInventory: true, active: true },
  })
  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => api<Product>(product ? `/api/v1/products/${product.id}` : '/api/v1/products', {
      method: product ? 'PATCH' : 'POST',
      body: JSON.stringify({
        name: values.name.trim(),
        sku: values.sku?.trim() || undefined,
        currentUnitPrice: Number(values.currentUnitPrice),
        trackInventory: values.trackInventory,
        active: values.active,
      }),
    }),
    onSuccess: async () => {
      await invalidateInventory(queryClient)
      onClose()
    },
  })

  return (
    <Modal title={product ? 'Editar producto' : 'Nuevo producto'} onClose={onClose} narrow>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <TextField label="Nombre" error={form.formState.errors.name?.message}>
          <input placeholder="Ej. Armor All" {...form.register('name')} />
        </TextField>
        <TextField label="SKU" error={form.formState.errors.sku?.message}>
          <input placeholder="Opcional" {...form.register('sku')} />
        </TextField>
        <TextField label="Precio actual" error={form.formState.errors.currentUnitPrice?.message}>
          <input type="number" min={0} step="0.01" {...form.register('currentUnitPrice')} />
        </TextField>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" {...form.register('trackInventory')} className="h-4 w-4 rounded border-gray-200 text-sky-600" />
          Controlar inventario
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" {...form.register('active')} className="h-4 w-4 rounded border-gray-200 text-sky-600" />
          Activo
        </label>
        {mutation.error && <ErrorMessage message={mutation.error.message} />}
        <ModalActions onClose={onClose} submitLabel={mutation.isPending ? 'Guardando...' : 'Guardar producto'} />
      </form>
    </Modal>
  )
}

function InventorySaleModal({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm<InventorySaleFormValues>({
    resolver: zodResolver(inventorySaleSchema),
    defaultValues: { productId: 0, quantity: 1, unitPrice: 0, movementDate: '', fiado: false },
  })
  const product = products.find((item) => item.id === Number(form.watch('productId')))
  const mutation = useMutation({
    mutationFn: (values: InventorySaleFormValues) => api<ProductMovement>('/api/v1/inventory/sales', {
      method: 'POST',
      body: JSON.stringify({
        productId: Number(values.productId),
        quantity: Number(values.quantity),
        unitPrice: Number(values.unitPrice || product?.currentUnitPrice || 0),
        movementDate: values.movementDate ? toIsoDateTime(values.movementDate) : undefined,
        fiado: values.fiado,
      }),
    }),
    onSuccess: async () => {
      await invalidateInventory(queryClient)
      onClose()
    },
  })

  return (
    <InventoryMovementModal
      title="Registrar venta"
      products={products}
      form={form}
      mutation={mutation}
      onClose={onClose}
      submitLabel="Guardar venta"
    >
      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" {...form.register('fiado')} className="h-4 w-4 rounded border-gray-200 text-sky-600" />
        Venta fiada
      </label>
    </InventoryMovementModal>
  )
}

function InventoryPurchaseModal({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm<InventoryPurchaseFormValues>({
    resolver: zodResolver(inventoryPurchaseSchema),
    defaultValues: { productId: 0, quantity: 1, unitPrice: 0, movementDate: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: InventoryPurchaseFormValues) => api<ProductMovement>('/api/v1/inventory/purchases', {
      method: 'POST',
      body: JSON.stringify({
        productId: Number(values.productId),
        quantity: Number(values.quantity),
        unitPrice: Number(values.unitPrice || 0),
        movementDate: values.movementDate ? toIsoDateTime(values.movementDate) : undefined,
      }),
    }),
    onSuccess: async () => {
      await invalidateInventory(queryClient)
      onClose()
    },
  })

  return (
    <InventoryMovementModal
      title="Registrar compra"
      products={products}
      form={form}
      mutation={mutation}
      onClose={onClose}
      submitLabel="Guardar compra"
    />
  )
}

function InventoryAdjustmentModal({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm<InventoryAdjustmentFormValues>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues: { productId: 0, quantity: 0, reason: '', movementDate: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: InventoryAdjustmentFormValues) => api<ProductMovement>('/api/v1/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify({
        productId: Number(values.productId),
        quantity: Number(values.quantity),
        reason: values.reason.trim(),
        movementDate: values.movementDate ? toIsoDateTime(values.movementDate) : undefined,
      }),
    }),
    onSuccess: async () => {
      await invalidateInventory(queryClient)
      onClose()
    },
  })

  return (
    <Modal title="Ajuste de inventario" onClose={onClose} narrow>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <ProductSelect products={products} form={form} />
        <TextField label="Cantidad (+ entra, - sale)" error={form.formState.errors.quantity?.message}>
          <input type="number" step="0.01" {...form.register('quantity')} />
        </TextField>
        <TextField label="Fecha y hora">
          <input type="datetime-local" {...form.register('movementDate')} />
        </TextField>
        <TextField label="Motivo" error={form.formState.errors.reason?.message}>
          <textarea rows={3} placeholder="Ej. Conteo fisico, merma, correccion" {...form.register('reason')} />
        </TextField>
        {mutation.error && <ErrorMessage message={mutation.error.message} />}
        <ModalActions onClose={onClose} submitLabel={mutation.isPending ? 'Guardando...' : 'Guardar ajuste'} />
      </form>
    </Modal>
  )
}

function InventoryMovementModal<T extends InventorySaleFormValues | InventoryPurchaseFormValues>({
  title,
  products,
  form,
  mutation,
  onClose,
  submitLabel,
  children,
}: {
  title: string
  products: Product[]
  form: UseFormReturn<T>
  mutation: UseMutationResult<ProductMovement, Error, T>
  onClose: () => void
  submitLabel: string
  children?: React.ReactNode
}) {
  return (
    <Modal title={title} onClose={onClose} narrow>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <ProductSelect products={products} form={form} />
        <TextField label="Cantidad" error={form.formState.errors.quantity?.message}>
          <input type="number" min={0} step="0.01" {...form.register('quantity')} />
        </TextField>
        <TextField label="Precio unitario" error={form.formState.errors.unitPrice?.message}>
          <input type="number" min={0} step="0.01" placeholder="0 usa precio del producto en venta" {...form.register('unitPrice')} />
        </TextField>
        <TextField label="Fecha y hora">
          <input type="datetime-local" {...form.register('movementDate')} />
        </TextField>
        {children}
        {mutation.error && <ErrorMessage message={mutation.error.message} />}
        <ModalActions onClose={onClose} submitLabel={mutation.isPending ? 'Guardando...' : submitLabel} />
      </form>
    </Modal>
  )
}

function ProductSelect({ products, form }: { products: Product[]; form: UseFormReturn<any> }) {
  return (
    <SelectField label="Producto" error={form.formState.errors.productId?.message as string | undefined}>
      <select {...form.register('productId')}>
        <option value={0}>Selecciona producto</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>{product.name}</option>
        ))}
      </select>
    </SelectField>
  )
}

function InventoryStatusPill({ lowStock, tracked }: { lowStock: boolean; tracked: boolean }) {
  if (!tracked) {
    return <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-500">Sin control</span>
  }
  if (lowStock) {
    return <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Stock bajo</span>
  }
  return <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">OK</span>
}

function PayrollScreen() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<PayrollPeriodStatus | ''>('')
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const form = useForm<PayrollPeriodFormValues>({
    resolver: zodResolver(payrollPeriodSchema),
    defaultValues: { startDate: previousSunday(today) },
  })

  const periods = useQuery({
    queryKey: ['payroll-periods', status],
    queryFn: () => api<PayrollPeriod[]>(`/api/v1/payroll/periods${status ? `?status=${status}` : ''}`),
  })
  const selectedId = selectedPeriodId ?? periods.data?.[0]?.id ?? null
  const period = useQuery({
    queryKey: ['payroll-period', selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => api<PayrollPeriod>(`/api/v1/payroll/periods/${selectedId}`),
  })
  const selectedPeriod = period.data
  const selectedEntry = selectedEmployeeId
    ? selectedPeriod?.entries.find((entry) => entry.employeeId === selectedEmployeeId)
    : selectedPeriod?.entries[0]
  const debt = useQuery({
    queryKey: ['debt-balance', selectedEntry?.employeeId],
    enabled: Boolean(selectedEntry?.employeeId),
    queryFn: () => api<DebtBalance>(`/api/v1/payroll/employees/${selectedEntry!.employeeId}/debt-balance`),
  })

  const createPeriod = useMutation({
    mutationFn: (values: PayrollPeriodFormValues) => api<PayrollPeriod>('/api/v1/payroll/periods', {
      method: 'POST',
      body: JSON.stringify(values),
    }),
    onSuccess: async (created) => {
      setSelectedPeriodId(created.id)
      await queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
      setToast('Periodo creado')
    },
  })
  const compute = useMutation({
    mutationFn: () => api<PayrollPeriod>(`/api/v1/payroll/periods/${selectedId}/compute`, { method: 'POST' }),
    onSuccess: async () => {
      await invalidatePayroll(queryClient)
      setToast('Nomina calculada')
    },
  })
  const lock = useMutation({
    mutationFn: () => api<PayrollPeriod>(`/api/v1/payroll/periods/${selectedId}/lock`, { method: 'POST' }),
    onSuccess: async () => {
      await invalidatePayroll(queryClient)
      setToast('Nomina bloqueada')
    },
  })

  const totals = {
    cars: (selectedPeriod?.entries ?? []).reduce((sum, entry) => sum + entry.carsWashed, 0),
    net: (selectedPeriod?.entries ?? []).reduce((sum, entry) => sum + entry.netPay, 0),
    advances: (selectedPeriod?.entries ?? []).reduce((sum, entry) => sum + entry.advancesDeducted, 0),
  }

  return (
    <section className="space-y-5">
      {toast && <Toast message={toast} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Nomina</h2>
          <p className="text-sm text-gray-500">Calculo semanal de lavadores, bonos por carros y prestamos.</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" onSubmit={form.handleSubmit((values) => createPeriod.mutate(values))}>
          <TextField label="Domingo" error={form.formState.errors.startDate?.message}>
            <input type="date" {...form.register('startDate')} />
          </TextField>
          <button className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98]">
            Crear periodo
          </button>
        </form>
      </div>
      {createPeriod.error && <ErrorMessage message={createPeriod.error.message} />}

      <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
        <Panel title="Periodos">
          <SelectField label="Estado">
            <select value={status} onChange={(event) => setStatus(event.target.value as PayrollPeriodStatus | '')}>
              <option value="">Todos</option>
              <option value="OPEN">Abiertos</option>
              <option value="COMPUTED">Calculados</option>
              <option value="LOCKED">Bloqueados</option>
            </select>
          </SelectField>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
            {(periods.data ?? []).map((item) => (
              <button
                key={item.id}
                className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm hover:bg-gray-50 ${
                  selectedId === item.id ? 'bg-blue-50 text-blue-800' : ''
                }`}
                onClick={() => {
                  setSelectedPeriodId(item.id)
                  setSelectedEmployeeId(null)
                }}
              >
                <span>
                  <strong className="block">{item.startDate}</strong>
                  <span className="text-gray-400">al {item.endDate}</span>
                </span>
                <PayrollStatusPill status={item.status} />
              </button>
            ))}
            {!periods.isLoading && (periods.data ?? []).length === 0 && (
              <p className="p-4 text-sm text-gray-400">No hay periodos de nomina.</p>
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Resumen semanal">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-400">Periodo</p>
                <p className="font-semibold">{selectedPeriod ? `${selectedPeriod.startDate} al ${selectedPeriod.endDate}` : 'Sin seleccionar'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!selectedId || selectedPeriod?.status === 'LOCKED' || compute.isPending}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
                  onClick={() => compute.mutate()}
                >
                  Recalcular
                </button>
                <button
                  disabled={!selectedId || selectedPeriod?.status !== 'COMPUTED' || lock.isPending}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:text-gray-400"
                  onClick={() => {
                    if (window.confirm('Bloquear nomina? Ya no se podra recalcular en v1.')) {
                      lock.mutate()
                    }
                  }}
                >
                  Bloquear
                </button>
              </div>
            </div>
            {(compute.error || lock.error) && <ErrorMessage message={(compute.error || lock.error)!.message} />}
            <div className="grid gap-4 md:grid-cols-4">
              <Metric label="Lavadores" value={String(selectedPeriod?.entries.length ?? 0)} />
              <Metric label="Carros" value={totals.cars.toFixed(2)} />
              <Metric label="Prestamos descontados" value={money(totals.advances, 'MXN')} />
              <Metric label="Neto a pagar" value={money(totals.net, 'MXN')} />
            </div>
          </Panel>

          <Panel title="Grid semanal">
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Lavador</th>
                    <th className="px-4 py-3 text-right">Carros</th>
                    <th className="px-4 py-3 text-right">Base</th>
                    <th className="px-4 py-3 text-right">Bono carros</th>
                    <th className="px-4 py-3 text-right">Prestamos</th>
                    <th className="px-4 py-3 text-right">Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(selectedPeriod?.entries ?? []).map((entry) => (
                    <tr
                      key={entry.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedEmployeeId(entry.employeeId)}
                    >
                      <td className="px-4 py-3 font-semibold">{entry.employeeName}</td>
                      <td className="px-4 py-3 text-right">{entry.carsWashed.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{money(entry.baseSalary, 'MXN')}</td>
                      <td className="px-4 py-3 text-right">{money(entry.carsBonus, 'MXN')}</td>
                      <td className="px-4 py-3 text-right">{money(entry.advancesDeducted, 'MXN')}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(entry.netPay, 'MXN')}</td>
                    </tr>
                  ))}
                  {!period.isLoading && (selectedPeriod?.entries.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        Crea o selecciona un periodo y presiona Recalcular.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Detalle de lavador">
            {selectedEntry ? (
              <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                <div className="space-y-3 text-sm">
                  <SummaryRow label="Lavador" value={selectedEntry.employeeName} />
                  <SummaryRow label="Carros" value={selectedEntry.carsWashed.toFixed(2)} />
                  <SummaryRow label="Bono por carro" value={money(selectedEntry.carsBonusRate, 'MXN')} />
                  <SummaryRow label="Neto" value={money(selectedEntry.netPay, 'MXN')} />
                  <SummaryRow label="Saldo deuda" value={debt.data ? money(debt.data.balance, 'MXN') : '...'} />
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="px-4 py-3">Dia</th>
                        <th className="px-4 py-3 text-right">Carros</th>
                        <th className="px-4 py-3 text-right">Revenue ref.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(selectedPeriod?.days ?? []).filter((day) => day.employeeId === selectedEntry.employeeId).map((day) => (
                        <tr key={day.id}>
                          <td className="px-4 py-3">{day.workDate}</td>
                          <td className="px-4 py-3 text-right">{day.carsWashed.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">{money(day.ticketRevenue, 'MXN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Selecciona una fila para ver detalle y saldo de deuda.</p>
            )}
          </Panel>
        </div>
      </div>
    </section>
  )
}

function PayrollStatusPill({ status }: { status: PayrollPeriodStatus }) {
  const styles: Record<PayrollPeriodStatus, string> = {
    OPEN: 'bg-gray-100 text-gray-700',
    COMPUTED: 'bg-blue-50 text-blue-700',
    LOCKED: 'bg-emerald-50 text-emerald-700',
  }
  const labels: Record<PayrollPeriodStatus, string> = {
    OPEN: 'Abierto',
    COMPUTED: 'Calculado',
    LOCKED: 'Bloqueado',
  }
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>
}

function previousSunday(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`)
  const day = date.getDay()
  date.setDate(date.getDate() - day)
  return date.toISOString().slice(0, 10)
}

async function invalidatePayroll(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['payroll-periods'] }),
    queryClient.invalidateQueries({ queryKey: ['payroll-period'] }),
    queryClient.invalidateQueries({ queryKey: ['debt-balance'] }),
  ])
}

function CashInput({
  label,
  name,
  form,
}: {
  label: string
  name: keyof CashCountFormValues
  form: UseFormReturn<CashCountFormValues>
}) {
  return (
    <TextField label={label}>
      <input type="number" min={0} step={1} {...form.register(name)} />
    </TextField>
  )
}

function calculateCashCount(values: CashCountFormValues) {
  return (
    Number(values.bills1000 || 0) * 1000 +
    Number(values.bills500 || 0) * 500 +
    Number(values.bills200 || 0) * 200 +
    Number(values.bills100 || 0) * 100 +
    Number(values.bills50 || 0) * 50 +
    Number(values.bills20 || 0) * 20 +
    Number(values.coins10 || 0) * 10 +
    Number(values.coins5 || 0) * 5 +
    Number(values.coins2 || 0) * 2 +
    Number(values.coins1 || 0) +
    Number(values.coins05 || 0) * 0.5 +
    Number(values.morrallaTotal || 0)
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
          <p className="text-sm text-gray-500">Busqueda y revision de tickets capturados.</p>
        </div>
        <NavLink to="/tickets/nuevo" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98]">
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

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3">Nota</th>
              <th className="px-4 py-3">Vehiculo</th>
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Lavadores</th>
              <th className="px-4 py-3 text-right">Importe</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{ticket.notaNumber}</td>
                <td className="px-4 py-3">{ticket.vehicleDescription || '-'}</td>
                <td className="px-4 py-3">{ticket.serviceTypeName} / {ticket.vehicleSizeName}</td>
                <td className="px-4 py-3">{ticket.assignments.map((a) => a.employeeName).join(', ')}</td>
                <td className="px-4 py-3 text-right">{money(ticket.priceAmount, ticket.currency)}</td>
                <td className="px-4 py-3">
                  {!ticket.courtesy && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ticket.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {ticket.paymentMethod === 'CARD' ? 'Tarjeta' : 'Efectivo'}
                    </span>
                  )}
                </td>
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
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">No hay tickets para estos filtros.</td>
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
        <p className="text-sm text-gray-500">El ticket queda guardado como cancelado y no cuenta para ingresos.</p>
        <TextField label="Motivo" error={form.formState.errors.reason?.message}>
          <textarea rows={4} placeholder="Ej. Capturado por error" {...form.register('reason')} />
        </TextField>
        {mutation.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{mutation.error.message}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98]" onClick={onClose}>Volver</button>
          <button type="submit" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-red-700 active:scale-[0.98]">
            Confirmar cancelacion
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ExpenseModal({ data, onClose }: { data: ReturnType<typeof usePhaseData>; onClose: () => void }) {
  const queryClient = useQueryClient()
  const openShift = (data.shifts.data ?? []).find((shift) => shift.status === 'OPEN')
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { expenseDate: today, category: 'MATERIAL', amount: 0, description: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: ExpenseFormValues) => api<Expense>('/api/v1/expenses', {
      method: 'POST',
      body: JSON.stringify({
        businessDayId: data.currentBusinessDay?.id,
        shiftId: openShift?.id,
        expenseDate: values.expenseDate,
        category: values.category,
        amount: Number(values.amount),
        description: values.description || undefined,
      }),
    }),
    onSuccess: async () => {
      await invalidateMoney(queryClient)
      onClose()
    },
  })

  return (
    <Modal title="Nuevo gasto" onClose={onClose} narrow>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <TextField label="Fecha" error={form.formState.errors.expenseDate?.message}>
          <input type="date" {...form.register('expenseDate')} />
        </TextField>
        <SelectField label="Categoria" error={form.formState.errors.category?.message}>
          <select {...form.register('category')}>
            {expenseCategories.map((item) => (
              <option key={item} value={item}>{categoryLabel(item)}</option>
            ))}
          </select>
        </SelectField>
        <TextField label="Monto" error={form.formState.errors.amount?.message}>
          <input type="number" min={0} step="0.01" {...form.register('amount')} />
        </TextField>
        <TextField label="Descripcion" error={form.formState.errors.description?.message}>
          <textarea rows={3} placeholder="Ej. Material de limpieza" {...form.register('description')} />
        </TextField>
        {mutation.error && <ErrorMessage message={mutation.error.message} />}
        <ModalActions onClose={onClose} submitLabel={mutation.isPending ? 'Guardando...' : 'Guardar gasto'} />
      </form>
    </Modal>
  )
}

function WithdrawalModal({ data, onClose }: { data: ReturnType<typeof usePhaseData>; onClose: () => void }) {
  const queryClient = useQueryClient()
  const openShift = (data.shifts.data ?? []).find((shift) => shift.status === 'OPEN')
  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: { withdrawalDate: today, amount: 0, reason: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: WithdrawalFormValues) => api<Withdrawal>('/api/v1/withdrawals', {
      method: 'POST',
      body: JSON.stringify({
        businessDayId: data.currentBusinessDay?.id,
        shiftId: openShift?.id,
        withdrawalDate: values.withdrawalDate,
        amount: Number(values.amount),
        reason: values.reason || undefined,
      }),
    }),
    onSuccess: async () => {
      await invalidateMoney(queryClient)
      onClose()
    },
  })

  return (
    <Modal title="Nuevo retiro" onClose={onClose} narrow>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <TextField label="Fecha" error={form.formState.errors.withdrawalDate?.message}>
          <input type="date" {...form.register('withdrawalDate')} />
        </TextField>
        <TextField label="Monto" error={form.formState.errors.amount?.message}>
          <input type="number" min={0} step="0.01" {...form.register('amount')} />
        </TextField>
        <TextField label="Motivo" error={form.formState.errors.reason?.message}>
          <textarea rows={3} placeholder="Ej. Retiro del dueno" {...form.register('reason')} />
        </TextField>
        {mutation.error && <ErrorMessage message={mutation.error.message} />}
        <ModalActions onClose={onClose} submitLabel={mutation.isPending ? 'Guardando...' : 'Guardar retiro'} />
      </form>
    </Modal>
  )
}

function AdvanceModal({ data, onClose }: { data: ReturnType<typeof usePhaseData>; onClose: () => void }) {
  const queryClient = useQueryClient()
  const openShift = (data.shifts.data ?? []).find((shift) => shift.status === 'OPEN')
  const form = useForm<AdvanceFormValues>({
    resolver: zodResolver(advanceSchema),
    defaultValues: { advanceDate: today, employeeId: 0, amount: 0, reason: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: AdvanceFormValues) => api<EmployeeAdvance>('/api/v1/employee-advances', {
      method: 'POST',
      body: JSON.stringify({
        businessDayId: data.currentBusinessDay?.id,
        shiftId: openShift?.id,
        employeeId: Number(values.employeeId),
        advanceDate: values.advanceDate,
        amount: Number(values.amount),
        reason: values.reason || undefined,
      }),
    }),
    onSuccess: async () => {
      await invalidateMoney(queryClient)
      onClose()
    },
  })

  return (
    <Modal title="Nuevo prestamo" onClose={onClose} narrow>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <TextField label="Fecha" error={form.formState.errors.advanceDate?.message}>
          <input type="date" {...form.register('advanceDate')} />
        </TextField>
        <SelectField label="Lavador" error={form.formState.errors.employeeId?.message}>
          <select {...form.register('employeeId')}>
            <option value={0}>Selecciona lavador</option>
            {(data.employees.data ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.fullName}</option>
            ))}
          </select>
        </SelectField>
        <TextField label="Monto" error={form.formState.errors.amount?.message}>
          <input type="number" min={0} step="0.01" {...form.register('amount')} />
        </TextField>
        <TextField label="Motivo" error={form.formState.errors.reason?.message}>
          <textarea rows={3} placeholder="Ej. Adelanto semanal" {...form.register('reason')} />
        </TextField>
        {mutation.error && <ErrorMessage message={mutation.error.message} />}
        <ModalActions onClose={onClose} submitLabel={mutation.isPending ? 'Guardando...' : 'Guardar prestamo'} />
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
        className="w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
      >
        {loading ? 'Guardando...' : label}
      </button>
    </div>
  )
}

function AiInsightsPanel({
  date,
  brief,
  insights,
  loading,
  error,
  onRunAlerts,
  runningAlerts,
}: {
  date: string
  brief?: AiInsight
  insights: AiInsight[]
  loading: boolean
  error?: string
  onRunAlerts: () => void
  runningAlerts: boolean
}) {
  const alerts = insights.filter((insight) => insight.featureType === 'ANOMALY_ALERT')
  const otherInsights = insights.filter((insight) => insight.featureType !== 'ANOMALY_ALERT' && insight.id !== brief?.id)

  return (
    <Panel title="AI Insights">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Resumen del dueno para {date}</p>
          <p className="text-sm text-gray-500">Brief diario, alertas y pendientes generados desde reportes reales.</p>
        </div>
        <button
          type="button"
          onClick={onRunAlerts}
          disabled={runningAlerts}
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition-all hover:bg-sky-100 active:scale-[0.98] disabled:opacity-60"
        >
          {runningAlerts ? 'Revisando...' : 'Correr watchdog'}
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
      {loading && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400">Cargando insights...</p>}
      {brief && <AiInsightCard insight={brief} compact={false} />}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Alertas nuevas</p>
          {alerts.map((insight) => <AiInsightCard key={insight.id} insight={insight} compact />)}
        </div>
      )}
      {!loading && !brief && alerts.length === 0 && (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400">Sin insights nuevos para esta fecha.</p>
      )}
      {otherInsights.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Otros pendientes</p>
          {otherInsights.slice(0, 3).map((insight) => <AiInsightCard key={insight.id} insight={insight} compact />)}
        </div>
      )}
    </Panel>
  )
}

function AiAnalystSection({ from, to }: { from: string; to: string }) {
  const queryClient = useQueryClient()
  const chatForm = useForm<AnalystChatFormValues>({
    resolver: zodResolver(analystChatSchema),
    defaultValues: { message: '' },
  })
  const investigationForm = useForm<InvestigationFormValues>({
    resolver: zodResolver(investigationSchema),
    defaultValues: { question: '' },
  })
  const chat = useMutation({
    mutationFn: (values: AnalystChatFormValues) => api<AnalystChatResponse>('/api/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: values.message, from, to }),
    }),
    onSuccess: async () => {
      await invalidateAi(queryClient)
    },
  })
  const investigation = useMutation({
    mutationFn: (values: InvestigationFormValues) => api<InvestigationResponse>('/api/v1/ai/investigations', {
      method: 'POST',
      body: JSON.stringify({ question: values.question, from, to }),
    }),
    onSuccess: async () => {
      await invalidateAi(queryClient)
    },
  })
  const history = useQuery({
    queryKey: ['ai-insights', 'reports', from, to],
    queryFn: () => api<AiInsight[]>(`/api/v1/ai/insights?from=${from}&to=${to}`),
  })
  const aiRows = history.data ?? []

  return (
    <Panel title="AI Analyst">
      <div className="grid gap-5 xl:grid-cols-2">
        <form className="space-y-4" onSubmit={chatForm.handleSubmit((values) => chat.mutate(values))}>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Chat de negocio</h4>
            <p className="text-sm text-gray-500">Pregunta sobre ventas, lavadores, cortes o comparativos del rango actual.</p>
          </div>
          <TextField label="Pregunta" error={chatForm.formState.errors.message?.message}>
            <textarea rows={4} placeholder="Ej. Por que esta semana estuvo mas baja?" {...chatForm.register('message')} />
          </TextField>
          {chat.error && <ErrorMessage message={chat.error.message} />}
          <button
            type="submit"
            disabled={chat.isPending}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-slate-800 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
          >
            {chat.isPending ? 'Analizando...' : 'Preguntar'}
          </button>
          {chat.data && (
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
              <p className="text-sm font-semibold text-sky-950">{chat.data.answer}</p>
              <AiEvidenceList title="Numeros usados" rows={chat.data.supportingNumbers} />
              <div className="mt-3 flex flex-wrap gap-2">
                {chat.data.suggestedFollowUps.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => chatForm.setValue('message', question)}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100 hover:bg-sky-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        <form className="space-y-4" onSubmit={investigationForm.handleSubmit((values) => investigation.mutate(values))}>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Investigacion con agente</h4>
            <p className="text-sm text-gray-500">Ejecuta pasos trazables con resumen diario, historial, caja, lavadores e inventario.</p>
          </div>
          <TextField label="Pregunta a investigar" error={investigationForm.formState.errors.question?.message}>
            <textarea rows={4} placeholder="Ej. Que explica la diferencia de efectivo de este rango?" {...investigationForm.register('question')} />
          </TextField>
          {investigation.error && <ErrorMessage message={investigation.error.message} />}
          <button
            type="submit"
            disabled={investigation.isPending}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
          >
            {investigation.isPending ? 'Investigando...' : 'Investigar'}
          </button>
          {investigation.data && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-emerald-950">{investigation.data.conclusion}</p>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  Confianza {confidenceLabel(investigation.data.confidence)}
                </span>
              </div>
              <AiEvidenceList title="Evidencia" rows={investigation.data.evidence} />
              <AiEvidenceList title="Pasos" rows={investigation.data.steps} ordered />
            </div>
          )}
        </form>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Historial del rango</p>
          <span className="text-xs text-gray-400">{from} a {to}</span>
        </div>
        {history.error && <ErrorMessage message={history.error.message} />}
        {history.isLoading && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400">Cargando historial...</p>}
        {!history.isLoading && aiRows.length === 0 && (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400">Sin historial de AI para este rango.</p>
        )}
        {aiRows.slice(0, 5).map((insight) => <AiInsightCard key={insight.id} insight={insight} compact />)}
      </div>
    </Panel>
  )
}

function AiInsightCard({ insight, compact }: { insight: AiInsight; compact: boolean }) {
  const queryClient = useQueryClient()
  const acknowledge = useMutation({
    mutationFn: () => api<AiInsight>(`/api/v1/ai/insights/${insight.id}/acknowledge`, { method: 'POST' }),
    onSuccess: async () => {
      await invalidateAi(queryClient)
    },
  })
  const dismiss = useMutation({
    mutationFn: () => api<AiInsight>(`/api/v1/ai/insights/${insight.id}/dismiss`, { method: 'POST' }),
    onSuccess: async () => {
      await invalidateAi(queryClient)
    },
  })

  return (
    <article className={`rounded-xl border p-4 ${aiSeverityClass(insight.severity)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold ring-1 ring-black/5">
              {featureLabel(insight.featureType)}
            </span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold ring-1 ring-black/5">
              {severityLabel(insight.severity)}
            </span>
            <span className="text-xs text-gray-500">{insight.sourceFrom} a {insight.sourceTo}</span>
          </div>
          <h4 className="mt-2 text-sm font-bold text-gray-950">{insight.title}</h4>
          <p className={`mt-1 text-sm text-gray-700 ${compact ? 'line-clamp-3' : ''}`}>{insight.summary}</p>
          {!compact && <AiDetailRows details={insight.details} />}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {insight.status === 'NEW' ? (
            <>
              <button
                type="button"
                onClick={() => acknowledge.mutate()}
                disabled={acknowledge.isPending || dismiss.isPending}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Revisado
              </button>
              <button
                type="button"
                onClick={() => dismiss.mutate()}
                disabled={acknowledge.isPending || dismiss.isPending}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
              >
                Descartar
              </button>
            </>
          ) : (
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-500 ring-1 ring-gray-100">
              {statusLabel(insight.status)}
            </span>
          )}
        </div>
      </div>
      {(acknowledge.error || dismiss.error) && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{(acknowledge.error || dismiss.error)!.message}</p>
      )}
    </article>
  )
}

function AiEvidenceList({ title, rows, ordered = false }: { title: string; rows: string[]; ordered?: boolean }) {
  if (rows.length === 0) return null
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <Tag className={`mt-1 space-y-1 text-sm text-gray-700 ${ordered ? 'list-decimal pl-5' : 'list-disc pl-5'}`}>
        {rows.map((row) => <li key={row}>{row}</li>)}
      </Tag>
    </div>
  )
}

function AiDetailRows({ details }: { details: Record<string, unknown> | null }) {
  if (!details) return null
  const rows = Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined)
    .slice(0, 8)
  if (rows.length === 0) return null

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {rows.map(([key, value]) => (
        <div key={key} className="rounded-lg bg-white/70 px-3 py-2 text-xs ring-1 ring-black/5">
          <span className="block font-semibold uppercase tracking-wide text-gray-400">{key}</span>
          <span className="mt-1 block break-words text-gray-700">{formatAiDetailValue(value)}</span>
        </div>
      ))}
    </div>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{message}</p>
}

function MoneyTable({
  title,
  rows,
  empty,
}: {
  title: string
  rows: { id: number; date: string; concept: string; detail: string; amount: number }[]
  empty: string
}) {
  return (
    <Panel title={title}>
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Detalle</th>
              <th className="px-4 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{row.date}</td>
                <td className="px-4 py-3 font-semibold">{row.concept}</td>
                <td className="px-4 py-3">{row.detail}</td>
                <td className="px-4 py-3 text-right">{money(row.amount, 'MXN')}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function ModalActions({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98]" onClick={onClose}>Volver</button>
      <button type="submit" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-sky-700 active:scale-[0.98]">
        {submitLabel}
      </button>
    </div>
  )
}

function categoryLabel(category: ExpenseCategory) {
  const labels: Record<ExpenseCategory, string> = {
    CFE: 'CFE',
    TELMEX: 'TELMEX',
    BASURA: 'Basura',
    NOMINA: 'Nomina',
    MATERIAL: 'Material',
    GARRAFON_DE_AGUA: 'Garrafon de agua',
    TAXI: 'Taxi',
    COMISION_DEPOSITO: 'Comision deposito',
    OTHER: 'Otro',
  }
  return labels[category]
}

function movementLabel(type: MovementType) {
  const labels: Record<MovementType, string> = {
    SALE: 'Venta',
    FIADO: 'Fiado',
    PURCHASE: 'Compra',
    ADJUSTMENT: 'Ajuste',
    OPENING_COUNT: 'Conteo apertura',
    CLOSING_COUNT: 'Conteo cierre',
  }
  return labels[type]
}

function toIsoDateTime(value: string) {
  if (!value) return value
  return new Date(value).toISOString()
}

async function invalidateMoney(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['expenses'] }),
    queryClient.invalidateQueries({ queryKey: ['withdrawals'] }),
    queryClient.invalidateQueries({ queryKey: ['employee-advances'] }),
    queryClient.invalidateQueries({ queryKey: ['daily-summary'] }),
  ])
}

async function invalidateInventory(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['products'] }),
    queryClient.invalidateQueries({ queryKey: ['inventory-snapshot'] }),
  ])
}

function SimpleList({ rows, empty }: { rows: { id: number; title: string; detail: string }[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400">{empty}</p>
  }

  return (
    <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
          <span className="font-medium">{row.title}</span>
          <span className="text-right text-gray-400">{row.detail}</span>
        </div>
      ))}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-gray-100">
      <h3 className="mb-5 border-b border-gray-100 pb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function SelectField({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  )
}

function TextField({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2">
      <span className="text-gray-400">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

async function invalidateAi(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['ai-insights'] }),
    queryClient.invalidateQueries({ queryKey: ['ai-daily-brief'] }),
  ])
}

function featureLabel(feature: AiFeatureType) {
  const labels: Record<AiFeatureType, string> = {
    DAILY_BRIEF: 'Brief diario',
    ANOMALY_ALERT: 'Alerta',
    MONTHLY_ADVISOR: 'Consejo mensual',
    ANALYST_CHAT: 'Chat',
    AGENT_INVESTIGATION: 'Investigacion',
  }
  return labels[feature]
}

function severityLabel(severity: AiSeverity) {
  const labels: Record<AiSeverity, string> = {
    INFO: 'Info',
    WARNING: 'Atencion',
    CRITICAL: 'Critico',
  }
  return labels[severity]
}

function statusLabel(status: AiInsightStatus) {
  const labels: Record<AiInsightStatus, string> = {
    NEW: 'Nuevo',
    ACKNOWLEDGED: 'Revisado',
    DISMISSED: 'Descartado',
  }
  return labels[status]
}

function confidenceLabel(confidence: InvestigationConfidence) {
  const labels: Record<InvestigationConfidence, string> = {
    LOW: 'baja',
    MEDIUM: 'media',
    HIGH: 'alta',
  }
  return labels[confidence]
}

function aiSeverityClass(severity: AiSeverity) {
  const classes: Record<AiSeverity, string> = {
    INFO: 'border-sky-100 bg-sky-50',
    WARNING: 'border-amber-100 bg-amber-50',
    CRITICAL: 'border-red-100 bg-red-50',
  }
  return classes[severity]
}

function formatAiDetailValue(value: unknown): string {
  if (typeof value === 'number') return Number(value).toLocaleString('es-MX', { maximumFractionDigits: 2 })
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 'Si' : 'No'
  if (Array.isArray(value)) return value.map(formatAiDetailValue).join(', ')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value ?? '')
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
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm">
      <div className={`rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 ${narrow ? 'w-full max-w-lg' : 'w-full max-w-6xl'}`}>
        <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-100 bg-slate-50 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button className="rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" onClick={onClose}>Cerrar</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed right-5 top-5 z-50 flex items-center gap-2.5 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10">
      <svg className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
      {message}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
