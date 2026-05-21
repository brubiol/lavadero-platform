import { createContext, useContext, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Frame, MobileNav, MobileTopbar, Sidebar, Topbar, type NavRole } from './components/layout'
import {
  Avatars,
  Banner,
  Button,
  EcoBadge,
  Field,
  Metric,
  PageHead,
  Panel,
  Pill,
  Plate,
  Sparkline,
  StatusPill,
  SummaryRow,
  type MetricVariant,
  type Tone as PillTone,
} from './components/ui'

type Currency = 'MXN' | 'USD'
type PaymentMethod = 'CASH' | 'CARD'
type TicketStatus = 'ACTIVE' | 'VOIDED'
type AuthRole = 'OPERADOR' | 'GERENTE' | 'DUENO'
type PayrollType = 'SALARY' | 'COMMISSION'

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
  payrollType: PayrollType
  commissionRate: number
  productivityBonusRate: number
  deactivationReason?: string | null
  primaryShift?: string | null
  outOfShiftCommissionRate: number
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
  discountPercent: number
  originalPriceAmount?: number | null
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
  occurredAt?: string | null
  internalRef?: string | null
  priceOverride?: number | null
  notes?: string | null
}

type AttendanceRecord = {
  id: number
  employeeId: number
  employeeName: string
  workDate: string
  clockIn?: string | null
  clockOut?: string | null
  absence: boolean
  note?: string | null
  createdAt: string
  updatedAt: string
}

type DailySummary = {
  date: string
  carsWashed: number
  ticketRevenue: number
  cashRevenue: number
  cardRevenue: number
  inventorySalesRevenue: number
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
type PayrollAdjustmentType = 'EARNING' | 'DEDUCTION'

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
  manualEarnings: number
  manualDeductions: number
  advancesDeducted: number
  grossPay: number
  netPay: number
}

type PayrollAdjustment = {
  id: number
  payrollPeriodId: number
  employeeId: number
  employeeName: string
  type: PayrollAdjustmentType
  amount: number
  concept: string
  note?: string | null
  createdAt: string
  updatedAt: string
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
  adjustments: PayrollAdjustment[]
}

type DebtBalance = {
  employeeId: number
  balance: number
}

type AuditEvent = {
  id: number
  occurredAt: string
  actorUsername: string
  action: string
  entityType: string
  entityId?: number | null
  reason?: string | null
  details?: string | null
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
  employeeId?: number | null
  employeeName?: string | null
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
  paymentMethod: z.enum(['CASH', 'CARD']).default('CASH'),
  vehicleDescription: z.string().max(160, 'Maximo 160 caracteres').optional(),
  notes: z.string().max(500, 'Maximo 500 caracteres').optional(),
  courtesy: z.boolean().default(false),
  courtesyReason: z.string().max(500, 'Maximo 500 caracteres').optional(),
  discountPercent: z.coerce.number().min(0, 'Minimo 0').max(100, 'Maximo 100').default(0),
  employeeIds: z.array(z.coerce.number()).min(1, 'Selecciona al menos un lavador'),
  occurredAt: z.string().optional(),
  internalRef: z.string().max(40, 'Maximo 40 caracteres').optional(),
  priceOverride: z.coerce.number().min(0.01, 'Minimo $0.01').optional().or(z.literal('')),
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
  payrollType: z.enum(['SALARY', 'COMMISSION']),
  commissionRate: z.coerce.number().min(0, 'Minimo 0'),
  productivityBonusRate: z.coerce.number().min(0, 'Minimo 0'),
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

const payrollAdjustmentSchema = z.object({
  employeeId: z.coerce.number().positive('Selecciona lavador'),
  type: z.enum(['EARNING', 'DEDUCTION']),
  amount: z.coerce.number().positive('El monto debe ser mayor que 0'),
  concept: z.string().min(1, 'Selecciona concepto').max(80, 'Maximo 80 caracteres'),
  note: z.string().max(500, 'Maximo 500 caracteres').optional(),
})

type PayrollAdjustmentFormValues = z.infer<typeof payrollAdjustmentSchema>

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
  employeeId: z.coerce.number().optional(),
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
      throw new Error('Sesion expirada. Por favor vuelve a iniciar sesion.')
    }
  }
  if (!response.ok) {
    if (response.status === 401) {
      writeStoredAuth(null)
      throw new Error('Sesion expirada. Por favor vuelve a iniciar sesion.')
    }
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
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

const ROUTE_META: Record<string, { title: string; section: string }> = {
  '/':              { title: 'Dashboard',     section: 'Operación' },
  '/tickets/nuevo': { title: 'Nuevo ticket',  section: 'Operación' },
  '/tickets':       { title: 'Tickets',       section: 'Operación' },
  '/gastos':        { title: 'Gastos',        section: 'Operación' },
  '/cierre-dia':    { title: 'Cierre del día',section: 'Operación' },
  '/corte':         { title: 'Corte',         section: 'Operación' },
  '/nomina':        { title: 'Nómina',        section: 'Gestión'   },
  '/inventario':    { title: 'Inventario',    section: 'Gestión'   },
  '/catalogos':     { title: 'Catálogos',     section: 'Gestión'   },
  '/asistencia':    { title: 'Asistencia',    section: 'Gestión'   },
  '/reportes':      { title: 'Reportes',      section: 'Dueño'     },
  '/ai':            { title: 'AI',            section: 'Dueño'     },
  '/auditoria':     { title: 'Auditoría',     section: 'Dueño'     },
}

function routeMeta(pathname: string) {
  return ROUTE_META[pathname] ?? { title: 'Turbo Lavado', section: 'Operación' }
}

function AppShell() {
  const { auth, logout } = useAuth()
  const location = useLocation()
  if (!auth) {
    return <LoginScreen />
  }

  const role = auth.user.role as NavRole
  const meta = routeMeta(location.pathname)

  return (
    <Frame
      sidebar={
        <Sidebar
          role={role}
          userName={auth.user.fullName}
          onLogout={() => void logout()}
        />
      }
    >
      <Topbar
        crumbs={[meta.section]}
        title={meta.title}
        userName={auth.user.fullName}
        role={role}
      />
      <MobileTopbar userName={auth.user.fullName} />

      <main className="tl-page px-4 pb-24 lg:px-6 lg:pb-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets/nuevo" element={<NewTicketScreen />} />
          <Route path="/tickets" element={<TicketsBrowser />} />
          <Route path="/gastos" element={<ExpenseLedgerScreen />} />
          <Route path="/cierre-dia" element={<EndOfDayScreen />} />
          <Route path="/corte" element={<ShiftCloseScreen />} />
          <Route path="/nomina" element={<RequireRole role="GERENTE"><PayrollScreen /></RequireRole>} />
          <Route path="/inventario" element={<RequireRole role="GERENTE"><InventoryScreen /></RequireRole>} />
          <Route path="/ai" element={<RequireRole role="DUENO"><AiScreen /></RequireRole>} />
          <Route path="/reportes" element={<RequireRole role="DUENO"><ReportsScreen /></RequireRole>} />
          <Route path="/auditoria" element={<RequireRole role="DUENO"><AuditScreen /></RequireRole>} />
          <Route path="/catalogos" element={<RequireRole role="GERENTE"><CatalogsScreen /></RequireRole>} />
          <Route path="/asistencia" element={<RequireRole role="GERENTE"><AttendanceScreen /></RequireRole>} />
        </Routes>
      </main>

      <MobileNav role={role} />
    </Frame>
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
    <main className="tl-login-bg">
      {/* ── Left hero panel ── */}
      <div className="relative hidden flex-col justify-between p-10 lg:flex">
        {/* Brand mark */}
        <div className="relative flex items-center gap-3">
          <div className="tl-sb-logo" style={{ width: 40, height: 40 }}>
            <img src="/logo.png" alt="Turbo Lavado" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">Turbo Lavado</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green-bright shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
              <p className="text-[11px] tracking-wide text-brand-green-soft">Ecológico · Reynosa</p>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="relative space-y-10 max-w-xl">
          <div>
            <div className="mb-4">
              <EcoBadge>Operación 2026</EcoBadge>
            </div>
            <h2 className="text-white" style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              Cada coche cuenta.<br />Cada peso, también.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/60">
              Operaciones del día a día en un solo lugar. Tickets, nómina, gastos e inventario — sin Excel, sin papel.
            </p>
          </div>

          {/* Stat blocks */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: 'Hoy',       v: 'Domingo',     sub: 'cierre 8 pm' },
              { k: 'Turno',     v: 'Vespertino',  sub: 'activo' },
              { k: 'Lavadores', v: '16',          sub: 'en piso' },
            ].map(s => (
              <div key={s.k} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-white/50">{s.k}</div>
                <div className="mt-1 text-lg font-bold tracking-tight text-white">{s.v}</div>
                <div className="mt-0.5 text-[11px] text-white/40">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-white/35">
          &copy; {new Date().getFullYear()} Turbo Lavado · Reynosa, Tamaulipas
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="relative flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-[380px] rounded-[18px] bg-white p-8 shadow-lg">
          <div className="mb-7">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 ring-1 ring-primary-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-primary-700">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-ink-900">Iniciar sesión</h1>
            <p className="mt-1 text-[13px] text-ink-500">Sistema de operación diaria</p>
          </div>

          <form className="space-y-4" onSubmit={submit} data-testid="login-form">
            <Field label="Usuario">
              <input
                className="tl-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                data-testid="login-username"
              />
            </Field>
            <Field label="Contraseña">
              <input
                type="password"
                className="tl-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                data-testid="login-password"
              />
            </Field>
            {error && <ErrorMessage message={error} />}
            <Button kind="primary" size="lg" type="submit" block disabled={loading} testId="login-submit">
              {loading ? 'Entrando…' : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[11px] text-ink-400">
            <div className="h-px flex-1 bg-border-soft" />
            <span>roles disponibles</span>
            <div className="h-px flex-1 bg-border-soft" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Pill tone="gray">OPERADOR</Pill>
            <Pill tone="purple">GERENTE</Pill>
            <Pill tone="good">DUEÑO</Pill>
          </div>
        </div>
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
        <p className="text-[13.5px] text-ink-500 mt-0.5">Tu usuario no tiene permiso para esta pantalla.</p>
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
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-l-4 border-violet-400 bg-violet-50 px-5 py-4 shadow-sm">
          <div>
            <p className="font-bold text-violet-900">Dia abierto — sin turno activo</p>
            <p className="text-sm text-violet-700 mt-0.5">
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
                  className="tl-btn tl-btn-primary disabled:bg-violet-300"
                >
                  {openShiftMutation.isPending ? 'Abriendo...' : 'Turno Matutino'}
                </button>
              )}
              {!vespeExists && (
                <button
                  onClick={() => openShiftMutation.mutate('VESPERTINO')}
                  disabled={openShiftMutation.isPending}
                  className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-50 active:scale-[0.98]"
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

  const data = summary.data

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">Dashboard</h2>
          <p className="text-[13.5px] text-ink-500 mt-0.5">Resumen del dia — ventas, carros, estado del turno.</p>
        </div>
        <label className="w-full max-w-48">
          <span className="mb-1 block text-sm font-medium text-gray-700">Fecha</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>

      <DayStatusCard />

      {monthHist.data && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Este mes</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-100">
            {monthHist.data.totalCars} carros
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
            ${Number(monthHist.data.totalRevenue).toLocaleString('es-MX', { maximumFractionDigits: 0 })} ingresos
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${monthHist.data.totalResultado >= 0 ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-red-50 text-red-700 ring-red-100'}`}>
            ${Number(monthHist.data.totalResultado).toLocaleString('es-MX', { maximumFractionDigits: 0 })} resultado
          </span>
        </div>
      )}

      {summary.error && <ErrorMessage message={summary.error.message} />}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-8">
        <Metric label="Carros lavados" value={data ? String(data.carsWashed) : '...'} />
        <Metric label="Ingresos autos" value={data ? money(data.ticketRevenue, 'MXN') : '...'} variant="feature" />
        <Metric label="Efectivo" value={data ? money(data.cashRevenue, 'MXN') : '...'} variant="success" />
        <Metric label="Tarjeta" value={data ? money(data.cardRevenue, 'MXN') : '...'} variant="info" />
        <Metric label="Miscelanea" value={data ? money(data.inventorySalesRevenue, 'MXN') : '...'} />
        <Metric label="Gastos" value={data ? money(data.expensesTotal, 'MXN') : '...'} variant="danger" />
        <Metric label="Resultado" value={data ? money(data.result, 'MXN') : '...'} variant="info" />
        <Metric label="Sobrante/Faltante" value={data?.cashVariance == null ? 'Pendiente' : money(data.cashVariance, 'MXN')} variant={data?.cashVariance == null ? 'default' : data.cashVariance >= 0 ? 'success' : 'warn'} />
      </div>

      <Panel title="Tickets recientes">
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="tl-tbl zebra">
            <thead className="">
              <tr>
                <th>Nota</th>
                <th>Vehiculo</th>
                <th>Servicio</th>
                <th>Lavadores</th>
                <th className="r">Importe</th>
                <th>Pago</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody className="">
              {(data?.recentTickets ?? []).map((ticket) => (
                <tr key={ticket.id}>
                  <td className="font-semibold">{ticket.notaNumber}</td>
                  <td>{ticket.vehicleDescription || '-'}</td>
                  <td>{ticket.serviceTypeName} / {ticket.vehicleSizeName}</td>
                  <td>{ticket.assignments.map((assignment) => assignment.employeeName).join(', ')}</td>
                  <td className="r">{money(ticket.priceAmount, ticket.currency)}</td>
                  <td>
                    {!ticket.courtesy && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ticket.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {ticket.paymentMethod === 'CARD' ? 'Tarjeta' : 'Efectivo'}
                      </span>
                    )}
                  </td>
                  <td>
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

function EndOfDayScreen() {
  const navigate = useNavigate()
  const data = usePhaseData()
  const summary = useQuery({
    queryKey: ['daily-summary', today],
    queryFn: () => api<DailySummary>(`/api/v1/reports/daily-summary?date=${today}`),
  })
  const shifts = data.shifts.data ?? []
  const openShifts = shifts.filter((shift) => shift.status === 'OPEN')
  const closedShifts = shifts.filter((shift) => shift.status === 'CLOSED')
  const daily = summary.data

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">Cierre del dia</h2>
        <p className="text-[13.5px] text-ink-500 mt-0.5">Ruta rapida para terminar el dia sin brincar entre pantallas.</p>
      </div>

      <DayStatusCard />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Panel title="Trabajo de hoy">
            <div className="grid gap-4 md:grid-cols-4">
              <Metric label="Tickets" value={String(daily?.recentTickets.length ?? 0)} />
              <Metric label="Carros" value={String(daily?.carsWashed ?? 0)} />
              <Metric label="Efectivo" value={daily ? money(daily.cashRevenue, 'MXN') : '...'} variant="success" />
              <Metric label="Tarjeta" value={daily ? money(daily.cardRevenue, 'MXN') : '...'} variant="info" />
              <Metric label="Miscelanea" value={daily ? money(daily.inventorySalesRevenue, 'MXN') : '...'} />
              <Metric label="Gastos" value={daily ? money(daily.expensesTotal, 'MXN') : '...'} variant="danger" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/tickets/nuevo')}
                className="tl-btn tl-btn-primary"
              >
                Agregar ticket
              </button>
              <button
                type="button"
                onClick={() => navigate('/gastos')}
                className="tl-btn tl-btn-secondary"
              >
                Revisar salidas
              </button>
            </div>
          </Panel>

          <Panel title="Turnos">
            <div className="grid gap-3 md:grid-cols-2">
              {shifts.map((shift) => (
                <div key={shift.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{shift.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino'}</strong>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${shift.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {shift.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/corte')}
                    className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98]"
                  >
                    {shift.status === 'OPEN' ? 'Hacer corte' : 'Ver corte'}
                  </button>
                </div>
              ))}
              {!data.currentBusinessDay && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Abre el dia para comenzar.</p>
              )}
              {data.currentBusinessDay && shifts.length === 0 && (
                <p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-800">Abre un turno para capturar tickets.</p>
              )}
            </div>
          </Panel>
        </div>

        <aside>
          <Panel title="Resumen final">
            <SummaryRow label="Turnos abiertos" value={String(openShifts.length)} />
            <SummaryRow label="Turnos cerrados" value={String(closedShifts.length)} />
            <SummaryRow label="Resultado" value={daily ? money(daily.result, 'MXN') : '...'} />
            <SummaryRow label="Diferencia caja" value={daily?.cashVariance == null ? 'Pendiente' : money(daily.cashVariance, 'MXN')} />
            <button
              type="button"
              onClick={() => navigate('/corte')}
              disabled={openShifts.length === 0}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow transition-all hover:bg-slate-800 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
            >
              Cerrar turno abierto
            </button>
          </Panel>
        </aside>
      </div>
    </section>
  )
}

function testidSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function AiScreen() {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(today)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const aiBrief = useQuery({
    queryKey: ['ai-daily-brief', date],
    queryFn: () => api<AiInsight>(`/api/v1/ai/briefs/daily?date=${date}`, { method: 'POST' }),
  })
  const aiInsights = useQuery({
    queryKey: ['ai-insights', 'dashboard', date],
    queryFn: () => api<AiInsight[]>(`/api/v1/ai/insights?status=NEW&from=${date}&to=${date}`),
  })
  const history = useQuery({
    queryKey: ['ai-insights', 'command-center', from, to],
    queryFn: () => api<AiInsight[]>(`/api/v1/ai/insights?from=${from}&to=${to}`),
  })
  const refreshBrief = useMutation({
    mutationFn: () => api<AiInsight>(`/api/v1/ai/briefs/daily?date=${date}&force=true`, { method: 'POST' }),
    onSuccess: async () => {
      await invalidateAi(queryClient)
    },
  })
  const runAlerts = useMutation({
    mutationFn: () => api<AiInsight[]>(`/api/v1/ai/alerts/run?from=${date}&to=${date}`, { method: 'POST' }),
    onSuccess: async () => {
      await invalidateAi(queryClient)
    },
  })
  const alerts = (aiInsights.data ?? []).filter((insight) => insight.featureType === 'ANOMALY_ALERT')
  const historyRows = history.data ?? []

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">Dueno</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">AI Command Center</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Brief diario, alertas operativas, analisis de reportes e investigaciones con evidencia. La AI solo guarda insights; no modifica tickets, caja, gastos, nomina ni inventario.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
          Asesor operativo
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <AiStatusCard label="Brief seleccionado" value={date} detail={aiBrief.data ? 'Disponible' : aiBrief.isLoading ? 'Generando...' : 'Pendiente'} tone="sky" />
        <AiStatusCard label="Alertas nuevas" value={String(alerts.length)} detail={alerts.length === 1 ? 'requiere revision' : 'requieren revision'} tone={alerts.length > 0 ? 'amber' : 'emerald'} />
        <AiStatusCard label="Rango analista" value={`${from} / ${to}`} detail={`${historyRows.length} insights en historial`} tone="slate" />
      </div>

      <AiBriefSection
        date={date}
        setDate={setDate}
        brief={aiBrief.data}
        loading={aiBrief.isLoading}
        error={aiBrief.error?.message || refreshBrief.error?.message}
        onReload={() => refreshBrief.mutate()}
        reloading={refreshBrief.isPending}
      />
      <AiWatchdogSection
        date={date}
        setDate={setDate}
        alerts={alerts}
        loading={aiInsights.isLoading}
        error={aiInsights.error?.message || runAlerts.error?.message}
        onRun={() => runAlerts.mutate()}
        running={runAlerts.isPending}
      />
      <AiAnalystSection from={from} to={to} setFrom={setFrom} setTo={setTo} />
      <AiInvestigationSection from={from} to={to} />
      <AiHistorySection from={from} to={to} rows={historyRows} loading={history.isLoading} error={history.error?.message} />
    </section>
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

function toLocalDateTimeValue(isoString?: string | null): string {
  const d = isoString ? new Date(isoString) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localDateTimeToIso(dtStr: string): string {
  return new Date(dtStr).toISOString()
}

function TicketWorkspace({
  mode,
  ticket,
  onSaved,
  readOnly,
}: {
  mode: 'create' | 'edit'
  ticket?: Ticket
  onSaved: () => void
  readOnly?: boolean
}) {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState<string | null>(null)
  const [washerSearch, setWasherSearch] = useState('')
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
      paymentMethod: ticket?.paymentMethod ?? 'CASH',
      vehicleDescription: ticket?.vehicleDescription ?? '',
      notes: ticket?.notes ?? '',
      courtesy: ticket?.courtesy ?? false,
      courtesyReason: ticket?.courtesyReason ?? '',
      discountPercent: ticket?.discountPercent ?? 0,
      employeeIds: ticket?.assignments.map((assignment) => assignment.employeeId) ?? [],
      occurredAt: toLocalDateTimeValue(ticket?.occurredAt),
      internalRef: ticket?.internalRef ?? '',
      priceOverride: ticket?.priceOverride ? Number(ticket.priceOverride) : '',
    },
  })

  const watched = form.watch()
  const livePrice = useMemo(() => {
    if (watched.courtesy) return 0
    const base = (data.prices.data ?? []).find((price) =>
      price.serviceTypeId === Number(watched.serviceTypeId) &&
      price.vehicleSizeId === Number(watched.vehicleSizeId) &&
      price.currency === 'MXN'
    )?.amount
    if (base === undefined) return undefined
    const pct = watched.discountPercent ?? 0
    return pct > 0 ? Math.round(base * (1 - pct / 100) * 100) / 100 : base
  }, [data.prices.data, watched.courtesy, watched.serviceTypeId, watched.vehicleSizeId, watched.discountPercent])

  const save = useMutation({
    mutationFn: (values: TicketFormValues) => {
      const override = values.priceOverride !== '' && values.priceOverride != null ? Number(values.priceOverride) : undefined
      const payload = {
        businessDayId: Number(values.businessDayId),
        shiftId: Number(values.shiftId),
        serviceTypeId: Number(values.serviceTypeId),
        vehicleSizeId: Number(values.vehicleSizeId),
        currency: 'MXN',
        paymentMethod: values.courtesy ? 'CASH' : values.paymentMethod,
        vehicleDescription: values.vehicleDescription || undefined,
        courtesy: values.courtesy,
        courtesyReason: values.courtesyReason || undefined,
        discountPercent: values.courtesy ? 0 : (values.discountPercent ?? 0),
        employeeIds: values.employeeIds.map(Number),
        occurredAt: values.occurredAt ? localDateTimeToIso(values.occurredAt) : undefined,
        internalRef: values.internalRef?.trim() || undefined,
        priceOverride: override,
        notes: values.notes?.trim() || undefined,
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
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">{mode === 'edit' ? 'Editar ticket' : 'Nuevo ticket'}</h2>
          <p className="text-[13.5px] text-ink-500 mt-0.5">Captura rapida para operacion de mostrador.</p>
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

      <form className="grid gap-5 xl:grid-cols-[1fr_360px]" onSubmit={form.handleSubmit((values) => save.mutate(values))} data-testid="ticket-form">
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
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Descripcion del vehiculo" error={form.formState.errors.vehicleDescription?.message}>
                <input placeholder="Ej. Tsuru rojo, Tacoma blanca" {...form.register('vehicleDescription')} />
              </TextField>
              <TextField label="No. de Nota de Control" error={form.formState.errors.internalRef?.message}>
                <input placeholder="Ej. 41703" {...form.register('internalRef')} />
              </TextField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Fecha y hora del servicio" error={form.formState.errors.occurredAt?.message}>
                <input type="datetime-local" {...form.register('occurredAt')} />
              </TextField>
              <TextField label="Precio especial ($)" error={form.formState.errors.priceOverride?.message}>
                <input type="number" min="0.01" step="0.01" placeholder="Dejar vacio = precio de lista" {...form.register('priceOverride')} />
              </TextField>
            </div>
            <TextField label="Notas internas" error={form.formState.errors.notes?.message}>
              <textarea rows={2} placeholder="Notas visibles solo en esta pantalla por ahora" {...form.register('notes')} />
            </TextField>
          </Panel>

          <Panel title="Lavadores">
            {(() => {
              const allActive = (data.employees.data ?? []).filter((e) => e.active)
              const selectedIds = (form.watch('employeeIds') ?? []).map(Number)
              const selectedEmployees = allActive.filter((e) => selectedIds.includes(e.id))
              const query = washerSearch.toLowerCase()
              const filtered = allActive.filter(
                (e) => !selectedIds.includes(e.id) && e.fullName.toLowerCase().includes(query)
              )
              const toggle = (id: number) => {
                const current = selectedIds
                const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
                form.setValue('employeeIds', next, { shouldValidate: true })
              }
              return (
                <div className="space-y-3">
                  {selectedEmployees.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployees.map((e) => (
                        <span key={e.id} className="flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800">
                          {e.fullName}
                          <button type="button" onClick={() => toggle(e.id)} className="ml-0.5 text-violet-500 hover:text-violet-900">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Buscar lavador..."
                    value={washerSearch}
                    onChange={(e) => setWasherSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                  {washerSearch && (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100 bg-white">
                      {filtered.length === 0 && (
                        <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>
                      )}
                      {filtered.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => { toggle(e.id); setWasherSearch('') }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50"
                        >
                          {e.fullName}
                        </button>
                      ))}
                    </div>
                  )}
                  {!washerSearch && selectedEmployees.length === 0 && (
                    <p className="text-xs text-gray-400">Escribe el nombre para buscar</p>
                  )}
                </div>
              )
            })()}
            {form.formState.errors.employeeIds?.message && <p className="mt-2 text-sm text-red-600">{form.formState.errors.employeeIds.message}</p>}
          </Panel>

          <Panel title="Descuento">
            <TextField label="Descuento (%)" error={form.formState.errors.discountPercent?.message}>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                placeholder="0"
                disabled={watched.courtesy}
                {...form.register('discountPercent')}
              />
            </TextField>
            {watched.discountPercent > 0 && !watched.courtesy && (
              <p className="mt-1 text-xs text-amber-700">Precio final reducido {watched.discountPercent}%</p>
            )}
          </Panel>

          <Panel title="Cortesia">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" {...form.register('courtesy')} className="h-4 w-4 rounded border-gray-200 text-violet-600" />
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
              <SummaryRow
                label="Precio preview"
                value={
                  livePrice === undefined ? 'Sin precio' : (
                    watched.discountPercent > 0 && !watched.courtesy
                      ? `${money(livePrice, watched.currency)} (-${watched.discountPercent}%)`
                      : money(livePrice, watched.currency)
                  )
                }
              />
              <SummaryRow label="Lavadores" value={String(watched.employeeIds?.length ?? 0)} />
              <SummaryRow label="Tipo" value={watched.courtesy ? 'Cortesia' : 'Venta'} />
              <SummaryRow label="Pago" value={watched.courtesy ? 'Cortesia' : watched.paymentMethod === 'CARD' ? 'Tarjeta' : 'Efectivo'} />
            </div>
            {save.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{save.error.message}</p>}
            {readOnly ? (
              <p className="mt-5 rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-700 ring-1 ring-amber-200">
                Turno cerrado — solo lectura
              </p>
            ) : (
              <button
                type="submit"
                disabled={save.isPending || Boolean(disabledReason)}
                data-testid="ticket-submit"
                className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow transition-all hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                {save.isPending ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar ticket'}
              </button>
            )}
          </Panel>
        </aside>
      </form>
    </section>
  )
}

const employeeEditSchema = z.object({
  fullName: z.string().min(1, 'Escribe el nombre').max(120, 'Maximo 120 caracteres'),
  phone: z.string().max(40, 'Maximo 40 caracteres').optional(),
  active: z.boolean(),
  baseWeeklySalary: z.coerce.number().min(0, 'Minimo 0'),
  payrollType: z.enum(['SALARY', 'COMMISSION']),
  commissionRate: z.coerce.number().min(0, 'Minimo 0'),
  productivityBonusRate: z.coerce.number().min(0, 'Minimo 0'),
  deactivationReason: z.string().max(500, 'Maximo 500 caracteres').optional(),
  primaryShift: z.enum(['MATUTINO', 'VESPERTINO', '']).optional(),
  outOfShiftCommissionRate: z.coerce.number().min(0, 'Minimo 0'),
})
type EmployeeEditFormValues = z.infer<typeof employeeEditSchema>

function CatalogsScreen() {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState<string | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showInactiveEmployees, setShowInactiveEmployees] = useState(false)
  const data = usePhaseData()
  const openShifts = (data.shifts.data ?? []).filter((shift) => shift.status === 'OPEN')

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  const employeeForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      baseWeeklySalary: 0,
      payrollType: 'COMMISSION',
      commissionRate: 30,
      productivityBonusRate: 0,
    },
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
    defaultValues: { serviceTypeId: 0, vehicleSizeId: 0, amount: 0, effectiveFrom: today },
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
        payrollType: values.payrollType,
        commissionRate: Number(values.commissionRate),
        productivityBonusRate: Number(values.productivityBonusRate),
      }),
    }),
    onSuccess: async () => {
      employeeForm.reset({
        fullName: '',
        phone: '',
        baseWeeklySalary: 0,
        payrollType: 'COMMISSION',
        commissionRate: 30,
        productivityBonusRate: 0,
      })
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      showToast('Lavador guardado')
    },
  })

  const updateEmployee = useMutation({
    mutationFn: ({ id, values }: { id: number; values: EmployeeEditFormValues }) =>
      api<Employee>(`/api/v1/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: values.fullName.trim(),
          phone: values.phone?.trim() || undefined,
          active: values.active,
          baseWeeklySalary: Number(values.baseWeeklySalary),
          payrollType: values.payrollType,
          commissionRate: Number(values.commissionRate),
          productivityBonusRate: Number(values.productivityBonusRate),
          deactivationReason: !values.active ? (values.deactivationReason?.trim() || undefined) : undefined,
          primaryShift: values.primaryShift || undefined,
          outOfShiftCommissionRate: Number(values.outOfShiftCommissionRate),
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] })
      setEditingEmployee(null)
      showToast('Lavador actualizado')
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
        currency: 'MXN',
        effectiveFrom: values.effectiveFrom,
      }),
    }),
    onSuccess: async () => {
      priceForm.reset({ serviceTypeId: 0, vehicleSizeId: 0, amount: 0, effectiveFrom: today })
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
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">Catalogos</h2>
          <p className="text-[13.5px] text-ink-500 mt-0.5">Datos base para que el dueno configure tickets sin usar la base de datos.</p>
        </div>
        <NavLink to="/tickets/nuevo" className="tl-btn tl-btn-primary">
          Ir a nuevo ticket
        </NavLink>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Panel title="Lavadores">
            <form className="grid gap-3 md:grid-cols-[1fr_160px_140px_140px_140px_auto]" onSubmit={employeeForm.handleSubmit((values) => createEmployee.mutate(values))}>
              <TextField label="Nombre" error={employeeForm.formState.errors.fullName?.message}>
                <input placeholder="Ej. Juan Perez" {...employeeForm.register('fullName')} />
              </TextField>
              <TextField label="Telefono" error={employeeForm.formState.errors.phone?.message}>
                <input placeholder="Opcional" {...employeeForm.register('phone')} />
              </TextField>
              <SelectField label="Regla" error={employeeForm.formState.errors.payrollType?.message}>
                <select {...employeeForm.register('payrollType')}>
                  <option value="COMMISSION">Comision</option>
                  <option value="SALARY">Sueldo</option>
                </select>
              </SelectField>
              <TextField label="Sueldo base" error={employeeForm.formState.errors.baseWeeklySalary?.message}>
                <input type="number" min={0} step="0.01" {...employeeForm.register('baseWeeklySalary')} />
              </TextField>
              <TextField label="$ por carro" error={employeeForm.formState.errors.commissionRate?.message}>
                <input type="number" min={0} step="0.01" {...employeeForm.register('commissionRate')} />
              </TextField>
              <TextField label="Bono/carro" error={employeeForm.formState.errors.productivityBonusRate?.message}>
                <input type="number" min={0} step="0.01" {...employeeForm.register('productivityBonusRate')} />
              </TextField>
              <FormButton label="Agregar" loading={createEmployee.isPending} />
            </form>
            {createEmployee.error && <ErrorMessage message={createEmployee.error.message} />}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Lavadores registrados</span>
              <button
                type="button"
                onClick={() => setShowInactiveEmployees(!showInactiveEmployees)}
                className="text-xs text-violet-600 hover:underline"
              >
                {showInactiveEmployees ? 'Solo activos' : 'Ver todos'}
              </button>
            </div>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
              {employees.filter(e => showInactiveEmployees || e.active).length === 0 && (
                <p className="px-3 py-3 text-sm text-gray-400">No hay lavadores.</p>
              )}
              {employees.filter(e => showInactiveEmployees || e.active).map((employee) => (
                <div key={employee.id} className={`flex items-center justify-between gap-4 px-3 py-2 text-sm ${!employee.active ? 'opacity-50' : ''}`}>
                  <div>
                    <span className="font-medium">{employee.fullName}</span>
                    {!employee.active && <span className="ml-2 text-xs text-red-500">Baja</span>}
                    <p className="text-xs text-gray-400">
                      {employee.payrollType === 'COMMISSION'
                        ? `Comision ${money(employee.commissionRate, 'MXN')}/carro`
                        : `Sueldo ${money(employee.baseWeeklySalary, 'MXN')}/sem`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(employee)}
                    className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
            {editingEmployee && (
              <EmployeeEditModal
                employee={editingEmployee}
                onSave={(values) => updateEmployee.mutate({ id: editingEmployee.id, values })}
                onClose={() => setEditingEmployee(null)}
                saving={updateEmployee.isPending}
                error={updateEmployee.error?.message}
              />
            )}
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
              <TextField label="Desde" error={priceForm.formState.errors.effectiveFrom?.message}>
                <input type="date" {...priceForm.register('effectiveFrom')} />
              </TextField>
              <div className="md:col-span-5">
                <FormButton label="Guardar precio" loading={createPrice.isPending} />
              </div>
            </form>
            {createPrice.error && <ErrorMessage message={createPrice.error.message} />}
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="tl-tbl zebra">
                <thead className="">
                  <tr>
                    <th>Servicio</th>
                    <th>Tamano</th>
                    <th className="r">Precio</th>
                    <th>Desde</th>
                  </tr>
                </thead>
                <tbody className="">
                  {prices.map((price) => (
                    <tr key={price.id}>
                      <td>{price.serviceTypeName}</td>
                      <td>{price.vehicleSizeName}</td>
                      <td className="r">{money(price.amount, price.currency)}</td>
                      <td>{price.effectiveFrom}</td>
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
                className="w-full tl-btn tl-btn-primary disabled:bg-gray-200 disabled:text-gray-400"
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
                className="w-full tl-btn tl-btn-primary disabled:bg-gray-200 disabled:text-gray-400"
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
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">Gastos</h2>
          <p className="text-[13.5px] text-ink-500 mt-0.5">Registro de gastos, retiros y prestamos a lavadores.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button data-testid="gastos-new-expense" className="tl-btn tl-btn-primary" onClick={() => setModal('expense')}>Nuevo gasto</button>
          <button data-testid="gastos-new-withdrawal" className="tl-btn tl-btn-secondary" onClick={() => setModal('withdrawal')}>Nuevo retiro</button>
          <button data-testid="gastos-new-advance" className="tl-btn tl-btn-secondary" onClick={() => setModal('advance')}>Nuevo prestamo</button>
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
  const { hasRole } = useAuth()
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
        currency: 'MXN',
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
  const reopenMutation = useMutation({
    mutationFn: (reason: string) => api<Shift>(`/api/v1/corrections/shifts/${effectiveShiftId}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
    onSuccess: async () => {
      setToast('Turno reabierto')
      setCashCount(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['close-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['shifts'] }),
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
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">Corte de turno</h2>
          <p className="text-[13.5px] text-ink-500 mt-0.5">Conteo de efectivo, revision de salidas y cierre del turno.</p>
        </div>
        <SelectField label="Turno">
          <select data-testid="corte-shift-select" value={effectiveShiftId} onChange={(event) => {
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
                <strong className="text-lg">{money(localCountPreview, 'MXN')}</strong>
              </div>
              {countMutation.error && <ErrorMessage message={countMutation.error.message} />}
              <button
                type="submit"
                disabled={countMutation.isPending || !effectiveShiftId || summary?.closed}
                data-testid="corte-save-count"
                className="tl-btn tl-btn-primary disabled:bg-gray-200 disabled:text-gray-400"
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
              {reopenMutation.error && <ErrorMessage message={reopenMutation.error.message} />}
              <button
                type="submit"
                disabled={closeMutation.isPending || summary?.closed || !(cashCount || summary?.cashCount)}
                data-testid="corte-close-shift"
                className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow transition-all hover:bg-violet-700 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
              >
                {closeMutation.isPending ? 'Cerrando...' : summary?.closed ? 'Turno cerrado' : 'Cerrar turno'}
              </button>
              {hasRole('DUENO') && summary?.closed && (
                <button
                  type="button"
                  disabled={reopenMutation.isPending}
                  onClick={() => {
                    const reason = window.prompt('Motivo para reabrir el turno cerrado')
                    if (reason?.trim()) reopenMutation.mutate(reason.trim())
                  }}
                  className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition-all hover:bg-amber-100 active:scale-[0.98] disabled:text-amber-300"
                >
                  {reopenMutation.isPending ? 'Reabriendo...' : 'Reabrir turno'}
                </button>
              )}
            </form>
          </Panel>
        </aside>
      </div>
    </section>
  )
}

function AuditActionPill({ action }: { action: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    TICKET_VOID:        { bg: 'bg-red-50',     text: 'text-red-700',    label: 'Anulado' },
    TICKET_COURTESY:    { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Cortesia' },
    TICKET_CREATE:      { bg: 'bg-violet-50',  text: 'text-violet-700', label: 'Ticket' },
    TICKET_UPDATE:      { bg: 'bg-violet-50',  text: 'text-violet-700', label: 'Ticket edit' },
    SHIFT_OPEN:         { bg: 'bg-slate-100',  text: 'text-slate-600',  label: 'Turno abierto' },
    SHIFT_CLOSE:        { bg: 'bg-violet-50',     text: 'text-violet-700',    label: 'Turno cerrado' },
    DAY_OPEN:           { bg: 'bg-slate-100',  text: 'text-slate-600',  label: 'Dia abierto' },
    DAY_CLOSE:          { bg: 'bg-slate-100',  text: 'text-slate-600',  label: 'Dia cerrado' },
    EXPENSE_CREATE:     { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Gasto' },
    WITHDRAWAL_CREATE:  { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Retiro' },
    ADVANCE_CREATE:     { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Prestamo' },
    CASH_COUNT_SAVE:    { bg: 'bg-purple-50',  text: 'text-purple-700', label: 'Corte caja' },
    INVENTORY_IN:       { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Entrada inv.' },
    INVENTORY_OUT:      { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Salida inv.' },
    INVENTORY_ADJ:      { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Ajuste inv.' },
    PAYROLL_PERIOD:     { bg: 'bg-violet-50',     text: 'text-violet-700',    label: 'Nomina' },
    PAYROLL_ADJUSTMENT: { bg: 'bg-violet-50',     text: 'text-violet-700',    label: 'Ajuste nomina' },
  }
  const style = cfg[action] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: action.replace(/_/g, ' ') }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

function actorInitials(username: string): string {
  return username.slice(0, 2).toUpperCase()
}

function AuditScreen() {
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')

  const query = new URLSearchParams()
  if (from) query.set('from', from)
  if (to) query.set('to', to)
  if (entityType) query.set('entityType', entityType)
  if (entityId) query.set('entityId', entityId)

  const events = useQuery({
    queryKey: ['audit-events', from, to, entityType, entityId],
    queryFn: () => api<AuditEvent[]>(`/api/v1/audit-events?${query.toString()}`),
  })

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">Auditoria</h2>
        <p className="text-[13.5px] text-ink-500 mt-0.5">Cambios importantes de caja, tickets, gastos, nomina y correcciones.</p>
      </div>

      <Panel title="Filtros">
        <div className="grid gap-3 md:grid-cols-[180px_180px_220px_160px]">
          <TextField label="Desde">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </TextField>
          <TextField label="Hasta">
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </TextField>
          <SelectField label="Entidad">
            <select value={entityType} onChange={(event) => setEntityType(event.target.value)}>
              <option value="">Todas</option>
              <option value="TICKET">Ticket</option>
              <option value="EXPENSE">Gasto</option>
              <option value="WITHDRAWAL">Retiro</option>
              <option value="ADVANCE">Vale</option>
              <option value="SHIFT">Turno</option>
              <option value="PAYROLL_PERIOD">Nomina</option>
              <option value="PAYROLL_ADJUSTMENT">Ajuste nomina</option>
              <option value="CASH_COUNT">Conteo caja</option>
            </select>
          </SelectField>
          <TextField label="ID entidad">
            <input type="number" min={1} value={entityId} onChange={(event) => setEntityId(event.target.value)} />
          </TextField>
        </div>
      </Panel>

      <Panel title="Eventos recientes">
        {events.error && <ErrorMessage message={events.error.message} />}
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="tl-tbl zebra">
            <thead className="">
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Accion</th>
                <th>Entidad</th>
                <th>Motivo</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody className="">
              {(events.data ?? []).map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap text-gray-500">{formatDateTime(event.occurredAt)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                        {actorInitials(event.actorUsername)}
                      </span>
                      <span className="text-sm">{event.actorUsername}</span>
                    </div>
                  </td>
                  <td><AuditActionPill action={event.action} /></td>
                  <td className="text-gray-500">{event.entityType}{event.entityId ? ` #${event.entityId}` : ''}</td>
                  <td>{event.reason || '-'}</td>
                  <td className="text-gray-500">{event.details || '-'}</td>
                </tr>
              ))}
              {!events.isLoading && (events.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin eventos para estos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
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
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">Reportes</h2>
          <p className="text-[13.5px] text-ink-500 mt-0.5">Resumen diario, mensual, corte de caja, lavadores y exportacion Excel.</p>
        </div>
      </div>

      <Panel title="Rango">
        <div className="grid gap-3 md:grid-cols-[180px_180px_220px_auto]">
          <TextField label="Desde">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} data-testid="reports-from" />
          </TextField>
          <TextField label="Hasta">
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} data-testid="reports-to" />
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
              data-testid="reports-export"
              className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
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

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6" data-testid="reports-range-metrics">
        <Metric label="Ingresos" value={range ? money(range.ticketRevenue, 'MXN') : '...'} />
        <Metric label="Salidas" value={range ? money(range.expensesTotal, 'MXN') : '...'} />
        <Metric label="Resultado" value={range ? money(range.result, 'MXN') : '...'} />
        <Metric label="Carros" value={String(range?.carsWashed ?? '...')} />
        <Metric label="Cortesias" value={String(range?.courtesyCount ?? '...')} />
        <Metric label="Anulados" value={String(range?.voidedCount ?? '...')} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Panel title="Resumen por dia">
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="tl-tbl zebra">
                <thead className="">
                  <tr>
                    <th>Fecha</th>
                    <th className="r">Carros</th>
                    <th className="r">Ingresos</th>
                    <th className="r">Gastos</th>
                    <th className="r">Resultado</th>
                    <th className="r">Varianza</th>
                  </tr>
                </thead>
                <tbody className="">
                  {(range?.days ?? []).map((day) => (
                    <tr key={day.date}>
                      <td className="font-semibold">{day.date}</td>
                      <td className="r">{day.carsWashed}</td>
                      <td className="r">{money(day.ticketRevenue, 'MXN')}</td>
                      <td className="r">{money(day.expensesTotal, 'MXN')}</td>
                      <td className="r">{money(day.result, 'MXN')}</td>
                      <td className="r">{day.cashVariance == null ? '-' : money(day.cashVariance, 'MXN')}</td>
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
              <table className="tl-tbl zebra">
                <thead className="">
                  <tr>
                    <th>Lavador</th>
                    <th className="r">Tickets</th>
                    <th className="r">Carros acreditados</th>
                    <th className="r">Ingreso referencia</th>
                  </tr>
                </thead>
                <tbody className="">
                  {(performance.data?.employees ?? []).map((employee) => (
                    <tr key={employee.employeeId}>
                      <td className="font-semibold">{employee.employeeName}</td>
                      <td className="r">{employee.ticketCount}</td>
                      <td className="r">{employee.carsWashed.toFixed(2)}</td>
                      <td className="r">{money(employee.ticketRevenue, 'MXN')}</td>
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
            <div className="grid gap-4 md:grid-cols-3" data-testid="reports-cash-variance">
              <Metric label="Esperado" value={cashVariance.data ? money(cashVariance.data.expectedCash, 'MXN') : '...'} />
              <Metric label="Contado" value={cashVariance.data ? money(cashVariance.data.totalCounted, 'MXN') : '...'} />
              <Metric label="Diferencia" value={cashVariance.data ? money(cashVariance.data.variance, 'MXN') : '...'} />
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="tl-tbl zebra">
                <thead className="">
                  <tr>
                    <th>Fecha</th>
                    <th>Turno</th>
                    <th className="r">Esperado</th>
                    <th className="r">Contado</th>
                    <th className="r">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="">
                  {(cashVariance.data?.rows ?? []).map((row) => (
                    <tr key={`${row.shiftId}-${row.date}`}>
                      <td>{row.date}</td>
                      <td>{row.shiftType}</td>
                      <td className="r">{money(row.expectedCash, 'MXN')}</td>
                      <td className="r">{money(row.totalCounted, 'MXN')}</td>
                      <td className="r">{money(row.variance, 'MXN')}</td>
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
            <table className="tl-tbl zebra">
              <thead className="">
                <tr>
                  <th>Mes</th>
                  <th className="r">Carros</th>
                  <th className="r">Ingresos</th>
                  <th className="r">Gastos</th>
                  <th className="r">Resultado</th>
                  <th>Fuente</th>
                </tr>
              </thead>
              <tbody className="">
                {groupByMonth(historical.data?.days ?? []).map((row) => (
                  <tr key={row.month}>
                    <td className="font-medium">{row.month}</td>
                    <td className="r">{row.cars}</td>
                    <td className="r">{money(row.revenue, 'MXN')}</td>
                    <td className="r">{money(row.expenses, 'MXN')}</td>
                    <td className={`px-4 py-3 text-right font-medium ${row.resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(row.resultado, 'MXN')}</td>
                    <td>
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
  const activeEmployees = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => api<Employee[]>('/api/v1/employees?active=true'),
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
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">Inventario</h2>
          <p className="text-[13.5px] text-ink-500 mt-0.5">Productos y movimientos. El stock se calcula desde entradas y salidas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="tl-btn tl-btn-primary" onClick={() => setModal('product')}>Nuevo producto</button>
          <button className="tl-btn tl-btn-secondary" onClick={() => setModal('sale')}>Registrar venta</button>
          <button className="tl-btn tl-btn-secondary" onClick={() => setModal('purchase')}>Registrar compra</button>
          <button className="tl-btn tl-btn-secondary" onClick={() => setModal('adjustment')}>Ajuste</button>
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
          <table className="tl-tbl zebra">
            <thead className="">
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th className="r">Stock</th>
                <th className="r">Precio</th>
                <th>Ultimo movimiento</th>
                <th>Indicador</th>
                <th className="r">Acciones</th>
              </tr>
            </thead>
            <tbody className="">
              {rows.map((row) => {
                const latest = row.recentMovements[0]
                const lowStock = row.product.trackInventory && row.quantityOnHand <= 5
                return (
                  <tr key={row.product.id}>
                    <td className="font-semibold">{row.product.name}</td>
                    <td>{row.product.sku || '-'}</td>
                    <td className="r">{row.quantityOnHand.toFixed(2)}</td>
                    <td className="r">{money(row.product.currentUnitPrice, 'MXN')}</td>
                    <td>
                      {latest ? `${movementLabel(latest.movementType)} / ${latest.quantity}` : 'Sin movimientos'}
                    </td>
                    <td>
                      <InventoryStatusPill lowStock={lowStock} tracked={row.product.trackInventory} />
                    </td>
                    <td className="r">
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
      {modal === 'sale' && <InventorySaleModal products={products.data ?? []} employees={activeEmployees.data ?? []} onClose={() => setModal(null)} />}
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
          <input type="checkbox" {...form.register('trackInventory')} className="h-4 w-4 rounded border-gray-200 text-violet-600" />
          Controlar inventario
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" {...form.register('active')} className="h-4 w-4 rounded border-gray-200 text-violet-600" />
          Activo
        </label>
        {mutation.error && <ErrorMessage message={mutation.error.message} />}
        <ModalActions onClose={onClose} submitLabel={mutation.isPending ? 'Guardando...' : 'Guardar producto'} />
      </form>
    </Modal>
  )
}

function InventorySaleModal({ products, employees, onClose }: { products: Product[]; employees: Employee[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm<InventorySaleFormValues>({
    resolver: zodResolver(inventorySaleSchema),
    defaultValues: { productId: 0, quantity: 1, unitPrice: 0, movementDate: '', fiado: false, employeeId: 0 },
  })
  const product = products.find((item) => item.id === Number(form.watch('productId')))
  const isFiado = form.watch('fiado')
  const mutation = useMutation({
    mutationFn: (values: InventorySaleFormValues) => api<ProductMovement>('/api/v1/inventory/sales', {
      method: 'POST',
      body: JSON.stringify({
        productId: Number(values.productId),
        quantity: Number(values.quantity),
        unitPrice: Number(values.unitPrice || product?.currentUnitPrice || 0),
        movementDate: values.movementDate ? toIsoDateTime(values.movementDate) : undefined,
        fiado: values.fiado,
        employeeId: values.fiado && values.employeeId ? Number(values.employeeId) : undefined,
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
        <input type="checkbox" {...form.register('fiado')} className="h-4 w-4 rounded border-gray-200 text-violet-600" />
        Fiado (a credito — no suma al corte)
      </label>
      {isFiado && (
        <SelectField label="Lavador que lleva fiado (opcional)">
          <select {...form.register('employeeId')}>
            <option value={0}>Sin asignar</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.fullName}</option>
            ))}
          </select>
        </SelectField>
      )}
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
  if (!tracked) return <Pill tone="gray">Sin control</Pill>
  if (lowStock) return <Pill tone="warn">Stock bajo</Pill>
  return <Pill tone="good">OK</Pill>
}

function PayrollScreen() {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<PayrollPeriodStatus | ''>('')
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const form = useForm<PayrollPeriodFormValues>({
    resolver: zodResolver(payrollPeriodSchema),
    defaultValues: { startDate: previousSunday(today) },
  })
  const adjustmentForm = useForm<PayrollAdjustmentFormValues>({
    resolver: zodResolver(payrollAdjustmentSchema),
    defaultValues: { employeeId: 0, type: 'EARNING', amount: 0, concept: 'extra', note: '' },
  })

  const periods = useQuery({
    queryKey: ['payroll-periods', status],
    queryFn: () => api<PayrollPeriod[]>(`/api/v1/payroll/periods${status ? `?status=${status}` : ''}`),
  })
  const employees = useQuery({
    queryKey: ['payroll-employees'],
    queryFn: () => api<Employee[]>('/api/v1/employees?active=true'),
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
  const addAdjustment = useMutation({
    mutationFn: (values: PayrollAdjustmentFormValues) => api<PayrollAdjustment>(`/api/v1/payroll/periods/${selectedId}/adjustments`, {
      method: 'POST',
      body: JSON.stringify({ ...values, note: values.note || undefined }),
    }),
    onSuccess: async () => {
      adjustmentForm.reset({ employeeId: 0, type: 'EARNING', amount: 0, concept: 'extra', note: '' })
      await invalidatePayroll(queryClient)
      setToast('Ajuste guardado. Recalcula antes de bloquear.')
    },
  })
  const deleteAdjustment = useMutation({
    mutationFn: (id: number) => api<void>(`/api/v1/payroll/adjustments/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await invalidatePayroll(queryClient)
      setToast('Ajuste eliminado. Recalcula antes de bloquear.')
    },
  })
  const unlock = useMutation({
    mutationFn: (reason: string) => api<PayrollPeriod>(`/api/v1/corrections/payroll-periods/${selectedId}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
    onSuccess: async () => {
      await invalidatePayroll(queryClient)
      setToast('Nomina desbloqueada')
    },
  })

  const totals = {
    cars: (selectedPeriod?.entries ?? []).reduce((sum, entry) => sum + entry.carsWashed, 0),
    net: (selectedPeriod?.entries ?? []).reduce((sum, entry) => sum + entry.netPay, 0),
    advances: (selectedPeriod?.entries ?? []).reduce((sum, entry) => sum + entry.advancesDeducted, 0),
    commissions: (selectedPeriod?.entries ?? []).reduce((sum, entry) => sum + entry.commissions, 0),
    manualEarnings: (selectedPeriod?.entries ?? []).reduce((sum, entry) => sum + entry.manualEarnings, 0),
    manualDeductions: (selectedPeriod?.entries ?? []).reduce((sum, entry) => sum + entry.manualDeductions, 0),
  }
  const employeeOptions = (selectedPeriod?.entries.length ? selectedPeriod.entries.map((entry) => ({
    id: entry.employeeId,
    fullName: entry.employeeName,
  })) : employees.data ?? [])
  const locked = selectedPeriod?.status === 'LOCKED'
  const adjustmentType = adjustmentForm.watch('type')
  const conceptOptions = adjustmentType === 'EARNING'
    ? ['extra', 'puntualidad', 'bono manual', 'dia de descanso', 'other']
    : ['vales', 'deduccion', 'falta', 'permiso', 'clima', 'other']

  const downloadPayrollExport = async () => {
    if (!selectedId) return
    setDownloadError(null)
    try {
      const auth = readStoredAuth()
      const response = await fetch(`/api/v1/payroll/periods/${selectedId}/export?format=xlsx`, {
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
      link.download = `nomina-${selectedPeriod?.startDate ?? selectedId}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'No se pudo descargar la nomina')
    }
  }

  return (
    <section className="space-y-5">
      {toast && <Toast message={toast} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">Nomina</h2>
          <p className="text-[13.5px] text-ink-500 mt-0.5">Calculo semanal por sueldo, comision, bonos por carro y prestamos.</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" onSubmit={form.handleSubmit((values) => createPeriod.mutate(values))} data-testid="payroll-period-form">
          <TextField label="Domingo" error={form.formState.errors.startDate?.message}>
            <input type="date" {...form.register('startDate')} data-testid="payroll-start-date" />
          </TextField>
          <button data-testid="payroll-create-period" className="tl-btn tl-btn-primary">
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
                  disabled={!selectedId || locked || compute.isPending}
                  data-testid="payroll-compute"
                  className="tl-btn tl-btn-primary disabled:bg-gray-200 disabled:text-gray-400"
                  onClick={() => compute.mutate()}
                >
                  Recalcular
                </button>
                <button
                  disabled={!selectedId}
                  data-testid="payroll-export"
                  className="tl-btn tl-btn-secondary"
                  onClick={() => void downloadPayrollExport()}
                >
                  Exportar nomina
                </button>
                <button
                  disabled={!selectedId || selectedPeriod?.status !== 'COMPUTED' || lock.isPending}
                  data-testid="payroll-lock"
                  className="tl-btn tl-btn-secondary"
                  onClick={() => {
                    if (window.confirm('Bloquear nomina? Ya no se podra recalcular en v1.')) {
                      lock.mutate()
                    }
                  }}
                >
                  Bloquear
                </button>
                {hasRole('DUENO') && locked && (
                  <button
                    disabled={unlock.isPending}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition-all hover:bg-amber-100 active:scale-[0.98] disabled:text-amber-300"
                    onClick={() => {
                      const reason = window.prompt('Motivo para desbloquear la nomina')
                      if (reason?.trim()) unlock.mutate(reason.trim())
                    }}
                  >
                    Desbloquear
                  </button>
                )}
              </div>
            </div>
            {(compute.error || lock.error || unlock.error || downloadError) && (
              <ErrorMessage message={(compute.error || lock.error || unlock.error)?.message ?? downloadError!} />
            )}
            <div className="grid gap-4 md:grid-cols-5">
              <Metric label="Lavadores" value={String(selectedPeriod?.entries.length ?? 0)} />
              <Metric label="Carros" value={totals.cars.toFixed(2)} />
              <Metric label="Comisiones" value={money(totals.commissions, 'MXN')} />
              <Metric label="Extras" value={money(totals.manualEarnings, 'MXN')} />
              <Metric label="Descuentos" value={money(totals.manualDeductions + totals.advances, 'MXN')} />
              <Metric label="Neto a pagar" value={money(totals.net, 'MXN')} />
            </div>
          </Panel>

          <Panel title="Grid semanal">
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="tl-tbl zebra">
                <thead className="">
                  <tr>
                    <th>Lavador</th>
                    <th className="r">Carros</th>
                    <th className="r">Base</th>
                    <th className="r">Bono carros</th>
                    <th className="r">Comision</th>
                    <th className="r">Extras</th>
                    <th className="r">Deducciones</th>
                    <th className="r">Prestamos</th>
                    <th className="r">Neto</th>
                  </tr>
                </thead>
                <tbody className="">
                  {(selectedPeriod?.entries ?? []).map((entry) => (
                    <tr
                      key={entry.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedEmployeeId(entry.employeeId)}
                    >
                      <td className="font-semibold">{entry.employeeName}</td>
                      <td className="r">{entry.carsWashed.toFixed(2)}</td>
                      <td className="r">{money(entry.baseSalary, 'MXN')}</td>
                      <td className="r">{money(entry.carsBonus, 'MXN')}</td>
                      <td className="r">{money(entry.commissions, 'MXN')}</td>
                      <td className="r">{money(entry.manualEarnings, 'MXN')}</td>
                      <td className="r">{money(entry.manualDeductions, 'MXN')}</td>
                      <td className="r">{money(entry.advancesDeducted, 'MXN')}</td>
                      <td className="r font-semibold">{money(entry.netPay, 'MXN')}</td>
                    </tr>
                  ))}
                  {!period.isLoading && (selectedPeriod?.entries.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                        Crea o selecciona un periodo y presiona Recalcular.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Ajustes manuales">
            <form className="grid gap-3 lg:grid-cols-[1fr_150px_170px_140px_1fr_auto] lg:items-end" onSubmit={adjustmentForm.handleSubmit((values) => addAdjustment.mutate(values))}>
              <SelectField label="Lavador" error={adjustmentForm.formState.errors.employeeId?.message}>
                <select {...adjustmentForm.register('employeeId')} disabled={locked}>
                  <option value={0}>Selecciona</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.fullName}</option>
                  ))}
                </select>
              </SelectField>
              <SelectField label="Tipo" error={adjustmentForm.formState.errors.type?.message}>
                <select {...adjustmentForm.register('type')} disabled={locked}>
                  <option value="EARNING">Extra</option>
                  <option value="DEDUCTION">Deduccion</option>
                </select>
              </SelectField>
              <SelectField label="Concepto" error={adjustmentForm.formState.errors.concept?.message}>
                <select {...adjustmentForm.register('concept')} disabled={locked}>
                  {conceptOptions.map((concept) => (
                    <option key={concept} value={concept}>{concept}</option>
                  ))}
                </select>
              </SelectField>
              <TextField label="Monto" error={adjustmentForm.formState.errors.amount?.message}>
                <input type="number" min={0.01} step="0.01" {...adjustmentForm.register('amount')} disabled={locked} />
              </TextField>
              <TextField label="Nota" error={adjustmentForm.formState.errors.note?.message}>
                <input placeholder="clima, permiso, enfermo..." {...adjustmentForm.register('note')} disabled={locked} />
              </TextField>
              <button
                type="submit"
                disabled={!selectedId || locked || addAdjustment.isPending}
                data-testid="payroll-add-adjustment"
                className="tl-btn tl-btn-primary disabled:bg-gray-200 disabled:text-gray-400"
              >
                Agregar
              </button>
            </form>
            {(addAdjustment.error || deleteAdjustment.error) && <ErrorMessage message={(addAdjustment.error || deleteAdjustment.error)!.message} />}
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="tl-tbl zebra">
                <thead className="">
                  <tr>
                    <th>Lavador</th>
                    <th>Concepto</th>
                    <th>Nota</th>
                    <th className="r">Extra</th>
                    <th className="r">Deduccion</th>
                    <th className="r">Accion</th>
                  </tr>
                </thead>
                <tbody className="">
                  {(selectedPeriod?.adjustments ?? []).map((adjustment) => (
                    <tr key={adjustment.id}>
                      <td className="font-semibold">{adjustment.employeeName}</td>
                      <td>{adjustment.concept}</td>
                      <td className="text-gray-500">{adjustment.note || '-'}</td>
                      <td className="r">{adjustment.type === 'EARNING' ? money(adjustment.amount, 'MXN') : '-'}</td>
                      <td className="r">{adjustment.type === 'DEDUCTION' ? money(adjustment.amount, 'MXN') : '-'}</td>
                      <td className="r">
                        <button
                          type="button"
                          disabled={locked || deleteAdjustment.isPending}
                          onClick={() => deleteAdjustment.mutate(adjustment.id)}
                          className="rounded-lg border border-red-100 px-3 py-1 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 active:scale-[0.98] disabled:text-gray-300"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(selectedPeriod?.adjustments.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        Sin extras, vales, faltas o permisos capturados.
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
                  <SummaryRow label="Comision" value={money(selectedEntry.commissions, 'MXN')} />
                  <SummaryRow label="Extras" value={money(selectedEntry.manualEarnings, 'MXN')} />
                  <SummaryRow label="Deducciones" value={money(selectedEntry.manualDeductions, 'MXN')} />
                  <SummaryRow label="Prestamos" value={money(selectedEntry.advancesDeducted, 'MXN')} />
                  <SummaryRow label="Bruto" value={money(selectedEntry.grossPay, 'MXN')} />
                  <SummaryRow label="Neto" value={money(selectedEntry.netPay, 'MXN')} />
                  <SummaryRow label="Saldo deuda" value={debt.data ? money(debt.data.balance, 'MXN') : '...'} />
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <table className="tl-tbl zebra">
                    <thead className="">
                      <tr>
                        <th>Dia</th>
                        <th className="r">Carros</th>
                        <th className="r">Revenue ref.</th>
                      </tr>
                    </thead>
                    <tbody className="">
                      {(selectedPeriod?.days ?? []).filter((day) => day.employeeId === selectedEntry.employeeId).map((day) => (
                        <tr key={day.id}>
                          <td>{day.workDate}</td>
                          <td className="r">{day.carsWashed.toFixed(2)}</td>
                          <td className="r">{money(day.ticketRevenue, 'MXN')}</td>
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
  const tone: Record<PayrollPeriodStatus, PillTone> = { OPEN: 'gray', COMPUTED: 'info', LOCKED: 'good' }
  const label: Record<PayrollPeriodStatus, string> = { OPEN: 'Abierto', COMPUTED: 'Calculado', LOCKED: 'Bloqueado' }
  return <Pill tone={tone[status]}>{label[status]}</Pill>
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
      <input type="number" min={0} step={1} {...form.register(name)} data-testid={`cash-input-${String(name)}`} />
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
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">Tickets</h2>
          <p className="text-[13.5px] text-ink-500 mt-0.5">Busqueda y revision de tickets capturados.</p>
        </div>
        <NavLink to="/tickets/nuevo" className="tl-btn tl-btn-primary">
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

      <div className="tl-panel overflow-hidden">
        <table className="tl-tbl zebra">
          <thead className="">
            <tr>
              <th>Nota</th>
              <th>Vehiculo</th>
              <th>Servicio</th>
              <th>Lavadores</th>
              <th className="r">Importe</th>
              <th>Pago</th>
              <th>Estado</th>
              <th className="r">Acciones</th>
            </tr>
          </thead>
          <tbody className="">
            {filtered.map((ticket) => (
              <tr key={ticket.id}>
                <td className="font-semibold">{ticket.notaNumber}</td>
                <td>{ticket.vehicleDescription || '-'}</td>
                <td>{ticket.serviceTypeName} / {ticket.vehicleSizeName}</td>
                <td>{ticket.assignments.map((a) => a.employeeName).join(', ')}</td>
                <td className="r">{money(ticket.priceAmount, ticket.currency)}</td>
                <td>
                  {!ticket.courtesy && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ticket.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {ticket.paymentMethod === 'CARD' ? 'Tarjeta' : 'Efectivo'}
                    </span>
                  )}
                </td>
                <td>
                  <TicketStatusPill ticket={ticket} />
                </td>
                <td className="r">
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
          <TicketWorkspace
            mode="edit"
            ticket={selected}
            onSaved={() => setSelected(null)}
            readOnly={!(data.shifts.data ?? []).some((s) => s.id === selected.shiftId && s.status === 'OPEN')}
          />
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
        <p className="text-[13.5px] text-ink-500 mt-0.5">El ticket queda guardado como cancelado y no cuenta para ingresos.</p>
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
        className="w-full tl-btn tl-btn-primary disabled:bg-gray-200 disabled:text-gray-400"
      >
        {loading ? 'Guardando...' : label}
      </button>
    </div>
  )
}

function AiStatusCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone: 'sky' | 'amber' | 'emerald' | 'slate'
}) {
  const toneClass = {
    sky: 'border-violet-100 bg-violet-50/70 text-violet-700',
    amber: 'border-amber-100 bg-amber-50/80 text-amber-700',
    emerald: 'border-emerald-100 bg-emerald-50/80 text-emerald-700',
    slate: 'border-slate-200 bg-white text-slate-700',
  }[tone]

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-2 break-words text-lg font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm opacity-80">{detail}</p>
    </div>
  )
}

function AiWorkflowSection({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action && <div className="flex flex-wrap items-end gap-2">{action}</div>}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function AiDateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  )
}

function AiActionButton({
  label,
  loadingLabel,
  loading,
  onClick,
  tone = 'slate',
}: {
  label: string
  loadingLabel: string
  loading: boolean
  onClick: () => void
  tone?: 'slate' | 'sky' | 'emerald' | 'amber'
}) {
  const toneClass = {
    slate: 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400',
    sky: 'bg-violet-600 text-white hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400',
    emerald: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400',
    amber: 'bg-amber-500 text-white hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400',
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] ${toneClass}`}
    >
      {loading ? loadingLabel : label}
    </button>
  )
}

function AiBriefSection({
  date,
  setDate,
  brief,
  loading,
  error,
  onReload,
  reloading,
}: {
  date: string
  setDate: (value: string) => void
  brief?: AiInsight
  loading: boolean
  error?: string
  onReload: () => void
  reloading: boolean
}) {
  return (
    <AiWorkflowSection
      eyebrow="1. Brief del dia"
      title="Resumen practico para abrir el dia"
      description="Ventas, caja, lavadores, inventario y acciones del dueno en un bloque legible."
      action={(
        <>
          <AiDateInput label="Fecha" value={date} onChange={setDate} />
          <AiActionButton label="Generar / recargar" loadingLabel="Generando..." loading={reloading} onClick={onReload} tone="sky" />
        </>
      )}
    >
      {error && <ErrorMessage message={error} />}
      {loading && <AiEmptyState text="Preparando brief diario..." />}
      {!loading && brief && <AiInsightCard insight={brief} compact={false} />}
      {!loading && !brief && !error && <AiEmptyState text="Todavia no hay brief para esta fecha." />}
    </AiWorkflowSection>
  )
}

function AiWatchdogSection({
  date,
  setDate,
  alerts,
  loading,
  error,
  onRun,
  running,
}: {
  date: string
  setDate: (value: string) => void
  alerts: AiInsight[]
  loading: boolean
  error?: string
  onRun: () => void
  running: boolean
}) {
  return (
    <AiWorkflowSection
      eyebrow="2. Watchdog de alertas"
      title="Alertas no financieras que necesitan revision"
      description="Detecta diferencias de caja, bajas de ingresos, cortesia/voids altos, gastos raros e inventario bajo."
      action={(
        <>
          <AiDateInput label="Fecha" value={date} onChange={setDate} />
          <AiActionButton label="Correr watchdog" loadingLabel="Revisando..." loading={running} onClick={onRun} tone="amber" />
        </>
      )}
    >
      {error && <ErrorMessage message={error} />}
      {loading && <AiEmptyState text="Cargando alertas nuevas..." />}
      {!loading && alerts.length === 0 && !error && <AiEmptyState text="Sin alertas nuevas para esta fecha." />}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((insight) => <AiInsightCard key={insight.id} insight={insight} compact />)}
        </div>
      )}
    </AiWorkflowSection>
  )
}

function AiAnalystSection({
  from,
  to,
  setFrom,
  setTo,
}: {
  from: string
  to: string
  setFrom: (value: string) => void
  setTo: (value: string) => void
}) {
  const queryClient = useQueryClient()
  const chatForm = useForm<AnalystChatFormValues>({
    resolver: zodResolver(analystChatSchema),
    defaultValues: { message: '' },
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

  return (
    <AiWorkflowSection
      eyebrow="3. Analista AI"
      title="Preguntas rapidas sobre el negocio"
      description="Responde con numeros visibles del rango seleccionado y sugiere siguientes preguntas."
      action={(
        <>
          <AiDateInput label="Desde" value={from} onChange={setFrom} />
          <AiDateInput label="Hasta" value={to} onChange={setTo} />
        </>
      )}
    >
      <form className="space-y-4" onSubmit={chatForm.handleSubmit((values) => chat.mutate(values))}>
        <TextField label="Pregunta" error={chatForm.formState.errors.message?.message}>
          <textarea rows={4} placeholder="Ej. Por que esta semana estuvo mas baja?" {...chatForm.register('message')} />
        </TextField>
        {chat.error && <ErrorMessage message={chat.error.message} />}
        <button
          type="submit"
          disabled={chat.isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400"
        >
          {chat.isPending ? 'Analizando...' : 'Preguntar al analista'}
        </button>
      </form>

      {chat.data && (
        <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-4">
          <AiLabeledText label="Conclusion" text={chat.data.answer} />
          <AiEvidenceList title="Numeros usados" rows={chat.data.supportingNumbers} />
          {chat.data.suggestedFollowUps.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Siguientes preguntas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {chat.data.suggestedFollowUps.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => chatForm.setValue('message', question)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-100 hover:bg-violet-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AiWorkflowSection>
  )
}

function AiInvestigationSection({ from, to }: { from: string; to: string }) {
  const queryClient = useQueryClient()
  const investigationForm = useForm<InvestigationFormValues>({
    resolver: zodResolver(investigationSchema),
    defaultValues: { question: '' },
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

  return (
    <AiWorkflowSection
      eyebrow="4. Investigacion con agente"
      title="Investigacion trazable con herramientas internas"
      description={`Usa resumen diario, historial, caja, lavadores e inventario para el rango ${from} a ${to}.`}
    >
      <form className="space-y-4" onSubmit={investigationForm.handleSubmit((values) => investigation.mutate(values))}>
        <TextField label="Pregunta a investigar" error={investigationForm.formState.errors.question?.message}>
          <textarea rows={4} placeholder="Ej. Que explica la diferencia de efectivo de este rango?" {...investigationForm.register('question')} />
        </TextField>
        {investigation.error && <ErrorMessage message={investigation.error.message} />}
        <button
          type="submit"
          disabled={investigation.isPending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400"
        >
          {investigation.isPending ? 'Investigando...' : 'Investigar'}
        </button>
      </form>

      {investigation.data && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <AiLabeledText label="Conclusion" text={investigation.data.conclusion} />
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Confianza {confidenceLabel(investigation.data.confidence)}
            </span>
          </div>
          <AiEvidenceList title="Evidencia" rows={investigation.data.evidence} />
          <AiEvidenceList title="Pasos realizados" rows={investigation.data.steps} ordered />
        </div>
      )}
    </AiWorkflowSection>
  )
}

function AiHistorySection({
  from,
  to,
  rows,
  loading,
  error,
}: {
  from: string
  to: string
  rows: AiInsight[]
  loading: boolean
  error?: string
}) {
  const sortedRows = [...rows].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))

  return (
    <AiWorkflowSection
      eyebrow="5. Historial de insights"
      title="Bitacora reciente de AI"
      description={`Insights guardados del ${from} al ${to}, con estado y acciones de revision.`}
    >
      {error && <ErrorMessage message={error} />}
      {loading && <AiEmptyState text="Cargando historial..." />}
      {!loading && sortedRows.length === 0 && !error && <AiEmptyState text="Sin historial de AI para este rango." />}
      {sortedRows.length > 0 && (
        <div className="space-y-3">
          {sortedRows.slice(0, 8).map((insight) => <AiInsightCard key={insight.id} insight={insight} compact />)}
        </div>
      )}
    </AiWorkflowSection>
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

  const summaryLines = aiSummaryLines(insight.summary)
  const visibleLines = compact ? summaryLines.slice(0, 3) : summaryLines

  return (
    <article className={`rounded-xl border p-4 shadow-sm ${aiSeverityClass(insight.severity)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-black/5">
              {featureLabel(insight.featureType)}
            </span>
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-black/5">
              {severityLabel(insight.severity)}
            </span>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-black/5">
              {statusLabel(insight.status)}
            </span>
            <span className="text-xs text-slate-500">{insight.sourceFrom} a {insight.sourceTo}</span>
          </div>
          <h4 className="mt-3 text-sm font-bold text-slate-950">{insight.title}</h4>
          {visibleLines.length > 0 && (
            <div className="mt-2 space-y-1.5 text-sm leading-6 text-slate-700">
              {visibleLines.map((line, index) => (
                <p key={`${insight.id}-${index}`}>{line}</p>
              ))}
            </div>
          )}
          {!compact && <AiDetailRows details={insight.details} />}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {insight.status === 'NEW' ? (
            <>
              <button
                type="button"
                onClick={() => acknowledge.mutate()}
                disabled={acknowledge.isPending || dismiss.isPending}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Revisado
              </button>
              <button
                type="button"
                onClick={() => dismiss.mutate()}
                disabled={acknowledge.isPending || dismiss.isPending}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
              >
                Descartar
              </button>
            </>
          ) : (
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
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

function AiLabeledText({ label, text }: { label: string; text: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-950">{text}</p>
    </div>
  )
}

function AiEvidenceList({ title, rows, ordered = false }: { title: string; rows: string[]; ordered?: boolean }) {
  if (rows.length === 0) return null
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <Tag className={`mt-1 space-y-1 text-sm leading-6 text-slate-700 ${ordered ? 'list-decimal pl-5' : 'list-disc pl-5'}`}>
        {rows.map((row) => <li key={row}>{row}</li>)}
      </Tag>
    </div>
  )
}

function AiEmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
      {text}
    </p>
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
  const slug = testidSlug(title)
  return (
    <Panel title={title}>
      <div className="overflow-hidden rounded-xl border border-gray-100" data-testid={`money-table-${slug}`}>
        <table className="tl-tbl zebra">
          <thead className="">
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Detalle</th>
              <th className="r">Monto</th>
            </tr>
          </thead>
          <tbody className="">
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td className="font-semibold">{row.concept}</td>
                <td>{row.detail}</td>
                <td className="r">{money(row.amount, 'MXN')}</td>
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
      <button type="submit" className="tl-btn tl-btn-primary">
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

function EmployeeEditModal({
  employee,
  onSave,
  onClose,
  saving,
  error,
}: {
  employee: Employee
  onSave: (values: EmployeeEditFormValues) => void
  onClose: () => void
  saving: boolean
  error?: string
}) {
  const form = useForm<EmployeeEditFormValues>({
    resolver: zodResolver(employeeEditSchema),
    defaultValues: {
      fullName: employee.fullName,
      phone: employee.phone ?? '',
      active: employee.active,
      baseWeeklySalary: employee.baseWeeklySalary,
      payrollType: employee.payrollType,
      commissionRate: employee.commissionRate,
      productivityBonusRate: employee.productivityBonusRate,
      deactivationReason: employee.deactivationReason ?? '',
      primaryShift: (employee.primaryShift as 'MATUTINO' | 'VESPERTINO' | '') ?? '',
      outOfShiftCommissionRate: employee.outOfShiftCommissionRate ?? 0,
    },
  })
  const watchedActive = form.watch('active')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Editar lavador — {employee.fullName}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSave)}>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Nombre" error={form.formState.errors.fullName?.message}>
              <input {...form.register('fullName')} />
            </TextField>
            <TextField label="Telefono" error={form.formState.errors.phone?.message}>
              <input {...form.register('phone')} />
            </TextField>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SelectField label="Regla de pago" error={form.formState.errors.payrollType?.message}>
              <select {...form.register('payrollType')}>
                <option value="COMMISSION">Comision</option>
                <option value="SALARY">Sueldo</option>
              </select>
            </SelectField>
            <TextField label="Sueldo base/sem" error={form.formState.errors.baseWeeklySalary?.message}>
              <input type="number" min={0} step="0.01" {...form.register('baseWeeklySalary')} />
            </TextField>
            <TextField label="$ por carro" error={form.formState.errors.commissionRate?.message}>
              <input type="number" min={0} step="0.01" {...form.register('commissionRate')} />
            </TextField>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField label="Turno principal" error={form.formState.errors.primaryShift?.message}>
              <select {...form.register('primaryShift')}>
                <option value="">Sin asignacion</option>
                <option value="MATUTINO">Matutino</option>
                <option value="VESPERTINO">Vespertino</option>
              </select>
            </SelectField>
            <TextField label="$ por carro fuera de turno" error={form.formState.errors.outOfShiftCommissionRate?.message}>
              <input type="number" min={0} step="0.01" {...form.register('outOfShiftCommissionRate')} />
            </TextField>
          </div>
          <div className="rounded-lg border border-gray-100 p-3 space-y-3">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" {...form.register('active')} className="h-4 w-4 rounded border-gray-200 text-violet-600" />
              Activo
            </label>
            {!watchedActive && (
              <TextField label="Motivo de baja" error={form.formState.errors.deactivationReason?.message}>
                <input placeholder="Ej. Renuncia voluntaria" {...form.register('deactivationReason')} />
              </TextField>
            )}
            {!watchedActive && employee.deactivationReason && (
              <p className="text-xs text-gray-500">Motivo anterior: {employee.deactivationReason}</p>
            )}
          </div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
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

async function invalidateAi(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['ai-insights'] }),
    queryClient.invalidateQueries({ queryKey: ['ai-daily-brief'] }),
  ])
}

function aiSummaryLines(summary: string) {
  return summary
    .split('\n')
    .map((line) => line.trim().replace(/^-\s*/, ''))
    .filter(Boolean)
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
    INFO: 'border-violet-100 bg-violet-50',
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
  if (ticket.status === 'VOIDED') return <Pill tone="bad">Cancelado</Pill>
  if (ticket.courtesy) return <Pill tone="warn">Cortesia</Pill>
  return <Pill tone="good">Activo</Pill>
}

function Modal({ title, children, onClose, narrow = false }: { title: string; children: React.ReactNode; onClose: () => void; narrow?: boolean }) {
  const slug = testidSlug(title)
  const titleId = `modal-${slug}-title`
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto px-4 py-8"
      style={{ background: 'rgba(15,23,42,0.40)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid={`modal-${slug}`}
    >
      <div className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 ${narrow ? 'w-full max-w-lg' : 'w-full max-w-5xl'}`}>
        <div className="flex items-start gap-3 border-b border-border-soft px-6 py-4">
          <div>
            <h3 id={titleId} className="text-base font-bold tracking-tight text-ink-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-auto p-6">{children}</div>
      </div>
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return (
    <div
      className="fixed right-4 top-4 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-white"
      style={{ background: 'var(--ink-900)', boxShadow: 'var(--shadow-lg)' }}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'var(--good-500)' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
      {message}
    </div>
  )
}

function formatLocalTime(isoString?: string | null): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Monterrey',
  })
}

function AttendanceScreen() {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(today)
  const [toast, setToast] = useState<string | null>(null)
  const [clockOutId, setClockOutId] = useState<number | null>(null)
  const [clockOutTime, setClockOutTime] = useState('')

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  const employees = useQuery({
    queryKey: ['employees'],
    queryFn: () => api<Employee[]>('/api/v1/employees'),
  })

  const records = useQuery({
    queryKey: ['attendance', date],
    queryFn: () => api<AttendanceRecord[]>(`/api/v1/attendance?date=${date}`),
  })

  const attendedIds = new Set((records.data ?? []).map((r) => r.employeeId))
  const activeEmployees = (employees.data ?? []).filter((e) => e.active)
  const notRecorded = activeEmployees.filter((e) => !attendedIds.has(e.id))

  const clockIn = useMutation({
    mutationFn: (employeeId: number) =>
      api<AttendanceRecord>('/api/v1/attendance', {
        method: 'POST',
        body: JSON.stringify({ employeeId, workDate: date, absence: false }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance', date] })
      showToast('Entrada registrada')
    },
  })

  const markAbsent = useMutation({
    mutationFn: (employeeId: number) =>
      api<AttendanceRecord>('/api/v1/attendance', {
        method: 'POST',
        body: JSON.stringify({ employeeId, workDate: date, absence: true }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance', date] })
      showToast('Falta registrada')
    },
  })

  const clockOut = useMutation({
    mutationFn: ({ id, clockOutIso }: { id: number; clockOutIso: string }) =>
      api<AttendanceRecord>(`/api/v1/attendance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ clockOut: clockOutIso }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance', date] })
      setClockOutId(null)
      setClockOutTime('')
      showToast('Salida registrada')
    },
  })

  const handleClockOut = (id: number) => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    setClockOutTime(`${hh}:${mm}`)
    setClockOutId(id)
  }

  const submitClockOut = () => {
    if (clockOutId == null || !clockOutTime) return
    const [hh, mm] = clockOutTime.split(':').map(Number)
    const d = new Date(`${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`)
    clockOut.mutate({ id: clockOutId, clockOutIso: d.toISOString() })
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-900">Asistencia</h2>
          <p className="text-[13.5px] text-ink-500 mt-0.5">Entradas, salidas y faltas del personal.</p>
        </div>
        <label className="w-full max-w-48">
          <span className="mb-1 block text-sm font-medium text-gray-700">Fecha</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {records.error && <ErrorMessage message={records.error.message} />}

      <Panel title="Registros del dia">
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="tl-tbl zebra">
            <thead>
              <tr>
                <th>Lavador</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(records.data ?? []).map((record) => (
                <tr key={record.id}>
                  <td className="font-medium">{record.employeeName}</td>
                  <td>{record.absence ? '—' : formatLocalTime(record.clockIn)}</td>
                  <td>{record.absence ? '—' : formatLocalTime(record.clockOut)}</td>
                  <td>
                    {record.absence ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Falta</span>
                    ) : record.clockOut ? (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Completo</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">En turno</span>
                    )}
                  </td>
                  <td>
                    {!record.absence && !record.clockOut && (
                      <button
                        type="button"
                        onClick={() => handleClockOut(record.id)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Registrar salida
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!records.isLoading && (records.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    No hay registros para esta fecha.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {notRecorded.length > 0 && (
        <Panel title="Sin registrar">
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
            {notRecorded.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-sm font-medium">{emp.fullName}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={clockIn.isPending}
                    onClick={() => clockIn.mutate(emp.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    disabled={markAbsent.isPending}
                    onClick={() => markAbsent.mutate(emp.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Falta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {clockOutId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold">Registrar salida</h3>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Hora de salida</span>
              <input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="w-full"
              />
            </label>
            {clockOut.error && <p className="mt-2 text-sm text-red-600">{clockOut.error.message}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setClockOutId(null); setClockOutTime('') }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!clockOutTime || clockOut.isPending}
                onClick={submitClockOut}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {clockOut.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} />}
    </section>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
