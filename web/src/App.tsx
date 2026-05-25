import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Frame, MobileNav, MobileTopbar, Sidebar, Topbar, type NavRole } from './components/layout'
import { IAudit, ICalendar, ICash, IMoney, IPayroll, IReports } from './components/icons'
import {
  Avatars,
  Banner,
  Button,
  EcoBadge,
  EmptyState,
  Field,
  Metric,
  PageHead,
  Panel,
  Pill,
  Plate,
  Sparkline,
  StatStrip,
  StatusPill,
  SummaryRow,
  type MetricVariant,
  type Tone as PillTone,
} from './components/ui'

type Currency = 'MXN'
type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'
type TicketStatus = 'ACTIVE' | 'VOIDED'
type AuthRole = 'OPERADOR' | 'GERENTE' | 'DUENO'
type PayrollType = 'SALARY' | 'COMMISSION'

type AuthUser = {
  id: number
  username: string
  fullName: string
  role: AuthRole
  payrollAccess: boolean
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
  restDayPremium: number
  absenceDayPenalty: number
}

type ServiceType = {
  id: number
  code: string
  name: string
  description?: string
  active: boolean
  category?: 'STANDARD' | 'EXTRA' | string
}

type VehicleSizeCategory = 'AUTO' | 'MOTO' | 'RAZR' | 'PERSONAL'

type VehicleSize = {
  id: number
  code: string
  name: string
  sortOrder: number
  category?: VehicleSizeCategory | string
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
  transferRevenue: number
  expensesTotal: number
  withdrawalsTotal: number
  expectedCash: number
  totalCounted?: number | null
  variance?: number | null
  closingReason?: string | null
  closedAt?: string | null
  cashCount?: CashCount | null
  closed: boolean
  prepaidPackagesTotal?: number | null
  inventorySalesTotal?: number | null
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
  surchargeAmount?: number | null
  surchargeReason?: string | null
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
  transferRevenue: number
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
  restDayPay: number
  absenceDeduction: number
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

type PrepaidPackage = {
  id: number
  businessDayId: number
  shiftId: number
  washesIncluded: number
  amount: number
  currency: string
  paymentMethod: string
  notes?: string | null
  occurredAt: string
  createdAt: string
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
  severity: 'INFO' | 'FLAGGED'
  reviewedAt?: string | null
  reviewedBy?: string | null
}

type ActorActivity = {
  actor: string
  ticketsCreated: number
  ticketsEdited: number
  ticketsVoided: number
  ticketsCourtesy: number
  ticketsDiscount: number
  expensesCreated: number
  withdrawalsCreated: number
  advancesCreated: number
  shiftsClosed: number
  payrollAdjustments: number
  suspicionScore: number
  suspicionLevel: 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH'
}

type ShiftShortage = {
  shiftCloseId: number
  shiftId: number
  shiftType: 'MATUTINO' | 'VESPERTINO'
  businessDate: string
  variance: number
  expectedCash: number
  totalCounted: number
  closingReason?: string | null
  closedAt: string
}

type OversightPatterns = {
  from: string
  to: string
  totalCortesias: number
  totalVoided: number
  totalFastEdits: number
  totalShortageVariance: number
  totalOffHoursActions: number
  byActor: ActorActivity[]
  fastEdits: AuditEvent[]
  offHoursActions: AuditEvent[]
  shortages: ShiftShortage[]
}

type MovementType = 'SALE' | 'FIADO' | 'PURCHASE' | 'ADJUSTMENT' | 'OPENING_COUNT' | 'CLOSING_COUNT'

type ProductCategory = 'AROMA' | 'SNACK' | 'OTRO'

type Product = {
  id: number
  name: string
  sku: string
  currentUnitPrice: number
  trackInventory: boolean
  active: boolean
  category: ProductCategory
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

type AiFeatureType = 'DAILY_BRIEF' | 'ANOMALY_ALERT' | 'MONTHLY_ADVISOR' | 'ANALYST_CHAT' | 'AGENT_INVESTIGATION' | 'DEMAND_FORECAST'

type ForecastPointResponse = {
  date: string
  predictedCars: number
  predictedCarsLow: number
  predictedCarsHigh: number
  predictedRevenueMxn: number
  predictedRevenueMxnLow: number
  predictedRevenueMxnHigh: number
  expectedPrecipitationMm?: number | null
  expectedTempMaxC?: number | null
}

type ForecastResponse = {
  snapshotDate: string
  generatedAt: string
  modelVersion: string
  horizonDays: number
  carsBacktestMape: number | null
  revenueBacktestMape: number | null
  points: ForecastPointResponse[]
}
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

type ToolCallSummary = {
  name: string
  arguments: Record<string, unknown> | unknown
  resultPreview: string
}

type AnalystChatResponse = {
  answer: string
  supportingNumbers: string[]
  sourceFrom: string
  sourceTo: string
  suggestedFollowUps: string[]
  toolCalls?: ToolCallSummary[]
  insight: AiInsight
}

type InvestigationResponse = {
  conclusion: string
  evidence: string[]
  steps: string[]
  confidence: InvestigationConfidence
  sourceFrom: string
  sourceTo: string
  toolCalls?: ToolCallSummary[]
  insight: AiInsight
}

type PromptCategory = {
  key: string
  name: string
  icon: string
  prompts: string[]
}

type QuickPromptsResponse = {
  categories: PromptCategory[]
}

type TodaySummary = {
  carsWashed: number
  ticketRevenue: number
  expensesTotal: number
  result: number
  cashVariance: number | null
}

type TodayResponse = {
  date: string
  brief: AiInsight
  alerts: AiInsight[]
  criticalCount: number
  warningCount: number
  summary: TodaySummary
  previousDay: TodaySummary | null
}

type AiStatusResponse = {
  degraded: boolean
  providerLabel: string | null
  lastCheckAt: string | null
  lastHealthyAt: string | null
  reasonCode: string | null
  detail: string | null
}

type ChatMessage =
  | { id: string; role: 'user'; text: string; mode: 'quick' | 'deep'; ts: number }
  | { id: string; role: 'assistant'; mode: 'quick'; data: AnalystChatResponse; ts: number }
  | { id: string; role: 'assistant'; mode: 'deep'; data: InvestigationResponse; ts: number }
  | { id: string; role: 'assistant'; mode: 'error'; text: string; ts: number }

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
  vehicleSizeId: z.coerce.number().positive('Selecciona un tamaño'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).default('CASH'),
  vehicleDescription: z.string().max(160, 'Maximo 160 caracteres').optional(),
  notes: z.string().max(500, 'Maximo 500 caracteres').optional(),
  courtesy: z.boolean().default(false),
  courtesyReason: z.string().max(500, 'Maximo 500 caracteres').optional(),
  discountPercent: z.coerce.number().min(0, 'Minimo 0').max(100, 'Maximo 100').default(0),
  employeeIds: z.array(z.coerce.number()).min(1, 'Selecciona al menos un lavador'),
  occurredAt: z.string().optional(),
  internalRef: z.string().max(40, 'Maximo 40 caracteres').optional(),
  priceOverride: z.coerce.number().min(0.01, 'Minimo $0.01').optional().or(z.literal('')),
  surchargeAmount: z.coerce.number().min(0, 'Minimo $0').optional().or(z.literal('')),
  surchargeReason: z.string().max(120, 'Maximo 120 caracteres').optional(),
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
  category: z.enum(['AUTO', 'MOTO', 'RAZR', 'PERSONAL']).default('AUTO'),
})

type VehicleSizeFormValues = z.infer<typeof vehicleSizeSchema>

const servicePriceSchema = z.object({
  serviceTypeId: z.coerce.number().positive('Selecciona servicio'),
  vehicleSizeId: z.coerce.number().positive('Selecciona tamaño'),
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
  category: z.enum(['AROMA', 'SNACK', 'OTRO']).default('OTRO'),
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

function money(value: number, currency?: Currency) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency ?? 'MXN' }).format(value)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
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
  '/paquetes':      { title: 'Paquetes',      section: 'Operación' },
  '/gastos':        { title: 'Gastos',        section: 'Operación' },
  '/cierre-dia':    { title: 'Cierre del día',section: 'Operación' },
  '/corte':         { title: 'Corte',         section: 'Operación' },
  '/nomina':        { title: 'Nómina',        section: 'Gestión'   },
  '/inventario':    { title: 'Inventario',    section: 'Gestión'   },
  '/catalogos':     { title: 'Catálogos',     section: 'Gestión'   },
  '/asistencia':    { title: 'Asistencia',    section: 'Gestión'   },
  '/reportes':      { title: 'Reportes',      section: 'Dueño'     },
  '/ai':            { title: 'Análisis IA',  section: 'Dueño'     },
  '/auditoria':     { title: 'Auditoría',     section: 'Dueño'     },
  '/vigilancia':    { title: 'Vigilancia',    section: 'Dueño'     },
}

function routeMeta(pathname: string) {
  return ROUTE_META[pathname] ?? { title: 'Turbo Lavado', section: 'Operación' }
}

function AppShell() {
  const { auth, logout } = useAuth()
  const location = useLocation()
  const isOwner = auth?.user.role === 'DUENO'
  const flaggedCount = useQuery({
    queryKey: ['audit-events', 'flagged'],
    queryFn: () => api<AuditEvent[]>('/api/v1/audit-events/flagged'),
    enabled: Boolean(isOwner),
    refetchInterval: 60_000,
  })

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
          payrollAccess={auth.user.payrollAccess ?? true}
          flaggedCount={isOwner ? (flaggedCount.data?.length ?? 0) : 0}
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
      <MobileTopbar userName={auth.user.fullName} pageTitle={meta.title} />

      <main className="tl-page px-4 pb-24 lg:px-6 lg:pb-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets/nuevo" element={<NewTicketScreen />} />
          <Route path="/tickets" element={<TicketsBrowser />} />
          <Route path="/paquetes" element={<PrepaidPackageScreen />} />
          <Route path="/gastos" element={<ExpenseLedgerScreen />} />
          <Route path="/cierre-dia" element={<EndOfDayScreen />} />
          <Route path="/corte" element={<ShiftCloseScreen />} />
          <Route path="/nomina" element={<RequirePayroll><PayrollScreen /></RequirePayroll>} />
          <Route path="/inventario" element={<RequireRole role="GERENTE"><InventoryScreen /></RequireRole>} />
          <Route path="/ai" element={<RequireRole role="DUENO"><AiScreen /></RequireRole>} />
          <Route path="/reportes" element={<RequireRole role="DUENO"><ReportsScreen /></RequireRole>} />
          <Route path="/auditoria" element={<RequireRole role="DUENO"><AuditScreen /></RequireRole>} />
          <Route path="/vigilancia" element={<RequireRole role="DUENO"><VigilanciaScreen /></RequireRole>} />
          <Route path="/catalogos" element={<RequireRole role="GERENTE"><CatalogsScreen /></RequireRole>} />
          <Route path="/asistencia" element={<RequireRole role="OPERADOR"><AttendanceScreen /></RequireRole>} />
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

          {/* Brand pillars — honest value props, not fake live data */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: 'Tickets',    v: 'al instante',  sub: 'sin Excel, sin papel' },
              { k: 'Nómina',     v: 'automática',   sub: 'domingo a sábado' },
              { k: 'Inventario', v: 'auditable',    sub: 'cada movimiento' },
            ].map(s => (
              <div key={s.k} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur transition hover:border-white/20 hover:bg-white/[0.06]">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-white/50">{s.k}</div>
                <div className="mt-1 text-[15px] font-bold tracking-tight text-white">{s.v}</div>
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
        <div className="tl-login-card w-full max-w-[400px]">
          <div className="tl-login-card-brand-bar" aria-hidden />
          <div className="p-8">
            <div className="mb-7">
              <div className="tl-login-lock">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <h1 className="text-[22px] font-bold tracking-tight text-ink-900" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
                Bienvenido de vuelta
              </h1>
              <p className="mt-1 text-[13px] text-ink-500">Inicia sesión para continuar la operación.</p>
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
              <span className="font-semibold uppercase tracking-wider">roles disponibles</span>
              <div className="h-px flex-1 bg-border-soft" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="gray">OPERADOR</Pill>
              <Pill tone="purple">GERENTE</Pill>
              <Pill tone="good">DUEÑO</Pill>
            </div>
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

function RequirePayroll({ children }: { children: ReactNode }) {
  const { auth, hasRole } = useAuth()
  if (!hasRole('GERENTE') || !(auth?.user.payrollAccess ?? true)) {
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
      setToast('Día abierto')
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

  // ── State 1: No day open ────────────────────────────────────
  if (!day) {
    return (
      <>
        {toast && <Toast message={toast} />}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50/60 p-5">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-300/30 blur-2xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-700">Sin día abierto</p>
                <p className="mt-0.5 text-[15px] font-semibold text-ink-900">Hoy es <span className="font-mono tabular-nums">{today}</span></p>
                <p className="text-[12.5px] text-ink-500">Abre el día para poder capturar tickets.</p>
              </div>
            </div>
            {canAct && (
              <Button
                kind="go"
                size="sm"
                onClick={() => openDayMutation.mutate()}
                disabled={openDayMutation.isPending}
              >
                {openDayMutation.isPending ? 'Abriendo...' : 'Abrir día'}
              </Button>
            )}
          </div>
        </div>
        {openDayMutation.error && <p className="mt-2 text-sm text-rose-700">{openDayMutation.error.message}</p>}
      </>
    )
  }

  // ── State 2: Day open but no active shift ────────────────────
  if (openShifts.length === 0) {
    const matiExists = allShifts.some((s) => s.shiftType === 'MATUTINO')
    const vespeExists = allShifts.some((s) => s.shiftType === 'VESPERTINO')
    return (
      <>
        {toast && <Toast message={toast} />}
        <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-violet-50/60 p-5">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-300/30 blur-2xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-violet-700">Día abierto · sin turno activo</p>
                <p className="mt-0.5 text-[15px] font-semibold text-ink-900">
                  {allShifts.length === 0 ? 'Abre un turno para capturar tickets.' : 'Todos los turnos están cerrados.'}
                </p>
                <p className="text-[12.5px] text-ink-500">Día <span className="font-mono tabular-nums">{day.businessDate}</span></p>
              </div>
            </div>
            {canAct && (
              <div className="flex gap-2">
                {!matiExists && (
                  <Button kind="primary" size="sm" onClick={() => openShiftMutation.mutate('MATUTINO')} disabled={openShiftMutation.isPending}>
                    {openShiftMutation.isPending ? 'Abriendo...' : '+ Matutino'}
                  </Button>
                )}
                {!vespeExists && (
                  <Button kind="secondary" size="sm" onClick={() => openShiftMutation.mutate('VESPERTINO')} disabled={openShiftMutation.isPending}>
                    {openShiftMutation.isPending ? 'Abriendo...' : '+ Vespertino'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        {openShiftMutation.error && <p className="mt-2 text-sm text-rose-700">{openShiftMutation.error.message}</p>}
      </>
    )
  }

  // ── State 3: Day + shifts active ─────────────────────────────
  return (
    <>
      {toast && <Toast message={toast} />}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/40 p-5">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-300/25 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <span className="absolute inset-0 rounded-xl bg-emerald-400/30 animate-ping" />
              <svg className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-700">En operación</p>
              <p className="mt-0.5 text-[15px] font-semibold text-ink-900">
                Día <span className="font-mono tabular-nums">{day.businessDate}</span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {openShifts.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {s.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino'}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canAct && !allShifts.some((s) => s.shiftType === 'VESPERTINO') && (
              <Button kind="secondary" size="sm" onClick={() => openShiftMutation.mutate('VESPERTINO')} disabled={openShiftMutation.isPending}>
                {openShiftMutation.isPending ? 'Abriendo...' : '+ Vespertino'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)
  useEffect(() => {
    const from = valueRef.current
    if (from === target) return
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const elapsed = t - start
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      const current = from + (target - from) * eased
      valueRef.current = current
      setValue(current)
      if (progress < 1) raf = requestAnimationFrame(tick)
      else valueRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

function HeroDelta({ today, yesterday }: { today: number; yesterday: number | undefined }) {
  if (yesterday == null) return null
  if (yesterday === 0 && today === 0) return null
  const diff = today - yesterday
  if (yesterday === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-300">
        nuevo
      </span>
    )
  }
  const pct = Math.round((diff / Math.abs(yesterday)) * 100)
  if (pct === 0) return <span className="text-[11px] text-white/40">igual que ayer</span>
  const up = diff > 0
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold ${
      up ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
    }`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}% vs ayer
    </span>
  )
}

function Dashboard() {
  const [date, setDate] = useState(today)
  const navigate = useNavigate()
  const summary = useQuery({
    queryKey: ['daily-summary', date],
    queryFn: () => api<DailySummary>(`/api/v1/reports/daily-summary?date=${date}`),
  })
  const yesterdayDateObj = new Date(date + 'T00:00:00')
  yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1)
  const yesterday = yesterdayDateObj.toISOString().slice(0, 10)
  const yestSummary = useQuery({
    queryKey: ['daily-summary', yesterday],
    queryFn: () => api<DailySummary>(`/api/v1/reports/daily-summary?date=${yesterday}`),
  })
  const monthStart = today.slice(0, 7) + '-01'
  const monthHist = useQuery({
    queryKey: ['historical-month', monthStart],
    queryFn: () => api<HistoricalRangeResponse>(`/api/v1/reports/historical?from=${monthStart}&to=${today}`),
  })

  const data = summary.data
  const yest = yestSummary.data
  const phaseData = usePhaseData()
  const openShifts = (phaseData.shifts.data ?? []).filter((s) => s.status === 'OPEN')

  const { auth, hasRole } = useAuth()
  const isOwner = hasRole('DUENO')
  const flagged = useQuery({
    queryKey: ['audit-events', 'flagged'],
    queryFn: () => api<AuditEvent[]>('/api/v1/audit-events/flagged'),
    enabled: isOwner,
  })
  const pendingFlagged = flagged.data ?? []

  const isLoading = summary.isLoading
  const MetricVal = ({ v, wide }: { v?: string; wide?: boolean }) =>
    isLoading ? <span className={`tl-metric-skeleton${wide ? ' wide' : ''}`} /> : <>{v}</>

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = auth?.user.fullName.split(' ')[0] ?? ''
  const dateObj = new Date(date + 'T00:00:00')
  const weekday = dateObj.toLocaleDateString('es-MX', { weekday: 'long' })
  const dayMonth = dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
  const dateLong = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dayMonth}`

  const resultPositive = data ? data.result >= 0 : true
  const monthDate = new Date()
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()

  // Animated count-up for hero KPIs
  const animCars = useCountUp(data?.carsWashed ?? 0)
  const animRevenue = useCountUp(data?.ticketRevenue ?? 0)
  const animResult = useCountUp(data?.result ?? 0)

  return (
    <section className="space-y-6">
      {/* ─── Header: greeting + date picker ─────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">{dateLong}</p>
          <h2 className="font-display mt-1 text-[30px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">
            {greeting}{firstName ? `, ${firstName}` : ''}.
          </h2>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400">Ver fecha</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="tl-input" />
        </label>
      </div>

      {/* ─── Owner audit warning ────────────────────────────────────── */}
      {isOwner && pendingFlagged.length > 0 && (
        <NavLink to="/auditoria" className="block no-underline">
          <Banner
            tone="warn"
            title={`${pendingFlagged.length} cambio${pendingFlagged.length === 1 ? '' : 's'} irregular${pendingFlagged.length === 1 ? '' : 'es'} por revisar`}
            text="Cambios grandes de nomina o de pago del personal. Toca para revisar."
            cta={<span className="tl-btn tl-btn-sm tl-btn-secondary" style={{ pointerEvents: 'none' }}>Revisar</span>}
          />
        </NavLink>
      )}

      <DayStatusCard />

      {summary.error && <ErrorMessage message={summary.error.message} />}

      {/* ─── Hero scoreboard ──────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 px-6 py-7 sm:px-9 sm:py-9 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.45)]">
        {/* dot grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* aurora glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute right-6 top-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Turbo Lavado · Resumen</div>

        <div className="relative grid grid-cols-1 gap-7 sm:grid-cols-3 sm:gap-8">
          {/* Carros */}
          <div data-testid="metric-carros-lavados">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white/70">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 16H9m10 0h3v-3.15a1 1 0 00-.84-.99L16 11l-2.7-3.6a1 1 0 00-.8-.4H5.24a2 2 0 00-1.8 1.1l-.8 1.63A6 6 0 002 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>
                </svg>
              </span>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45">Carros lavados</p>
            </div>
            <p data-testid="metric-carros-lavados-value" className="font-display mt-3 text-[52px] font-black leading-none tracking-[-0.03em] text-white tabular-nums">
              {isLoading ? <span className="tl-skeleton-dark lg" /> : Math.round(animCars)}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              {data && yest && <HeroDelta today={data.carsWashed} yesterday={yest.carsWashed} />}
              {data?.courtesyCount ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-white/60">
                  {data.courtesyCount} cortesía{data.courtesyCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </div>

          {/* Ingresos */}
          <div data-testid="metric-ingresos-autos" className="sm:border-l sm:border-white/10 sm:pl-8">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white/70">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>
                </svg>
              </span>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45">Ingresos</p>
            </div>
            <p data-testid="metric-ingresos-autos-value" className="font-display mt-3 text-[52px] font-black leading-none tracking-[-0.03em] text-white tabular-nums">
              {isLoading ? <span className="tl-skeleton-dark lg" /> : money(animRevenue, 'MXN')}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              {data && yest && <HeroDelta today={data.ticketRevenue} yesterday={yest.ticketRevenue} />}
            </div>
          </div>

          {/* Resultado */}
          <div className="sm:border-l sm:border-white/10 sm:pl-8">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white/70">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="20" x2="5" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="19" y1="20" x2="19" y2="14"/>
                </svg>
              </span>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45">Resultado</p>
            </div>
            <p className={`font-display mt-3 text-[52px] font-black leading-none tracking-[-0.03em] tabular-nums ${resultPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isLoading ? <span className="tl-skeleton-dark lg" /> : money(animResult, 'MXN')}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              {data && yest && <HeroDelta today={data.result} yesterday={yest.result} />}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        {openShifts.length > 0 && (
          <div className="relative mt-7 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => navigate('/tickets/nuevo')}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-ink-900 transition-colors hover:bg-white/90"
            >
              <span className="text-[15px] leading-none">+</span> Nuevo ticket
            </button>
            <button
              type="button"
              onClick={() => navigate('/corte')}
              className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Hacer corte
            </button>
            <span className="ml-auto text-[11px] font-medium text-white/40">
              {openShifts.length} turno{openShifts.length === 1 ? '' : 's'} activo{openShifts.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      {/* ─── Secondary metric strip ────────────────────────────────── */}
      <div className="tl-stagger grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric label="Efectivo" value={<MetricVal v={data ? money(data.cashRevenue, 'MXN') : undefined} wide />} variant="success" />
        <Metric label="Tarjeta" value={<MetricVal v={data ? money(data.cardRevenue, 'MXN') : undefined} wide />} variant="info" />
        <Metric label="Deposito" value={<MetricVal v={data ? money(data.transferRevenue, 'MXN') : undefined} wide />} variant="warn" />
        <Metric label="Miscelanea" value={<MetricVal v={data ? money(data.inventorySalesRevenue, 'MXN') : undefined} wide />} />
        <Metric label="Gastos" value={<MetricVal v={data ? money(data.expensesTotal, 'MXN') : undefined} wide />} variant="danger" />
        <Metric
          label="Sobrante/Faltante"
          value={isLoading ? <span className="tl-metric-skeleton wide" /> : (data?.cashVariance == null ? 'Pendiente' : money(data.cashVariance, 'MXN'))}
          variant={data?.cashVariance == null ? 'default' : data.cashVariance >= 0 ? 'success' : 'warn'}
        />
      </div>

      {/* ─── Acumulado del mes ─────────────────────────────────────── */}
      {monthHist.data && (
        <div className="relative overflow-hidden rounded-2xl border border-border-soft bg-gradient-to-r from-ink-50 via-white to-violet-50/40 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-900 text-white font-display text-[13px] font-bold tracking-tight">
                {dateObj.toLocaleDateString('es-MX', { month: 'short' }).slice(0, 3).toUpperCase()}
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">Acumulado del mes</p>
                <p className="mt-0.5 text-[14px] font-semibold text-ink-900">
                  {monthHist.data.totalCars} carros
                  <span className="mx-1.5 text-ink-300">·</span>
                  {money(Number(monthHist.data.totalRevenue), 'MXN')} ingresos
                </p>
                <p className="mt-1 text-[11px] text-ink-400">
                  Día {monthDate.getDate()} de {daysInMonth}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-bold ${
              monthHist.data.totalResultado >= 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}>
              <span className={`h-2 w-2 rounded-full ${monthHist.data.totalResultado >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {money(Number(monthHist.data.totalResultado), 'MXN')}
              <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">resultado</span>
            </div>
          </div>
          {/* progress bar of month */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-emerald-400"
              style={{ width: `${Math.min(100, Math.round((monthDate.getDate() / daysInMonth) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── Tickets recientes ─────────────────────────────────────── */}
      <Panel
        title="Tickets recientes"
        subtitle={data ? `${data.recentTickets.length} en esta fecha` : undefined}
        actions={
          <NavLink to="/tickets" className="text-[12px] font-semibold text-violet-600 no-underline hover:text-violet-700">
            Ver todos →
          </NavLink>
        }
      >
        <div className="overflow-hidden rounded-xl border border-border-soft">
          <table className="tl-tbl zebra">
            <thead>
              <tr>
                <th className="w-16">Hora</th>
                <th>Nota</th>
                <th>Vehiculo</th>
                <th>Servicio</th>
                <th>Lavadores</th>
                <th className="r">Importe</th>
                <th>Pago</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentTickets ?? []).map((ticket) => {
                const occurred = ticket.occurredAt ?? ticket.createdAt
                const timeStr = new Date(occurred).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
                return (
                  <tr key={ticket.id}>
                    <td className="font-mono text-[12px] text-ink-500">{timeStr}</td>
                    <td className="font-semibold">
                      {ticket.internalRef || ticket.notaNumber}
                      <p className="mt-0.5 text-[11px] font-normal text-ink-400">{ticket.notaNumber}</p>
                    </td>
                    <td>
                      <span>{ticket.vehicleDescription || '-'}</span>
                      {ticket.notes && <p className="mt-0.5 text-[11px] text-ink-400">{ticket.notes}</p>}
                    </td>
                    <td>{ticket.serviceTypeName} / {ticket.vehicleSizeName}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {ticket.assignments.map((a) => (
                          <span key={a.employeeId} className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                            {a.employeeName.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="r">{money(ticket.priceAmount, ticket.currency)}</td>
                    <td><PaymentPill ticket={ticket} /></td>
                    <td>
                      <TicketStatusPill ticket={ticket} />
                    </td>
                  </tr>
                )
              })}
              {!summary.isLoading && (data?.recentTickets.length ?? 0) === 0 && (
                <tr className="tl-empty-row">
                  <td colSpan={8}>
                    <div className="tl-empty-icon">
                      <div className="icon-wrap">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      </div>
                      <p>Sin tickets para esta fecha. Crea tickets desde Nuevo ticket.</p>
                    </div>
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

  const result = daily ? Number(daily.result) : null
  const cashVar = daily?.cashVariance == null ? null : Number(daily.cashVariance)

  return (
    <section className="space-y-5">
      <PageHead
        tone="hero"
        title="Cierre del día"
        subtitle="Ruta rápida para terminar el día sin brincar entre pantallas."
      />

      <DayStatusCard />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Panel title="Trabajo de hoy">
            <div className="tl-stagger grid gap-4 md:grid-cols-4">
              {(() => {
                const sk = (wide?: boolean) => <span className={`tl-metric-skeleton${wide ? ' wide' : ''}`} />
                return (
                  <>
                    <Metric label="Tickets" tone="info" value={daily ? String(daily.recentTickets.length) : sk()} />
                    <Metric label="Carros" tone="info" value={daily ? String(daily.carsWashed) : sk()} />
                    <Metric label="Efectivo" tone="good" value={daily ? money(daily.cashRevenue, 'MXN') : sk(true)} />
                    <Metric label="Tarjeta" tone="info" value={daily ? money(daily.cardRevenue, 'MXN') : sk(true)} />
                    <Metric label="Depósito" tone="warn" value={daily ? money(daily.transferRevenue, 'MXN') : sk(true)} />
                    <Metric label="Miscelánea" value={daily ? money(daily.inventorySalesRevenue, 'MXN') : sk(true)} />
                    <Metric label="Gastos" tone="bad" value={daily ? money(daily.expensesTotal, 'MXN') : sk(true)} />
                  </>
                )
              })()}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button kind="primary" onClick={() => navigate('/tickets/nuevo')}>
                Agregar ticket
              </Button>
              <Button kind="secondary" onClick={() => navigate('/gastos')}>
                Revisar salidas
              </Button>
            </div>
          </Panel>

          <Panel title="Turnos">
            <div className="grid gap-3 md:grid-cols-2">
              {shifts.map((shift) => (
                <div key={shift.id} className="tl-panel" style={{ padding: '14px 16px' }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <strong className="text-sm">{shift.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino'}</strong>
                    <StatusPill kind={shift.status === 'OPEN' ? 'Abierto' : 'Cerrado'} />
                  </div>
                  <Button kind="secondary" size="sm" onClick={() => navigate('/corte')}>
                    {shift.status === 'OPEN' ? 'Hacer corte' : 'Ver corte'}
                  </Button>
                </div>
              ))}
              {!data.currentBusinessDay && (
                <Banner tone="warn" title="Abre el día para comenzar." />
              )}
              {data.currentBusinessDay && shifts.length === 0 && (
                <Banner tone="info" title="Abre un turno para capturar tickets." />
              )}
            </div>
          </Panel>
        </div>

        <aside>
          <Panel tone="feature" title="Resumen final">
            <SummaryRow label="Turnos abiertos" value={String(openShifts.length)} />
            <SummaryRow label="Turnos cerrados" value={String(closedShifts.length)} />
            <SummaryRow
              label="Resultado"
              value={daily ? money(daily.result, 'MXN') : <span className="tl-skeleton-dark sm" />}
              vTone={result == null ? undefined : result >= 0 ? 'good' : 'bad'}
            />
            <SummaryRow
              label="Diferencia caja"
              value={!daily ? <span className="tl-skeleton-dark sm" /> : cashVar == null ? 'Pendiente' : money(daily.cashVariance, 'MXN')}
              vTone={cashVar == null ? undefined : cashVar >= 0 ? 'good' : 'bad'}
            />
            <div className="mt-4">
              <Button kind="primary" size="lg" block disabled={openShifts.length === 0} onClick={() => navigate('/corte')}>
                Cerrar turno abierto
              </Button>
            </div>
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
  const [chatMode, setChatMode] = useState<'quick' | 'deep'>('quick')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [showPrompts, setShowPrompts] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Aggregated today endpoint — brief + alerts + day summary in one call
  const todayData = useQuery({
    queryKey: ['ai-today', date],
    queryFn: () => api<TodayResponse>(`/api/v1/ai/today?date=${date}`),
  })

  // Recent history (last 30 days, capped to 20 displayed)
  const history = useQuery({
    queryKey: ['ai-insights', 'history', date],
    queryFn: () => {
      const from = new Date(date + 'T00:00:00')
      from.setDate(from.getDate() - 30)
      const fromIso = from.toISOString().slice(0, 10)
      return api<AiInsight[]>(`/api/v1/ai/insights?from=${fromIso}&to=${date}`)
    },
  })

  // Quick-prompt library
  const prompts = useQuery({
    queryKey: ['ai-quick-prompts'],
    queryFn: () => api<QuickPromptsResponse>('/api/v1/ai/quick-prompts'),
  })

  // Provider health — drives the "AI degraded" banner so we never silently
  // serve fallback responses without telling the operator.
  const aiStatus = useQuery<AiStatusResponse>({
    queryKey: ['ai-status'],
    queryFn: () => api<AiStatusResponse>('/api/v1/ai/status'),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })

  // 7-day demand forecast — DUENO-only; surfaced above the chat panel.
  const forecast = useQuery<ForecastResponse>({
    queryKey: ['ai-forecast', 'upcoming'],
    queryFn: () => api<ForecastResponse>('/api/v1/ai/forecast/upcoming?days=7'),
    retry: false,
  })

  const recomputeForecast = useMutation({
    mutationFn: () => api<ForecastResponse>('/api/v1/ai/forecast/run?days=7', { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-forecast'] })
      await invalidateAi(queryClient)
    },
  })

  const deepPromptCategories: PromptCategory[] = [
    {
      key: 'caja',
      name: 'Caja y diferencias',
      icon: '🔍',
      prompts: [
        '¿Por qué hay diferencia de caja recurrente en el turno vespertino?',
        '¿Hay un patrón en los días con faltante?',
        '¿Qué turno tiene más inconsistencias de caja históricamente?',
      ],
    },
    {
      key: 'fraude',
      name: 'Fraude y anomalías',
      icon: '🚨',
      prompts: [
        '¿Hay lavadores con cortesías inusuales esta semana?',
        '¿Hay concentración sospechosa de tickets anulados en algún turno?',
        '¿Algún lavador tiene tickets de precio muy bajo comparado con los demás?',
        '¿Hay tickets con descuentos altos que no tienen autorización clara?',
      ],
    },
    {
      key: 'ingresos',
      name: 'Ingresos y tendencias',
      icon: '📉',
      prompts: [
        '¿Qué explica la caída de ingresos comparando este mes con el anterior?',
        '¿Por qué bajaron los carros lavados esta semana?',
        'Investiga si los ingresos bajan en días específicos y por qué.',
        '¿Hay servicios que se dejaron de vender o bajaron mucho?',
      ],
    },
    {
      key: 'lavadores',
      name: 'Rendimiento de lavadores',
      icon: '👤',
      prompts: [
        '¿Hay lavadores cuyo rendimiento bajó significativamente?',
        '¿Qué lavador tiene más ausencias y cómo afecta los ingresos?',
        'Compara el rendimiento por turno e identifica irregularidades.',
      ],
    },
  ]

  const refreshBrief = useMutation({
    mutationFn: () => api<AiInsight>(`/api/v1/ai/briefs/daily?date=${date}&force=true`, { method: 'POST' }),
    onSuccess: async () => {
      await invalidateAi(queryClient)
    },
  })

  const ask = useMutation({
    mutationFn: async ({ message, mode }: { message: string; mode: 'quick' | 'deep' }) => {
      if (mode === 'quick') {
        return { mode, data: await api<AnalystChatResponse>('/api/v1/ai/chat', {
          method: 'POST',
          body: JSON.stringify({ message, from: date, to: date }),
        }) } as const
      }
      return { mode, data: await api<InvestigationResponse>('/api/v1/ai/investigations', {
        method: 'POST',
        body: JSON.stringify({ question: message, from: date, to: date }),
      }) } as const
    },
    onSuccess: async (result) => {
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        mode: result.mode,
        // Cast is fine — discriminated union by mode handles the rest
        data: result.data as never,
        ts: Date.now(),
      }])
      await invalidateAi(queryClient)
    },
    onError: (err: Error) => {
      setMessages((prev) => [...prev, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        mode: 'error',
        text: err.message,
        ts: Date.now(),
      }])
    },
  })

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, ask.isPending])

  const submitMessage = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || ask.isPending) return
    const mode = chatMode
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: trimmed, mode, ts: Date.now() }])
    setInput('')
    setShowPrompts(false)
    ask.mutate({ message: trimmed, mode })
  }

  const today_ = todayData.data
  const alerts = today_?.alerts ?? []
  const critical = today_?.criticalCount ?? 0
  const warnings = today_?.warningCount ?? 0
  const historyRows = (history.data ?? []).filter((i) => i.featureType !== 'ANOMALY_ALERT' && i.featureType !== 'DAILY_BRIEF')

  return (
    <section className="space-y-5">
      {/* ─── Editorial header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Asistente · {today_?.date ?? date}
          </p>
          <h2 className="font-display mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">
            AI Command Center
          </h2>
          <p className="mt-1 text-[12.5px] text-ink-500 max-w-xl">
            Pregúntale al asistente, revisa el brief del día y las alertas. La AI guarda insights pero no modifica
            tickets, caja, gastos, nómina ni inventario.
          </p>
        </div>
        <div className="flex items-end gap-3">
          {(critical > 0 || warnings > 0) && (
            <div className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold ${
              critical > 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <span className={`relative flex h-2 w-2`}>
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${critical > 0 ? 'bg-rose-400' : 'bg-amber-400'} opacity-75`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${critical > 0 ? 'bg-rose-500' : 'bg-amber-500'}`} />
              </span>
              {critical > 0 ? `${critical} crítica${critical === 1 ? '' : 's'}` : `${warnings} alerta${warnings === 1 ? '' : 's'}`}
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400">Fecha</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="tl-input" />
          </label>
        </div>
      </div>

      <ForecastPanel
        data={forecast.data}
        isLoading={forecast.isLoading}
        error={forecast.error as Error | null}
        onRecompute={() => recomputeForecast.mutate()}
        isRecomputing={recomputeForecast.isPending}
      />

      {aiStatus.data?.degraded && <AiDegradedBanner status={aiStatus.data} />}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        {/* ─── Main chat panel ─────────────────────────────────── */}
        <div className="tl-panel overflow-hidden flex flex-col" style={{ minHeight: 580 }}>
          {/* Chat header — mode toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft bg-ink-50/60 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-violet-600 to-violet-800 text-white shadow-[0_2px_8px_rgba(124,58,237,0.30)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.6 4 4 1.6-4 1.6L12 14l-1.6-4-4-1.6 4-1.6L12 3z" />
                  <path d="M19 14l.8 2 2 .8-2 .8L19 20l-.8-2-2-.8 2-.8z" />
                </svg>
              </span>
              <div>
                <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">Asistente</h3>
                <p className="text-[10.5px] text-ink-500">
                  {chatMode === 'quick' ? 'Respuestas rápidas con números visibles' : 'Investigación profunda con evidencia y pasos'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white border border-border-soft p-1">
              <button
                type="button"
                onClick={() => setChatMode('quick')}
                title="Respuestas rápidas"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                  chatMode === 'quick' ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'
                }`}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
                </svg>
                Rápido
              </button>
              <button
                type="button"
                onClick={() => setChatMode('deep')}
                title="Investigación con evidencia"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                  chatMode === 'deep' ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50'
                }`}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                Profundo
              </button>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setMessages([]); setInput('') }}
                  title="Limpiar conversación"
                  aria-label="Limpiar conversación"
                  className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Messages scroll area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: 520 }}>
            {messages.length === 0 && !ask.isPending && (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center py-3">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-violet-600 to-violet-800 text-white shadow-[0_8px_24px_-8px_rgba(124,58,237,0.5)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l1.6 4 4 1.6-4 1.6L12 14l-1.6-4-4-1.6 4-1.6L12 3z" />
                      <path d="M19 14l.8 2 2 .8-2 .8L19 20l-.8-2-2-.8 2-.8z" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-bold text-ink-900">¿En qué te puedo ayudar hoy?</p>
                  <p className="mt-1 max-w-sm text-[12.5px] text-ink-500">
                    Pregunta sobre ventas, lavadores, caja o inventario. Usa <strong>Profundo</strong> para
                    investigación con evidencia paso a paso.
                  </p>
                </div>
                {/* Inline prompt categories */}
                {(chatMode === 'deep' ? deepPromptCategories : prompts.data?.categories) && (
                  <div className="space-y-3.5">
                    {(chatMode === 'deep' ? deepPromptCategories : prompts.data!.categories).map((cat) => (
                      <div key={cat.key}>
                        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                          <span className="mr-1">{cat.icon}</span>{cat.name}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.prompts.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => submitMessage(p)}
                              disabled={ask.isPending}
                              className="rounded-full border border-border-soft bg-white px-3 py-1 text-[11.5px] text-ink-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m) => (
              <AiChatMessage key={m.id} msg={m} onAskAgain={(q) => { setInput(q); setShowPrompts(false) }} />
            ))}

            {ask.isPending && (
              <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '120ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '240ms' }} />
                </span>
                Asistente está pensando…
              </div>
            )}
          </div>

          {/* Quick prompts (re-openable once chat has started) */}
          {showPrompts && messages.length > 0 && (chatMode === 'deep' || prompts.data) && (
            <div className="border-t border-border-soft bg-ink-50/40 p-4 space-y-3 max-h-[260px] overflow-y-auto">
              {(chatMode === 'deep' ? deepPromptCategories : prompts.data!.categories).map((cat) => (
                <div key={cat.key}>
                  <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                    <span className="mr-1">{cat.icon}</span>{cat.name}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.prompts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => submitMessage(p)}
                        disabled={ask.isPending}
                        className="rounded-full border border-border-soft bg-white px-3 py-1 text-[11.5px] text-ink-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); submitMessage(input) }}
            className="border-t border-border-soft bg-white p-4 space-y-2"
          >
            <div className="flex items-end gap-2">
              <AutoTextarea
                value={input}
                onChange={setInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submitMessage(input)
                  }
                }}
                placeholder={chatMode === 'quick' ? 'Pregunta rápida — ej. ¿Cómo fue el día?' : 'Pregunta profunda — ej. ¿Qué explica la diferencia de caja?'}
                disabled={ask.isPending}
                minRows={2}
                maxRows={6}
                className="flex-1"
              />
              <Button
                kind={chatMode === 'deep' ? 'go' : 'primary'}
                type="submit"
                loading={ask.isPending}
                disabled={!input.trim()}
              >
                {chatMode === 'quick' ? 'Preguntar' : 'Investigar'}
              </Button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-400">
              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowPrompts((v) => !v)}
                  className="font-semibold text-primary-600 hover:text-primary-700"
                >
                  {showPrompts ? 'Cerrar sugerencias' : 'Mostrar sugerencias'}
                </button>
              ) : <span />}
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-border-soft bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-700 shadow-sm">Enter</kbd>
                enviar
                <span className="text-ink-300">·</span>
                <kbd className="rounded border border-border-soft bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-700 shadow-sm">⇧+Enter</kbd>
                salto
              </span>
            </div>
          </form>
        </div>

        {/* ─── Right rail: Today + Alerts + Bitácora ─────────── */}
        <aside className="space-y-4">
          <AiTodayCard
            today={today_}
            loading={todayData.isLoading}
            onReloadBrief={() => refreshBrief.mutate()}
            reloading={refreshBrief.isPending}
            briefError={refreshBrief.error?.message}
          />
          <AiAlertsCard alerts={alerts} loading={todayData.isLoading} />
          <AiHistoryCard rows={historyRows} loading={history.isLoading} />
        </aside>
      </div>
    </section>
  )
}

// ── Demand forecast panel ──────────────────────────────────────
// Renders 7 day-cards with predicted cars and revenue plus a low/high band.
// Backtest MAPE is shown when at least 5 prior days of forecasts exist to compare.
const FORECAST_DOW_LABELS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

function ForecastPanel({
  data,
  isLoading,
  error,
  onRecompute,
  isRecomputing,
}: {
  data: ForecastResponse | undefined
  isLoading: boolean
  error: Error | null
  onRecompute: () => void
  isRecomputing: boolean
}) {
  const empty = !isLoading && !data && error
  return (
    <div className="tl-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft bg-ink-50/60 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700 text-white shadow-[0_2px_8px_rgba(2,132,199,0.30)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M14 7h7v7" />
            </svg>
          </span>
          <div>
            <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">Pronóstico de demanda</h3>
            <p className="text-[10.5px] text-ink-500">
              {data
                ? `7 días desde ${data.snapshotDate} · ${formatForecastAccuracy(data)}`
                : 'Aún no se ha generado un pronóstico'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRecompute}
          disabled={isRecomputing}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3.5 py-1.5 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:bg-ink-800 disabled:opacity-50"
        >
          {isRecomputing ? 'Recalculando…' : 'Recalcular'}
        </button>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <p className="text-[12px] text-ink-500">Cargando pronóstico…</p>
        ) : empty ? (
          <p className="text-[12px] text-ink-500">
            No hay datos suficientes todavía. Presiona <span className="font-semibold">Recalcular</span> para generar el primer pronóstico.
          </p>
        ) : data ? (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {data.points.map((p) => (
              <ForecastDayCard key={p.date} point={p} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ForecastDayCard({ point }: { point: ForecastPointResponse }) {
  const d = new Date(point.date + 'T00:00:00')
  const dow = FORECAST_DOW_LABELS[(d.getDay() + 6) % 7]
  const day = d.getDate()
  const precip = point.expectedPrecipitationMm ?? null
  const tempMax = point.expectedTempMaxC ?? null
  const hasRain = precip != null && precip >= 1
  return (
    <div className="min-w-[120px] flex-1 rounded-xl border border-border-soft bg-white px-3 py-3 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">{dow}</span>
        <span className="text-[11px] font-semibold text-ink-500">{day}</span>
      </div>
      <div className="mt-2 text-[24px] font-bold leading-none tracking-[-0.02em] text-ink-900">
        {point.predictedCars}
      </div>
      <div className="text-[10.5px] text-ink-400">carros estimados</div>
      <div className="mt-2 text-[12px] font-semibold text-ink-700">
        ${formatPesos(point.predictedRevenueMxn)}
      </div>
      <div className="mt-1 text-[10px] text-ink-400">
        {point.predictedCarsLow}–{point.predictedCarsHigh} · ${formatPesosShort(point.predictedRevenueMxnLow)}–${formatPesosShort(point.predictedRevenueMxnHigh)}
      </div>
      {(hasRain || tempMax != null) && (
        <div className="mt-2 flex items-center gap-1.5 border-t border-border-soft pt-1.5 text-[10px] text-ink-500">
          {hasRain && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-sky-600">
              <span aria-hidden>🌧</span> {precip!.toFixed(1)}mm
            </span>
          )}
          {tempMax != null && (
            <span className="inline-flex items-center text-ink-400">
              {hasRain ? '·' : ''} {Math.round(tempMax)}°C
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function formatPesos(value: number): string {
  return Math.round(value).toLocaleString('es-MX')
}

function formatPesosShort(value: number): string {
  if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return Math.round(value).toString()
}

function formatForecastAccuracy(data: ForecastResponse): string {
  const carsMape = data.carsBacktestMape
  if (carsMape == null) return 'precisión: aún sin historial'
  return `precisión últimos 30 días: ±${Math.round(carsMape * 100)}%`
}

// ── Single chat message ────────────────────────────────────────
// Lightweight markdown renderer — **bold**, *italic*, `- ` bullets at line start.
// No external dependency; HTML-escapes the input first.
function AiMarkdown({ text }: { text: string }) {
  const esc = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // Bold
  const inline = (s: string) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')

  const lines = text.split(/\n/)
  const blocks: { type: 'p' | 'ul'; items: string[] }[] = []
  let currentUl: string[] | null = null
  for (const raw of lines) {
    const m = raw.match(/^\s*[-•]\s+(.*)$/)
    if (m) {
      if (!currentUl) {
        currentUl = []
        blocks.push({ type: 'ul', items: currentUl })
      }
      currentUl.push(m[1])
    } else {
      currentUl = null
      if (raw.trim()) blocks.push({ type: 'p', items: [raw] })
    }
  }

  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.type === 'p' ? (
          <p key={i} className="text-[13.5px] leading-6 text-ink-800" dangerouslySetInnerHTML={{ __html: inline(b.items[0]) }} />
        ) : (
          <ul key={i} className="space-y-1 text-[12.5px] leading-5 text-ink-700">
            {b.items.map((item, j) => (
              <li key={j} className="flex items-start gap-1.5">
                <span className="text-violet-400 mt-0.5">·</span>
                <span dangerouslySetInnerHTML={{ __html: inline(item) }} />
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

// Auto-resize textarea — grows from minRows to maxRows as content grows
function AutoTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  minRows = 2,
  maxRows = 6,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  disabled?: boolean
  minRows?: number
  maxRows?: number
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 20
    const minH = minRows * lineHeight + 16
    const maxH = maxRows * lineHeight + 16
    const next = Math.min(maxH, Math.max(minH, el.scrollHeight))
    el.style.height = `${next}px`
  }, [value, minRows, maxRows])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={minRows}
      className={`tl-input resize-none ${className}`}
      style={{ overflow: 'hidden' }}
    />
  )
}

// Delta chip for "vs ayer" comparisons
function AiVsYesterday({ today, yesterday }: { today: number; yesterday: number | null | undefined; isMoney?: boolean }) {
  if (yesterday == null) return null
  if (yesterday === 0 && today === 0) return null
  if (yesterday === 0) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-good-100 px-1.5 py-0.5 text-[9.5px] font-bold text-good-700">nuevo</span>
  }
  const diff = today - yesterday
  const pct = Math.round((diff / Math.abs(yesterday)) * 100)
  if (pct === 0) return <span className="text-[10px] text-ink-400">igual</span>
  const up = diff > 0
  // Caller decides whether "up" is good or bad — we just show direction.
  // For result/cars (up=good), the colors read naturally. Expenses are not
  // currently shown with this chip; if added, the caller can wrap with a
  // sign flip.
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${
      up ? 'bg-good-100 text-good-700' : 'bg-bad-100 text-bad-700'
    }`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  )
}

// Shared trace card used by both chat answers and investigations. Renders a
// collapsed badge ("3 consultas — Llamó a Resumen del día, Diferencia de caja")
// and an expanded per-call breakdown. Uses the friendly tool labels so the
// owner sees "Inventario" rather than "get_inventory_snapshot".
function AiToolCallTrace({ toolCalls }: { toolCalls: ToolCallSummary[] }) {
  if (toolCalls.length === 0) return null
  const labels = toolCalls.map((t) => toolLabel(t.name))
  return (
    <details className="rounded-xl bg-white p-3 ring-1 ring-border-soft">
      <summary className="cursor-pointer list-none text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400 hover:text-ink-700">
        <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700 ring-1 ring-primary-100">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M9.4 16.6L4.8 12l4.6-4.6M14.6 7.4l4.6 4.6-4.6 4.6"/></svg>
          {toolCalls.length} {toolCalls.length === 1 ? 'consulta' : 'consultas'}
        </span>
        Llamó a {labels.join(', ')}
      </summary>
      <ul className="mt-2.5 space-y-2 text-[11.5px] leading-5 text-ink-700">
        {toolCalls.map((t, i) => (
          <li key={i} className="rounded-lg bg-ink-50/60 p-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[11.5px] font-semibold text-primary-700">{toolLabel(t.name)}</span>
              <span className="font-mono text-[10px] text-ink-400">{t.name}</span>
            </div>
            <div className="mt-0.5 font-mono text-[10.5px] text-ink-500 break-all">args {JSON.stringify(t.arguments)}</div>
            <div className="mt-1 font-mono text-[10.5px] text-ink-600 break-all">{t.resultPreview}</div>
          </li>
        ))}
      </ul>
    </details>
  )
}

function AiChatMessage({ msg, onAskAgain }: { msg: ChatMessage; onAskAgain: (q: string) => void }) {
  const time = new Date(msg.ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })

  if (msg.role === 'user') {
    return (
      <div className="flex items-start justify-end gap-2.5">
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-gradient-to-br from-primary-600 to-primary-700 px-4 py-2.5 text-[13.5px] text-white shadow-[0_2px_8px_-2px_rgba(124,58,237,0.35)]">
          <p className="whitespace-pre-wrap leading-6">{msg.text}</p>
          <p className="mt-1 text-[10px] text-white/55 text-right">
            <span className="font-semibold uppercase tracking-wider">{msg.mode === 'quick' ? 'Rápido' : 'Profundo'}</span> · {time}
          </p>
        </div>
      </div>
    )
  }

  if (msg.mode === 'error') {
    return (
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">!</div>
        <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-rose-50 px-4 py-2.5 text-[13.5px] text-rose-700 ring-1 ring-rose-100">
          <p>{msg.text}</p>
          <p className="mt-1 text-[10px] text-rose-500">Error · {time}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-violet-600 to-violet-800 text-white shadow-[0_2px_8px_rgba(124,58,237,0.35)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.6 4 4 1.6-4 1.6L12 14l-1.6-4-4-1.6 4-1.6L12 3z" />
          <path d="M19 14l.8 2 2 .8-2 .8L19 20l-.8-2-2-.8 2-.8z" />
        </svg>
      </div>
      <div className="max-w-[88%] flex-1 space-y-3 rounded-2xl rounded-tl-md bg-ink-50 px-4 py-3 ring-1 ring-border-soft">
        {msg.mode === 'quick' ? (
          <>
            <AiMarkdown text={msg.data.answer} />
            {msg.data.toolCalls && <AiToolCallTrace toolCalls={msg.data.toolCalls} />}
            {msg.data.supportingNumbers.length > 0 && (
              <div className="rounded-xl bg-white p-3 ring-1 ring-border-soft">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">Números usados</p>
                <ul className="mt-1.5 space-y-1 text-[12.5px] leading-5 text-ink-700">
                  {msg.data.supportingNumbers.map((n, i) => (
                    <li key={i} className="flex items-start gap-1.5"><span className="text-violet-400 mt-0.5">·</span>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {msg.data.suggestedFollowUps.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">Siguiente pregunta</p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.data.suggestedFollowUps.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onAskAgain(q)}
                      className="rounded-full border border-border-soft bg-white px-3 py-1 text-[11.5px] text-ink-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1"><AiMarkdown text={msg.data.conclusion} /></div>
              <div className="shrink-0">
                <Pill tone={msg.data.confidence === 'HIGH' ? 'good' : msg.data.confidence === 'MEDIUM' ? 'warn' : 'bad'}>
                  {msg.data.confidence === 'HIGH' ? 'Alta' : msg.data.confidence === 'MEDIUM' ? 'Media' : 'Baja'} confianza
                </Pill>
              </div>
            </div>
            {msg.data.toolCalls && msg.data.toolCalls.length > 0 ? (
              <AiToolCallTrace toolCalls={msg.data.toolCalls} />
            ) : msg.data.steps.length > 0 ? (
              // Fallback path (no LLM key configured) — toolCalls is empty and the
              // backend seeds steps[0] with a "Sin acceso al LLM" marker. Show it as a
              // small note so the user knows why the trace is bare.
              <p className="rounded-xl bg-ink-50/60 p-3 text-[11.5px] italic text-ink-500 ring-1 ring-border-soft">
                {msg.data.steps[0]}
              </p>
            ) : null}
          </>
        )}
        <p className="text-[10px] text-ink-400">{time}</p>
      </div>
    </div>
  )
}

// Shared right-rail card chrome. The three AI rail cards (Today, Alerts,
// History) all share the same border-bottom header with a colored rail,
// title, and optional right-side slot.
// Banner shown when the upstream AI provider is degraded. Polled every 30s
// from /api/v1/ai/status. Without this, the deterministic local fallback
// served generic template responses silently and the operator had no way to
// know the real LLM was down.
function AiDegradedBanner({ status }: { status: AiStatusResponse }) {
  const reason = (() => {
    switch (status.reasonCode) {
      case 'disabled':       return 'AI deshabilitada en la configuración.'
      case 'no-api-key':     return 'Falta la API key del proveedor.'
      case 'misconfigured':  return 'Proveedor mal configurado.'
      case 'empty-response': return 'El proveedor respondió vacío.'
      default: {
        if (!status.reasonCode) return 'Usando respuestas locales.'
        if (status.reasonCode.startsWith('http-')) {
          const code = status.reasonCode.slice(5)
          if (code === '401' || code === '403') return 'Clave de API inválida o sin permisos.'
          if (code === '404') return 'El modelo configurado no existe o no tienes acceso.'
          if (code === '429') return 'Sin crédito o límite de uso alcanzado en el proveedor.'
          if (code.startsWith('5')) return 'El proveedor está caído (error ' + code + ').'
          return 'El proveedor respondió con error ' + code + '.'
        }
        return 'Falla del proveedor (' + status.reasonCode + ').'
      }
    }
  })()
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[12.5px] text-amber-900">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-bold">!</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">AI fuera de línea — usando respuestas locales.</p>
        <p className="mt-0.5 text-amber-800">
          {reason}
          {status.providerLabel && <span className="ml-1.5 text-[11px] text-amber-700">· {status.providerLabel}</span>}
        </p>
        {status.detail && (
          <p className="mt-1 text-[11px] font-mono text-amber-700 break-all opacity-80">{status.detail}</p>
        )}
      </div>
    </div>
  )
}

function AiRailCard({
  title,
  rail,
  action,
  children,
  className = '',
}: {
  title: string
  rail: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`tl-panel overflow-hidden ${className}`.trim()}>
      <div className="flex items-center justify-between gap-2.5 border-b border-border-soft bg-ink-50/60 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className={`h-[18px] w-[3px] rounded-full bg-gradient-to-b ${rail}`} />
          <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Today / Brief rail card ─────────────────────────────────────
function AiTodayCard({
  today,
  loading,
  onReloadBrief,
  reloading,
  briefError,
}: {
  today?: TodayResponse
  loading: boolean
  onReloadBrief: () => void
  reloading: boolean
  briefError?: string
}) {
  const summaryLines = today?.brief ? aiSummaryLines(today.brief.summary) : []
  return (
    <AiRailCard
      title="Brief del día"
      rail="from-violet-500 to-violet-700"
      action={(
        <button
          type="button"
          onClick={onReloadBrief}
          disabled={reloading}
          className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
        >
          {reloading ? 'Generando…' : '↻ Recargar'}
        </button>
      )}
    >
      <div className="p-4 space-y-3">
        {loading && !today && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg bg-ink-50/60 px-3 py-2">
                  <span className="tl-metric-skeleton narrow" />
                  <div className="mt-1.5"><span className="tl-metric-skeleton wide" /></div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="tl-metric-skeleton" style={{ width: `${80 - i * 10}%`, display: 'block' }} />
              ))}
            </div>
          </>
        )}
        {briefError && <p className="rounded-lg bg-bad-50 p-2 text-[12px] text-bad-700">{briefError}</p>}
        {today && (
          <>
            {/* Day-summary mini-stats with vs-ayer deltas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-ink-50/60 px-3 py-2">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Carros</p>
                  <AiVsYesterday today={today.summary.carsWashed} yesterday={today.previousDay?.carsWashed} />
                </div>
                <p className="font-display text-[18px] font-bold leading-none tabular-nums text-ink-900 mt-0.5">{today.summary.carsWashed}</p>
              </div>
              <div className="rounded-lg bg-ink-50/60 px-3 py-2">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Resultado</p>
                  <AiVsYesterday today={today.summary.result} yesterday={today.previousDay?.result} isMoney />
                </div>
                <p className={`font-display text-[18px] font-bold leading-none tabular-nums mt-0.5 ${today.summary.result >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {money(today.summary.result, 'MXN')}
                </p>
              </div>
              <div className="rounded-lg bg-ink-50/60 px-3 py-2">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Ingresos</p>
                  <AiVsYesterday today={today.summary.ticketRevenue} yesterday={today.previousDay?.ticketRevenue} isMoney />
                </div>
                <p className="font-display text-[18px] font-bold leading-none tabular-nums text-ink-900 mt-0.5">
                  {money(today.summary.ticketRevenue, 'MXN')}
                </p>
              </div>
              <div className="rounded-lg bg-ink-50/60 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Dif. Caja</p>
                {today.summary.cashVariance == null
                  ? <p className="font-display text-[15px] font-bold leading-none tabular-nums text-ink-400 mt-0.5">Pendiente</p>
                  : <p className={`font-display text-[18px] font-bold leading-none tabular-nums mt-0.5 ${today.summary.cashVariance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {money(today.summary.cashVariance, 'MXN')}
                    </p>
                }
              </div>
            </div>
            {summaryLines.length > 0 && (
              <ul className="space-y-1 text-[12.5px] leading-5 text-ink-700">
                {summaryLines.slice(0, 5).map((line, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-violet-400 mt-0.5">·</span>{line}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </AiRailCard>
  )
}

// ── Alerts rail card ───────────────────────────────────────────
function AiAlertsCard({ alerts, loading }: { alerts: AiInsight[]; loading: boolean }) {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL')
  if (loading && alerts.length === 0) return null
  if (!loading && alerts.length === 0) {
    return (
      <AiRailCard title="Alertas" rail="from-emerald-400 to-emerald-600">
        <div className="p-4 flex items-center gap-2 text-[12.5px] text-good-700">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-good-100 text-good-700">✓</span>
          Sin alertas para hoy.
        </div>
      </AiRailCard>
    )
  }
  const sorted = [...alerts].sort((a, b) => {
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 }
    return order[a.severity] - order[b.severity]
  })
  const counts = {
    ALL: sorted.length,
    CRITICAL: sorted.filter((a) => a.severity === 'CRITICAL').length,
    WARNING: sorted.filter((a) => a.severity === 'WARNING').length,
  }
  const visible = filter === 'ALL' ? sorted : sorted.filter((a) => a.severity === filter)
  const topSeverity = sorted[0]?.severity
  const colorMap = topSeverity === 'CRITICAL'
    ? 'from-rose-400 to-rose-600'
    : topSeverity === 'WARNING'
    ? 'from-amber-400 to-amber-600'
    : 'from-violet-400 to-violet-600'
  return (
    <AiRailCard
      title="Alertas"
      rail={colorMap}
      action={(
        <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold text-ink-700">
          {visible.length}{filter !== 'ALL' && `/${counts.ALL}`}
        </span>
      )}
    >
      {/* Severity filter tabs */}
      <div className="flex items-center gap-1 border-b border-border-soft px-4 py-2">
        {([
          { id: 'ALL' as const, label: 'Todas', count: counts.ALL },
          { id: 'CRITICAL' as const, label: 'Críticas', count: counts.CRITICAL },
          { id: 'WARNING' as const, label: 'Avisos', count: counts.WARNING },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            disabled={t.count === 0 && t.id !== 'ALL'}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold transition-colors ${
              filter === t.id
                ? t.id === 'CRITICAL' ? 'bg-rose-600 text-white' : t.id === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-ink-900 text-white'
                : 'text-ink-500 hover:bg-ink-100 disabled:opacity-40 disabled:hover:bg-transparent'
            }`}
          >
            {t.label}
            <span className={`text-[9.5px] font-bold ${filter === t.id ? 'opacity-80' : 'opacity-60'}`}>{t.count}</span>
          </button>
        ))}
      </div>
      <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
        {visible.map((a) => <AiInsightCard key={a.id} insight={a} compact />)}
        {visible.length === 0 && (
          <p className="text-[12px] text-ink-400 text-center py-4">Sin alertas de este tipo.</p>
        )}
      </div>
    </AiRailCard>
  )
}

// ── History rail card ──────────────────────────────────────────
function AiHistoryCard({ rows, loading }: { rows: AiInsight[]; loading: boolean }) {
  if (loading || rows.length === 0) return null
  return (
    <AiRailCard title="Bitácora reciente" rail="from-ink-400 to-ink-600">
      <div className="p-4 space-y-2 max-h-[360px] overflow-y-auto">
        {rows.slice(0, 8).map((insight) => <AiInsightCard key={insight.id} insight={insight} compact />)}
      </div>
    </AiRailCard>
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

function toLocalTimeValue(isoString?: string | null): string {
  const d = isoString ? new Date(isoString) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localTimeToIso(timeStr: string, baseDate: string): string {
  return new Date(`${baseDate}T${timeStr}:00`).toISOString()
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
  const [lavadorQuery, setLavadorQuery] = useState('')
  const [lavadorFocused, setLavadorFocused] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(() =>
    Boolean(
      ticket && (
        (ticket.discountPercent ?? 0) > 0 ||
        ticket.courtesy ||
        ticket.priceOverride != null
      ),
    ),
  )
  const data = usePhaseData()
  const openShifts = (data.shifts.data ?? []).filter((shift) => shift.status === 'OPEN')
  const defaultShift = openShifts[0]

  // Stable defaults — only recomputed when ticket.id changes to prevent form reset on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formDefaults = useMemo(() => ({
    businessDayId: ticket?.businessDayId ?? data.currentBusinessDay?.id ?? 0,
    shiftId: ticket?.shiftId ?? defaultShift?.id ?? 0,
    serviceTypeId: ticket?.serviceTypeId ?? 0,
    vehicleSizeId: ticket?.vehicleSizeId ?? 0,
    paymentMethod: (ticket?.paymentMethod ?? 'CASH') as 'CASH' | 'CARD' | 'TRANSFER',
    vehicleDescription: ticket?.vehicleDescription ?? '',
    notes: ticket?.notes ?? '',
    courtesy: ticket?.courtesy ?? false,
    courtesyReason: ticket?.courtesyReason ?? '',
    discountPercent: ticket?.discountPercent ?? 0,
    employeeIds: ticket?.assignments.map((a) => a.employeeId) ?? [],
    occurredAt: toLocalTimeValue(ticket?.occurredAt),
    internalRef: ticket?.internalRef ?? '',
    priceOverride: (ticket?.priceOverride ? Number(ticket.priceOverride) : '') as number | '',
    surchargeAmount: (ticket?.surchargeAmount && Number(ticket.surchargeAmount) > 0
      ? Number(ticket.surchargeAmount) : '') as number | '',
    surchargeReason: ticket?.surchargeReason ?? '',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ticket?.id])

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema) as Resolver<TicketFormValues>,
    defaultValues: formDefaults,
  })

  // Reset when navigating between tickets in edit mode
  useEffect(() => {
    form.reset(formDefaults)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id])

  // Populate async catalog IDs for create mode once queries resolve
  useEffect(() => {
    if (mode !== 'create') return
    if (data.currentBusinessDay?.id && !form.getValues('businessDayId')) {
      form.setValue('businessDayId', data.currentBusinessDay.id)
    }
    if (defaultShift?.id && !form.getValues('shiftId')) {
      form.setValue('shiftId', defaultShift.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.currentBusinessDay?.id, defaultShift?.id])

  const watched = form.watch()
  const livePrice = useMemo(() => {
    if (watched.courtesy) return 0
    // Price override wins outright — backend uses it as-is, no discount or surcharge applied.
    const override = watched.priceOverride !== '' && watched.priceOverride != null
      ? Number(watched.priceOverride) : undefined
    if (override !== undefined && override > 0) {
      return Math.round(override * 100) / 100
    }
    const base = (data.prices.data ?? []).find((price) =>
      price.serviceTypeId === Number(watched.serviceTypeId) &&
      price.vehicleSizeId === Number(watched.vehicleSizeId) &&
      price.currency === 'MXN'
    )?.amount
    if (base === undefined) return undefined
    const pct = watched.discountPercent ?? 0
    const afterDiscount = pct > 0 ? base * (1 - pct / 100) : base
    const surcharge = watched.surchargeAmount !== '' && watched.surchargeAmount != null
      ? Number(watched.surchargeAmount) : 0
    return Math.round((afterDiscount + (surcharge > 0 ? surcharge : 0)) * 100) / 100
  }, [data.prices.data, watched.courtesy, watched.serviceTypeId, watched.vehicleSizeId,
      watched.discountPercent, watched.surchargeAmount, watched.priceOverride])

  const save = useMutation({
    mutationFn: (values: TicketFormValues) => {
      const override = values.priceOverride !== '' && values.priceOverride != null ? Number(values.priceOverride) : undefined
      const surcharge = !values.courtesy && values.surchargeAmount !== '' && values.surchargeAmount != null
        ? Number(values.surchargeAmount) : 0
      const baseDate = mode === 'edit' && ticket?.occurredAt
        ? (() => { const d = new Date(ticket.occurredAt!); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()
        : (data.currentBusinessDay?.businessDate ?? today)
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
        occurredAt: values.occurredAt ? localTimeToIso(values.occurredAt, baseDate) : undefined,
        internalRef: values.internalRef?.trim() || undefined,
        priceOverride: override,
        surchargeAmount: surcharge > 0 ? surcharge : 0,
        surchargeReason: !values.courtesy && surcharge > 0
          ? (values.surchargeReason?.trim() || undefined) : undefined,
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
      setLavadorQuery('')
      setTimeout(onSaved, 500)
    },
  })

  const disabledReason = mode === 'edit' ? null : (
    !data.currentBusinessDay
      ? 'No hay dia de trabajo abierto para hoy.'
      : openShifts.length === 0
        ? 'No hay turno abierto.'
        : null
  )

  const hasAdvancedError = (['priceOverride', 'discountPercent'] as const)
    .some((field) => form.formState.errors[field])
  const effectiveShowAdvanced = showAdvanced || hasAdvancedError

  // Live clock for header (updates every minute)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const clockStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })

  // Tickets today counter
  const ticketsTodayCount = useQuery({
    queryKey: ['daily-summary', today],
    queryFn: () => api<DailySummary>(`/api/v1/reports/daily-summary?date=${today}`),
    enabled: mode === 'create',
  })

  // Compact notes accordion state
  const [showFullNotes, setShowFullNotes] = useState(() => Boolean(ticket?.notes))

  // Turno is locked by default — auto-selected by time of day. User can unlock if needed.
  const [shiftLocked, setShiftLocked] = useState(mode === 'create')

  // Auto-select the appropriate shift by current time when creating a ticket
  useEffect(() => {
    if (mode !== 'create' || !shiftLocked) return
    if (openShifts.length === 0) return
    const preferred = now.getHours() < 14 ? 'MATUTINO' : 'VESPERTINO'
    const match = openShifts.find((s) => s.shiftType === preferred) ?? openShifts[0]
    if (match && Number(form.getValues('shiftId')) !== match.id) {
      form.setValue('shiftId', match.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openShifts.length, shiftLocked, now.getHours()])

  // SectionHeader helper — numbered chip + color rail + title + optional aside.
  // Compact padding so the operator's whole form fits in the viewport.
  const SectionHeader = ({ num, color, title, aside }: { num: number; color: string; title: string; aside?: React.ReactNode }) => (
    <div className="flex items-center justify-between border-b border-border-soft bg-ink-50/60 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-5 w-5 items-center justify-center rounded text-[10.5px] font-bold text-white shadow-sm ${color}`}>
          {num}
        </span>
        <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h3>
      </div>
      {aside}
    </div>
  )

  return (
    <section className="space-y-3">
      {toast && <Toast message={toast} />}

      {/* ─── Editorial header ─────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            {mode === 'edit' ? 'Edición' : 'Captura'} · {data.currentBusinessDay?.businessDate ?? 'Sin día abierto'}
          </p>
          <div className="mt-0.5 flex items-baseline gap-3">
            <h2 className="font-display text-[22px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">
              {mode === 'edit' ? 'Editar ticket' : 'Nuevo ticket'}
            </h2>
            {mode === 'create' && ticketsTodayCount.data && (
              <span className="text-[12.5px] font-semibold text-ink-400">
                · {ticketsTodayCount.data.recentTickets.length} hoy
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-white px-3 py-2 shadow-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400">
              {openShifts[0]?.shiftType === 'MATUTINO' ? 'Turno Matutino' : openShifts[0]?.shiftType === 'VESPERTINO' ? 'Turno Vespertino' : 'Sin turno'}
            </p>
            <p className="font-mono text-[13.5px] font-semibold tabular-nums text-ink-900">{clockStr}</p>
          </div>
        </div>
      </div>

      {disabledReason && (
        <Banner tone="warn" title={disabledReason} text="Abre el dia y el turno desde Catalogos antes de capturar tickets." />
      )}

      <form className="grid gap-4 xl:grid-cols-[1fr_340px]" onSubmit={form.handleSubmit((values) => save.mutate(values))} data-testid="ticket-form">
        <div className="space-y-3">

          {/* ── 1. Datos del servicio ──────────────────────────────── */}
          <div className="tl-panel overflow-hidden">
            <SectionHeader
              num={1}
              color="bg-gradient-to-b from-violet-500 to-violet-700"
              title="Datos del servicio"
              aside={
                <label className={`relative flex cursor-pointer select-none items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-150 ${
                  watched.courtesy
                    ? 'border-amber-300 bg-amber-50 text-amber-800 shadow-[0_0_0_3px_rgba(251,191,36,0.12)]'
                    : 'border-border-soft bg-white text-ink-500 hover:border-amber-200 hover:bg-amber-50/60 hover:text-amber-700'
                }`}>
                  <input type="checkbox" {...form.register('courtesy')} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Marcar como cortesia" />
                  <span className={`h-3 w-3 rounded-full transition-colors ${watched.courtesy ? 'bg-amber-500' : 'bg-ink-300'}`} />
                  Cortesía
                </label>
              }
            />

            <div className="space-y-3.5 p-4">
              {/* Servicio subgroup — these drive the price */}
              <div>
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Servicio · determina el precio</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-[12px] font-semibold text-ink-700">Turno</label>
                      <button
                        type="button"
                        onClick={() => setShiftLocked((v) => !v)}
                        className={`text-[10.5px] font-semibold ${shiftLocked ? 'text-violet-600 hover:text-violet-700' : 'text-ink-500 hover:text-ink-700'}`}
                      >
                        {shiftLocked ? 'Cambiar' : 'Volver a auto'}
                      </button>
                    </div>
                    {shiftLocked ? (
                      <>
                        <div className="flex h-[38px] items-center gap-2 rounded-xl border border-border-soft bg-ink-50/60 px-3.5">
                          <svg className="h-3.5 w-3.5 text-ink-400" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                            <rect x="5" y="11" width="14" height="10" rx="2" />
                            <path d="M8 11V8a4 4 0 018 0v3" />
                          </svg>
                          <span className="text-[13px] font-semibold text-ink-800">
                            {(() => {
                              const sel = openShifts.find((s) => s.id === Number(watched.shiftId))
                              if (!sel) return 'Sin turno'
                              return sel.shiftType === 'MATUTINO' ? 'Mañana (auto)' : 'Tarde (auto)'
                            })()}
                          </span>
                        </div>
                        {/* Hidden select kept in the DOM so form state + accessibility + E2E selectors keep working */}
                        <select {...form.register('shiftId')} disabled={Boolean(disabledReason)} aria-label="Turno" className="sr-only">
                          <option value={0}>Selecciona turno</option>
                          {openShifts.map((shift) => (
                            <option key={shift.id} value={shift.id}>{shift.shiftType === 'MATUTINO' ? 'Mañana' : 'Tarde'}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <select {...form.register('shiftId')} disabled={Boolean(disabledReason)} aria-label="Turno">
                          <option value={0}>Selecciona turno</option>
                          {openShifts.map((shift) => (
                            <option key={shift.id} value={shift.id}>{shift.shiftType === 'MATUTINO' ? 'Mañana' : 'Tarde'}</option>
                          ))}
                        </select>
                        {form.formState.errors.shiftId?.message && (
                          <p className="mt-1 text-xs text-red-600">{form.formState.errors.shiftId.message}</p>
                        )}
                      </>
                    )}
                  </div>
                  <SelectField label="Servicio" error={form.formState.errors.serviceTypeId?.message}>
                    <select {...form.register('serviceTypeId')}>
                      <option value={0}>Selecciona servicio</option>
                      {(() => {
                        const all = (data.services.data ?? []).filter((s) => s.active !== false)
                        const standard = all.filter((s) => s.category !== 'EXTRA')
                        const extras = all.filter((s) => s.category === 'EXTRA')
                        return (
                          <>
                            {standard.length > 0 && (
                              <optgroup label="Lavados">
                                {standard.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </optgroup>
                            )}
                            {extras.length > 0 && (
                              <optgroup label="Extras (precio aparte)">
                                {extras.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </optgroup>
                            )}
                          </>
                        )
                      })()}
                    </select>
                  </SelectField>
                  <SelectField label="Vehículo" error={form.formState.errors.vehicleSizeId?.message}>
                    <select {...form.register('vehicleSizeId')}>
                      <option value={0}>Selecciona vehículo</option>
                      {(() => {
                        const labels: Record<string, string> = {
                          AUTO: 'Autos y camionetas',
                          MOTO: 'Motos',
                          RAZR: 'RAZR',
                          PERSONAL: 'Camionetas de personal',
                        }
                        const order = ['AUTO', 'MOTO', 'RAZR', 'PERSONAL']
                        const byCat: Record<string, VehicleSize[]> = {}
                        for (const size of (data.sizes.data ?? []).filter((s) => s.active !== false)) {
                          const cat = (size.category as string) || 'AUTO'
                          ;(byCat[cat] ||= []).push(size)
                        }
                        const cats = [...new Set([...order, ...Object.keys(byCat)])]
                          .filter((c) => byCat[c]?.length)
                        return cats.map((cat) => (
                          <optgroup key={cat} label={labels[cat] ?? cat}>
                            {byCat[cat]
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((size) => (
                                <option key={size.id} value={size.id}>{size.name}</option>
                              ))}
                          </optgroup>
                        ))
                      })()}
                    </select>
                  </SelectField>
                  <SelectField label="Forma de pago" error={form.formState.errors.paymentMethod?.message}>
                    <select {...form.register('paymentMethod')} disabled={watched.courtesy}>
                      <option value="CASH">Efectivo</option>
                      <option value="CARD">Tarjeta</option>
                      <option value="TRANSFER">Depósito</option>
                    </select>
                  </SelectField>
                </div>
              </div>

              {/* Detalle subgroup — context fields */}
              <div className="border-t border-border-soft pt-3">
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Detalle del lavado</p>
                <div className={`grid gap-3 sm:grid-cols-2 ${watched.courtesy ? 'xl:grid-cols-2' : 'xl:grid-cols-3'}`}>
                  {!watched.courtesy && (
                    <TextField label="No. de Nota" error={form.formState.errors.internalRef?.message}>
                      <input placeholder="Ej. 41703" {...form.register('internalRef')} />
                    </TextField>
                  )}
                  <TextField label="Descripción del vehículo" error={form.formState.errors.vehicleDescription?.message}>
                    <input placeholder="Ej. Tsuru rojo, Tacoma blanca" {...form.register('vehicleDescription')} />
                  </TextField>
                  <TextField label="Hora del lavado" hint="Formato 24 h — ej. 14:30">
                    <input
                      type="time"
                      lang="es-MX"
                      {...form.register('occurredAt')}
                    />
                  </TextField>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Lavadores asignados ─────────────────────────────── */}
          {(() => {
            const allLavadores = (data.employees.data ?? [])
              .filter((e) => e.active)
              .filter((e) => !/tia\s*gabi/i.test(e.fullName))
            const selectedIds = (watched.employeeIds ?? []).map(Number)
            const toggle = (id: number) => {
              const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
              form.setValue('employeeIds', next, { shouldValidate: true })
              setLavadorQuery('')
            }
            const filtered = lavadorQuery.trim()
              ? allLavadores.filter((e) => e.fullName.toLowerCase().includes(lavadorQuery.toLowerCase()))
              : allLavadores
            const selectedEmployees = allLavadores.filter((e) => selectedIds.includes(e.id))
            return (
              <div className="tl-panel overflow-hidden">
                <SectionHeader
                  num={2}
                  color="bg-gradient-to-b from-violet-500 to-violet-700"
                  title="Lavadores asignados"
                  aside={
                    selectedEmployees.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                        {selectedEmployees.length} seleccionado{selectedEmployees.length === 1 ? '' : 's'}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-ink-400">Ninguno seleccionado</span>
                    )
                  }
                />
                <div className="space-y-2.5 p-4">
                  {selectedEmployees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEmployees.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => toggle(e.id)}
                          className="flex items-center gap-1 rounded-full border border-violet-300 bg-violet-600 py-0.5 pl-2 pr-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-violet-700"
                        >
                          {e.fullName}
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] leading-none">×</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    value={lavadorQuery}
                    onChange={(e) => setLavadorQuery(e.target.value)}
                    onFocus={() => setLavadorFocused(true)}
                    onBlur={() => setTimeout(() => setLavadorFocused(false), 150)}
                    placeholder="Buscar lavador..."
                    className="w-full"
                  />
                  {lavadorFocused && filtered.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-border-soft bg-white shadow-md">
                      {filtered.map((e) => {
                        const active = selectedIds.includes(e.id)
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => toggle(e.id)}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors ${
                              active ? 'bg-violet-50 text-violet-800' : 'hover:bg-ink-50 text-ink-800'
                            }`}
                          >
                            {e.fullName}
                            {active && <span className="text-[11px] text-violet-500">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {form.formState.errors.employeeIds?.message && (
                    <p className="text-xs text-red-600">{form.formState.errors.employeeIds.message}</p>
                  )}
                </div>
              </div>
            )
          })()}

          {/* ── 3. Notas (compact accordion) ───────────────────────── */}
          <div className="tl-panel overflow-hidden">
            <SectionHeader
              num={3}
              color="bg-gradient-to-b from-emerald-400 to-emerald-600"
              title="Notas"
              aside={
                <button
                  type="button"
                  onClick={() => setShowFullNotes((v) => !v)}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  {showFullNotes ? 'Compactar −' : 'Detalladas +'}
                </button>
              }
            />
            <div className="p-4">
              {showFullNotes ? (
                <textarea
                  rows={2}
                  placeholder="Ej. cliente frecuente, pago con billete grande, lavar con cuidado..."
                  {...form.register('notes')}
                  className="tl-input resize-none"
                />
              ) : (
                <input
                  type="text"
                  placeholder="Nota corta (opcional)..."
                  {...form.register('notes')}
                  className="tl-input"
                />
              )}
            </div>
          </div>

          {/* ── 4. Mas opciones toggle ─────────────────────────────── */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            data-testid="ticket-advanced-toggle"
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-all duration-150 ${
              effectiveShowAdvanced
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-border-soft bg-white text-ink-500 hover:border-amber-200 hover:bg-amber-50/70 hover:text-amber-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`flex h-5 w-5 items-center justify-center rounded text-[10.5px] font-bold text-white shadow-sm bg-gradient-to-b from-amber-400 to-amber-600`}>
                4
              </span>
              <span>{effectiveShowAdvanced ? 'Ocultar opciones avanzadas' : 'Más opciones — precio especial, descuento, extras'}</span>
            </div>
            <svg
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${effectiveShowAdvanced ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* ── Opciones avanzadas ────────────────────────────────── */}
          {effectiveShowAdvanced && (
            <div className="tl-panel overflow-hidden">
              <SectionHeader
                num={4}
                color="bg-gradient-to-b from-amber-400 to-amber-600"
                title="Opciones avanzadas"
              />
              <div className="space-y-3.5 p-4">
                {/* Extras presets — one-click chips that pre-fill "Precio especial" with
                    base + extra and tag the notes. Only shown when (a) a vehicle size is
                    picked, (b) the primary service is a standard wash (no chips on a
                    standalone Encerado), and (c) at least one extra has a price for the
                    picked vehicle size. MOTO / RAZR / PERSONAL hide naturally via sparse
                    pricing. */}
                {(() => {
                  const currentSvc = (data.services.data ?? []).find((s) => s.id === Number(watched.serviceTypeId))
                  const sizeId = Number(watched.vehicleSizeId)
                  if (!currentSvc || sizeId === 0) return null
                  if (currentSvc.category === 'EXTRA') return null
                  const prices = data.prices.data ?? []
                  const baseAmount = prices.find((pr) =>
                    pr.serviceTypeId === currentSvc.id && pr.vehicleSizeId === sizeId && pr.currency === 'MXN'
                  )?.amount ?? 0
                  const extras = (data.services.data ?? [])
                    .filter((s) => s.active !== false && s.category === 'EXTRA')
                    .map((s) => ({
                      service: s,
                      price: prices.find((pr) =>
                        pr.serviceTypeId === s.id && pr.vehicleSizeId === sizeId && pr.currency === 'MXN'
                      )?.amount,
                    }))
                    .filter((x) => x.price != null && x.price > 0) as Array<{ service: ServiceType; price: number }>
                  if (extras.length === 0) return null
                  const onAddExtra = (extraName: string, extraPrice: number) => {
                    form.setValue('priceOverride', baseAmount + extraPrice, { shouldValidate: true })
                    const currentNotes = (watched.notes ?? '').trim()
                    const marker = `+ ${extraName}`
                    if (!currentNotes.toLowerCase().includes(extraName.toLowerCase())) {
                      form.setValue('notes', currentNotes ? `${currentNotes} ${marker}` : marker, { shouldValidate: true })
                    }
                  }
                  return (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-amber-800">
                        Agregar extra — rellena precio especial
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {extras.map(({ service, price }) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => onAddExtra(service.name, price)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1 text-[12px] font-semibold text-amber-800 transition hover:bg-amber-100"
                          >
                            <span>+ {service.name}</span>
                            <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700">
                              ${price.toLocaleString('es-MX')}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[10.5px] text-amber-700/80">
                        Click un extra para sumarlo al precio base (${baseAmount.toLocaleString('es-MX')}).
                        Se anota en las notas del ticket.
                      </p>
                    </div>
                  )
                })()}

                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Precio especial ($)" error={form.formState.errors.priceOverride?.message}>
                    <input type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="Dejar vacio = precio de lista" {...form.register('priceOverride')} />
                  </TextField>
                  <div>
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
                      <p className="mt-1.5 text-xs font-medium text-amber-700">Precio final reducido {watched.discountPercent}%</p>
                    )}
                  </div>
                </div>

                {/* Cargo extra (exceso de lodo, vehiculo extra sucio, etc.) */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-[180px_1fr]">
                  <TextField label="Cargo extra ($)" error={form.formState.errors.surchargeAmount?.message}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      disabled={watched.courtesy}
                      data-testid="ticket-surcharge-amount"
                      className={watched.courtesy ? 'opacity-60' : undefined}
                      {...form.register('surchargeAmount')}
                    />
                  </TextField>
                  <TextField label="Motivo del cargo" error={form.formState.errors.surchargeReason?.message}>
                    <input
                      type="text"
                      placeholder={Number(watched.surchargeAmount) > 0
                        ? 'Ej. Lleno de lodo, mascotas, vómito...'
                        : 'Ingresa primero el monto'}
                      maxLength={120}
                      disabled={watched.courtesy || !(Number(watched.surchargeAmount) > 0)}
                      className={watched.courtesy || !(Number(watched.surchargeAmount) > 0)
                        ? 'opacity-60' : undefined}
                      {...form.register('surchargeReason')}
                    />
                  </TextField>
                </div>
                {Number(watched.surchargeAmount) > 0 && !watched.courtesy && (
                  <p className="text-xs font-medium text-amber-700">
                    Se sumará {money(Number(watched.surchargeAmount), 'MXN')} al precio del servicio.
                  </p>
                )}

              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar: precio + submit ──────────────────────────── */}
        <aside>
          <div className="overflow-hidden rounded-2xl border border-border-soft bg-white shadow-md xl:sticky xl:top-4">
            {/* Price hero */}
            <div
              className="relative px-6 py-6 text-center"
              style={{ background: 'radial-gradient(circle at 100% 0%, rgba(34,197,94,0.18), transparent 55%), linear-gradient(140deg, #1a0f2e 0%, #3b1d5c 50%, #1f8a3d 130%)' }}
            >
              {/* dot grid texture */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              />
              {/* Nota stamp */}
              {watched.internalRef && (
                <div className="absolute right-3 top-3 rotate-[8deg]">
                  <span className="inline-block rounded border-2 border-emerald-300/60 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    Nº {watched.internalRef}
                  </span>
                </div>
              )}
              <p className="relative mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/50">
                {watched.courtesy ? 'Cortesía' : 'Total a cobrar'}
              </p>
              {livePrice === undefined ? (
                <p className="font-display text-[24px] font-bold leading-none tracking-tight text-white/40">
                  Selecciona servicio y vehículo…
                </p>
              ) : watched.discountPercent > 0 && !watched.courtesy ? (
                <div className="relative">
                  {/* Original price strikethrough */}
                  {(() => {
                    const base = (data.prices.data ?? []).find((p) =>
                      p.serviceTypeId === Number(watched.serviceTypeId) &&
                      p.vehicleSizeId === Number(watched.vehicleSizeId) &&
                      p.currency === 'MXN'
                    )?.amount
                    return base ? (
                      <p className="font-mono text-[14px] font-medium text-white/40 line-through">
                        {money(base, 'MXN')}
                      </p>
                    ) : null
                  })()}
                  <p className="font-display text-[48px] font-black leading-none tracking-[-0.03em] text-emerald-300" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {money(livePrice, 'MXN')}
                  </p>
                  <span className="mt-2.5 inline-block rounded-full border border-amber-400/30 bg-amber-400/20 px-3 py-0.5 text-[11px] font-semibold text-amber-200">
                    -{watched.discountPercent}% descuento
                  </span>
                </div>
              ) : (
                <p className="relative font-display text-[48px] font-black leading-none tracking-[-0.03em] text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {watched.courtesy ? 'GRATIS' : money(livePrice, 'MXN')}
                </p>
              )}
              {/* Hidden element preserving the legacy testid + text format for E2E assertions */}
              <span data-testid="summary-precio-preview-value" className="sr-only">
                {livePrice === undefined
                  ? 'Sin precio'
                  : watched.courtesy
                    ? money(0, 'MXN')
                    : watched.discountPercent > 0
                      ? `${money(livePrice, 'MXN')} (-${watched.discountPercent}%)`
                      : money(livePrice, 'MXN')}
              </span>
            </div>

            {/* Perforated divider */}
            <div className="relative">
              <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink-50" />
              <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink-50" />
              <div className="border-t border-dashed border-border-soft" />
            </div>

            {/* Receipt details */}
            <div className="divide-y divide-dashed divide-border-soft px-5 py-1 font-mono text-[12.5px]">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-ink-400">Lavadores</span>
                <span className="font-semibold text-ink-800">
                  {(watched.employeeIds ?? []).length > 0
                    ? (data.employees.data ?? [])
                        .filter((e) => (watched.employeeIds ?? []).map(Number).includes(e.id))
                        .map((e) => e.fullName.split(' ')[0])
                        .join(', ')
                    : <em className="font-normal not-italic text-ink-300">Ninguno</em>}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-ink-400">Tipo</span>
                <span className={`font-semibold ${watched.courtesy ? 'text-amber-600' : 'text-ink-800'}`}>
                  {watched.courtesy ? 'Cortesía' : 'Venta'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-ink-400">Pago</span>
                <span className="font-semibold text-ink-800">
                  {watched.courtesy ? 'N/A' : watched.paymentMethod === 'CARD' ? 'Tarjeta' : watched.paymentMethod === 'TRANSFER' ? 'Depósito' : 'Efectivo'}
                </span>
              </div>
              {!watched.courtesy && Number(watched.surchargeAmount) > 0 && (
                <div className="flex items-start justify-between gap-3 py-2.5">
                  <span className="min-w-0 text-ink-400">
                    Cargo extra
                    {watched.surchargeReason?.trim() && (
                      <span className="block text-[11px] text-ink-300">· {watched.surchargeReason.trim()}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-semibold text-amber-600">
                    +{money(Number(watched.surchargeAmount), 'MXN')}
                  </span>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="px-5 pb-5 pt-3">
              {save.error && (
                <p className="mb-3 rounded-lg bg-bad-50 p-3 text-[12.5px] text-bad-700 ring-1 ring-bad-100">{save.error.message}</p>
              )}
              {readOnly ? (
                <Banner tone="warn" title="Turno cerrado — solo lectura" />
              ) : (
                <Button
                  kind="go"
                  size="lg"
                  type="submit"
                  block
                  disabled={save.isPending || Boolean(disabledReason)}
                  testId="ticket-submit"
                >
                  {save.isPending ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar ticket'}
                </Button>
              )}
            </div>

          </div>
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
  restDayPremium: z.coerce.number().min(0, 'Minimo 0'),
  absenceDayPenalty: z.coerce.number().min(0, 'Minimo 0'),
})
type EmployeeEditFormValues = z.infer<typeof employeeEditSchema>

function CatalogsScreen() {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState<string | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showInactiveEmployees, setShowInactiveEmployees] = useState(false)
  const [showAddService, setShowAddService] = useState(false)
  const [showAddSize, setShowAddSize] = useState(false)
  const [showAddPrice, setShowAddPrice] = useState(false)
  const [editingPrices, setEditingPrices] = useState(false)
  const [pendingAmounts, setPendingAmounts] = useState<Map<string, number>>(new Map())
  const [quickAdjustInput, setQuickAdjustInput] = useState('')
  const [savingAll, setSavingAll] = useState(false)
  const { hasRole } = useAuth()
  const data = usePhaseData()
  const openShifts = (data.shifts.data ?? []).filter((shift) => shift.status === 'OPEN')

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 1800)
  }

  const employeeForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as Resolver<EmployeeFormValues>,
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
    resolver: zodResolver(serviceTypeSchema) as Resolver<ServiceTypeFormValues>,
    defaultValues: { code: '', name: '', description: '' },
  })
  const sizeForm = useForm<VehicleSizeFormValues>({
    resolver: zodResolver(vehicleSizeSchema) as Resolver<VehicleSizeFormValues>,
    defaultValues: { code: '', name: '', sortOrder: 0, category: 'AUTO' },
  })
  const priceForm = useForm<ServicePriceFormValues>({
    resolver: zodResolver(servicePriceSchema) as Resolver<ServicePriceFormValues>,
    defaultValues: { serviceTypeId: 0, vehicleSizeId: 0, amount: 0, effectiveFrom: today },
  })
  const operationsForm = useForm<OperationsFormValues>({
    resolver: zodResolver(operationsSchema) as Resolver<OperationsFormValues>,
    defaultValues: { businessDate: today, shiftType: 'MATUTINO' },
  })

  const employees = data.employees.data ?? []
  const services = data.services.data ?? []
  const sizes = data.sizes.data ?? []
  const prices = data.prices.data ?? []
  const sizeById = Object.fromEntries(sizes.map(s => [s.id, s])) as Record<number, VehicleSize | undefined>
  const mxnPrices = prices.filter(p => p.currency === 'MXN')
  const CAT_LABEL: Record<string, string> = { AUTO: 'Autos y camionetas', MOTO: 'Motos', RAZR: 'RAZR', PERSONAL: 'Cam. de personal' }
  const mxnGroups = (['AUTO', 'MOTO', 'RAZR', 'PERSONAL'] as const).flatMap(cat => {
    const catPrices = mxnPrices.filter(p => (sizeById[p.vehicleSizeId]?.category ?? 'AUTO') === cat)
    if (catPrices.length === 0) return []
    const svcIds: number[] = []
    const svcName: Record<number, string> = {}
    catPrices.forEach(p => { if (!svcIds.includes(p.serviceTypeId)) { svcIds.push(p.serviceTypeId); svcName[p.serviceTypeId] = p.serviceTypeName } })
    const szIds = [...new Set(catPrices.map(p => p.vehicleSizeId))].sort((a, b) => (sizeById[a]?.sortOrder ?? 0) - (sizeById[b]?.sortOrder ?? 0))
    const szName: Record<number, string> = {}
    szIds.forEach(id => { szName[id] = catPrices.find(p => p.vehicleSizeId === id)!.vehicleSizeName })
    const priceMap: Record<string, number> = {}
    catPrices.forEach(p => { priceMap[`${p.serviceTypeId}-${p.vehicleSizeId}`] = p.amount })
    return [{ cat, label: CAT_LABEL[cat] ?? cat, svcIds, svcName, szIds, szName, priceMap }]
  })

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
          restDayPremium: Number(values.restDayPremium),
          absenceDayPenalty: Number(values.absenceDayPenalty),
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
      setShowAddService(false)
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
      sizeForm.reset({ code: '', name: '', sortOrder: 0, category: 'AUTO' })
      await queryClient.invalidateQueries({ queryKey: ['vehicle-sizes'] })
      showToast('Tamaño guardado')
      setShowAddSize(false)
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
      setShowAddPrice(false)
    },
  })

  const quickUpdatePrice = useMutation({
    mutationFn: (values: { serviceTypeId: number; vehicleSizeId: number; amount: number }) =>
      api<ServicePrice>('/api/v1/service-prices/quick-update', {
        method: 'POST',
        body: JSON.stringify({ serviceTypeId: values.serviceTypeId, vehicleSizeId: values.vehicleSizeId, amount: values.amount, currency: 'MXN' }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['service-prices'] })
    },
  })

  const openBusinessDay = useMutation({
    mutationFn: (values: OperationsFormValues) => api<BusinessDay>('/api/v1/business-days/open', {
      method: 'POST',
      body: JSON.stringify({ businessDate: values.businessDate }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['business-days'] })
      showToast('Día abierto')
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

  function exitEditMode() {
    setEditingPrices(false)
    setPendingAmounts(new Map())
    setQuickAdjustInput('')
  }

  function applyQuickAdjust(direction: 1 | -1) {
    const delta = Number(quickAdjustInput)
    if (!delta || isNaN(delta)) return
    const next = new Map(pendingAmounts)
    mxnGroups.forEach(group => {
      group.szIds.forEach(szId => {
        group.svcIds.forEach(svcId => {
          const key = `${svcId}-${szId}`
          const base = next.get(key) ?? group.priceMap[key]
          if (base !== undefined) next.set(key, Math.max(1, base + direction * delta))
        })
      })
    })
    setPendingAmounts(next)
  }

  async function saveAllPending() {
    const dirty: Array<{ serviceTypeId: number; vehicleSizeId: number; amount: number }> = []
    mxnGroups.forEach(group => {
      group.szIds.forEach(szId => {
        group.svcIds.forEach(svcId => {
          const key = `${svcId}-${szId}`
          const pending = pendingAmounts.get(key)
          if (pending !== undefined && pending > 0) {
            dirty.push({ serviceTypeId: svcId, vehicleSizeId: szId, amount: pending })
          }
        })
      })
    })
    if (dirty.length === 0) { exitEditMode(); return }
    setSavingAll(true)
    try {
      await Promise.all(dirty.map(e => quickUpdatePrice.mutateAsync(e)))
      showToast(`${dirty.length} precio${dirty.length !== 1 ? 's' : ''} guardado${dirty.length !== 1 ? 's' : ''}`)
      exitEditMode()
    } catch {
      showToast('Error al guardar algunos precios')
    } finally {
      setSavingAll(false)
    }
  }

  return (
    <section className="space-y-5">
      {toast && <Toast message={toast} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Configuración · datos base</p>
          <h2 className="font-display mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">Catálogos</h2>
          <p className="mt-1 text-[12.5px] text-ink-500">Lavadores, servicios, tamaños y precios — la base que alimenta los tickets.</p>
        </div>
        <NavLink to="/tickets/nuevo" className="tl-btn tl-btn-primary">
          + Nuevo ticket
        </NavLink>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Panel title="Lavadores">
            <form className="space-y-3" onSubmit={employeeForm.handleSubmit((values) => createEmployee.mutate(values))}>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Nombre" error={employeeForm.formState.errors.fullName?.message}>
                  <input placeholder="Ej. Juan Perez" {...employeeForm.register('fullName')} />
                </TextField>
                <TextField label="Teléfono" error={employeeForm.formState.errors.phone?.message}>
                  <input type="tel" inputMode="tel" autoComplete="tel" placeholder="Opcional" {...employeeForm.register('phone')} />
                </TextField>
              </div>
              <p className="text-[12px] text-ink-400">Los ajustes de nómina (comisión, sueldo, bonos) se configuran en el botón <span className="font-medium text-ink-600">Editar</span> de cada lavador.</p>
              {createEmployee.error && <ErrorMessage message={createEmployee.error.message} />}
              <div className="flex justify-end">
                <Button kind="go" type="submit" disabled={createEmployee.isPending}>
                  {createEmployee.isPending ? 'Guardando…' : '+ Agregar lavador'}
                </Button>
              </div>
            </form>
            <div className="my-4 border-t border-border-soft" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-ink-600">Lavadores registrados</span>
              <Button kind="ghost" size="sm" onClick={() => setShowInactiveEmployees(!showInactiveEmployees)}>
                {showInactiveEmployees ? 'Solo activos' : 'Ver todos'}
              </Button>
            </div>
            <div className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft">
              {employees.filter(e => showInactiveEmployees || e.active).length === 0 && (
                <div className="rounded-xl bg-ink-50/60 px-4 py-5 text-center text-[13px] text-ink-500">
                  {showInactiveEmployees
                    ? 'No hay lavadores en el catálogo.'
                    : 'No hay lavadores activos. Marca "Ver inactivos" para revisarlos.'}
                </div>
              )}
              {employees.filter(e => showInactiveEmployees || e.active).map((employee) => (
                <div key={employee.id} className={`flex items-center justify-between gap-4 px-3 py-2 text-sm ${!employee.active ? 'opacity-50' : ''}`}>
                  <div>
                    <span className="font-medium">{employee.fullName}</span>
                    {!employee.active && <span className="ml-2 text-xs text-red-500">Baja</span>}
                    <p className="text-xs text-ink-400">
                      {employee.payrollType === 'COMMISSION'
                        ? `Comision ${money(employee.commissionRate, 'MXN')}/carro`
                        : `Sueldo ${money(employee.baseWeeklySalary, 'MXN')}/sem`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(employee)}
                    className="shrink-0 rounded-md border border-border-soft px-2 py-1 text-xs text-ink-600 hover:bg-ink-50"
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
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12.5px] text-ink-500">Tipos de lavado disponibles al crear un ticket.</p>
              <Button kind="ghost" size="sm" onClick={() => setShowAddService(true)}>+ Agregar</Button>
            </div>
            <SimpleList
              empty="No hay servicios."
              rows={services.map((service) => ({
                id: service.id,
                title: service.name,
                detail: service.code,
              }))}
            />
          </Panel>

          <Panel title="Tamaños de vehículo">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12.5px] text-ink-500">Categorías de vehículo que determinan el precio del ticket.</p>
              <Button kind="ghost" size="sm" onClick={() => setShowAddSize(true)}>+ Agregar</Button>
            </div>
            <SimpleList
              empty="No hay tamaños."
              rows={sizes.map((size) => {
                const catLabel = ({ AUTO: 'Auto', MOTO: 'Moto', RAZR: 'RAZR', PERSONAL: 'Personal' } as Record<string, string>)[size.category ?? 'AUTO'] ?? 'Auto'
                return {
                  id: size.id,
                  title: size.name,
                  detail: catLabel,
                }
              })}
            />
          </Panel>

          <Panel title="Precios">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[12.5px] text-ink-500">Precios vigentes hoy, agrupados por tipo de vehículo.</p>
              <div className="flex items-center gap-2">
                {hasRole('DUENO') && (
                  <Button kind="ghost" size="sm" onClick={() => setEditingPrices(true)}>
                    Editar precios
                  </Button>
                )}
                <Button kind="ghost" size="sm" onClick={() => setShowAddPrice(true)}>+ Agregar precio</Button>
              </div>
            </div>
            {prices.length === 0 && (
              <EmptyState
                icon={<IMoney size={20} />}
                title="No hay precios vigentes para hoy"
                description="Agrega un precio con la fecha de hoy o anterior."
                tone="info"
              />
            )}
            {mxnGroups.map(group => (
              <div key={group.cat} className="mb-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">{group.label}</p>
                <div className="overflow-auto rounded-xl border border-border-soft">
                  <table className="tl-tbl min-w-full">
                    <thead>
                      <tr>
                        <th>Vehículo</th>
                        {group.svcIds.map(id => <th key={id} className="r whitespace-nowrap">{group.svcName[id]}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {group.szIds.map(szId => (
                        <tr key={szId}>
                          <td className="font-medium">{group.szName[szId]}</td>
                          {group.svcIds.map(svcId => {
                            const currentAmount = group.priceMap[`${svcId}-${szId}`]
                            return (
                              <td key={svcId} className="r p-1">
                                {currentAmount !== undefined
                                  ? money(currentAmount, 'MXN')
                                  : <span className="text-ink-300">—</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Abrir día / turno">
            <p className="mb-3 text-[12.5px] text-ink-500">Abre el día de operación y los turnos antes de registrar tickets.</p>
            <form className="space-y-4" onSubmit={operationsForm.handleSubmit((values) => openBusinessDay.mutate(values))}>
              <TextField label="Fecha" error={operationsForm.formState.errors.businessDate?.message}>
                <input type="date" {...operationsForm.register('businessDate')} />
              </TextField>
              <Button kind="primary" type="submit" block disabled={openBusinessDay.isPending}>
                {openBusinessDay.isPending ? 'Abriendo…' : 'Abrir dia'}
              </Button>
            </form>
            {openBusinessDay.error && <ErrorMessage message={openBusinessDay.error.message} />}
            <div className="rounded-md bg-ink-50 p-3 text-sm">
              <p className="text-ink-400">Día abierto</p>
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
              <Button kind="primary" type="submit" block disabled={openShift.isPending || !data.currentBusinessDay}>
                {openShift.isPending ? 'Abriendo…' : 'Abrir turno'}
              </Button>
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
      {showAddService && (
        <Modal title="Nuevo servicio" onClose={() => setShowAddService(false)} narrow>
          <form
            className="space-y-4 px-6 py-5"
            onSubmit={serviceForm.handleSubmit((values) => createService.mutate(values))}
          >
            <TextField label="Código" error={serviceForm.formState.errors.code?.message}>
              <input placeholder="LAV_MOTOR" {...serviceForm.register('code')} />
            </TextField>
            <TextField label="Nombre" error={serviceForm.formState.errors.name?.message}>
              <input placeholder="Lavado de motor" {...serviceForm.register('name')} />
            </TextField>
            {createService.error && <ErrorMessage message={createService.error.message} />}
            <ModalActions
              onClose={() => setShowAddService(false)}
              submitLabel={createService.isPending ? 'Guardando…' : 'Guardar servicio'}
            />
          </form>
        </Modal>
      )}
      {showAddSize && (
        <Modal title="Nuevo tamaño de vehículo" onClose={() => setShowAddSize(false)} narrow>
          <form
            className="space-y-4 px-6 py-5"
            onSubmit={sizeForm.handleSubmit((values) => createSize.mutate(values))}
          >
            <TextField label="Código" error={sizeForm.formState.errors.code?.message}>
              <input placeholder="CHICO" {...sizeForm.register('code')} />
            </TextField>
            <TextField label="Nombre" error={sizeForm.formState.errors.name?.message}>
              <input placeholder="Carro" {...sizeForm.register('name')} />
            </TextField>
            <SelectField label="Categoría" error={sizeForm.formState.errors.category?.message}>
              <select {...sizeForm.register('category')}>
                <option value="AUTO">Autos y camionetas</option>
                <option value="MOTO">Motos</option>
                <option value="RAZR">RAZR</option>
                <option value="PERSONAL">Cam. de personal</option>
              </select>
            </SelectField>
            <TextField label="Orden de aparición" error={sizeForm.formState.errors.sortOrder?.message}>
              <input type="number" inputMode="decimal" min={0} {...sizeForm.register('sortOrder')} />
            </TextField>
            {createSize.error && <ErrorMessage message={createSize.error.message} />}
            <ModalActions
              onClose={() => setShowAddSize(false)}
              submitLabel={createSize.isPending ? 'Guardando…' : 'Guardar tamaño'}
            />
          </form>
        </Modal>
      )}
      {showAddPrice && (
        <Modal title="Nuevo precio de servicio" onClose={() => setShowAddPrice(false)} narrow>
          <form
            className="space-y-4 px-6 py-5"
            onSubmit={priceForm.handleSubmit((values) => createPrice.mutate(values))}
          >
            <SelectField label="Servicio" error={priceForm.formState.errors.serviceTypeId?.message}>
              <select {...priceForm.register('serviceTypeId')}>
                <option value={0}>Seleccionar</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </SelectField>
            <SelectField label="Tamaño de vehículo" error={priceForm.formState.errors.vehicleSizeId?.message}>
              <select {...priceForm.register('vehicleSizeId')}>
                <option value={0}>Seleccionar</option>
                {sizes.map((size) => (
                  <option key={size.id} value={size.id}>{size.name}</option>
                ))}
              </select>
            </SelectField>
            <TextField label="Precio $" error={priceForm.formState.errors.amount?.message}>
              <input type="number" inputMode="decimal" min={0} step="0.01" {...priceForm.register('amount')} />
            </TextField>
            <TextField label="Válido desde" error={priceForm.formState.errors.effectiveFrom?.message}>
              <input type="date" {...priceForm.register('effectiveFrom')} />
            </TextField>
            {createPrice.error && <ErrorMessage message={createPrice.error.message} />}
            <ModalActions
              onClose={() => setShowAddPrice(false)}
              submitLabel={createPrice.isPending ? 'Guardando…' : 'Guardar precio'}
            />
          </form>
        </Modal>
      )}
      {editingPrices && (
        <Modal title="Editar precios" onClose={savingAll ? () => {} : exitEditMode}>
          <div className="space-y-5 px-6 py-5">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="text-[12px] font-semibold text-amber-800">Ajuste rápido</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                placeholder="$10"
                value={quickAdjustInput}
                onChange={(e) => setQuickAdjustInput(e.target.value)}
                className="w-20 rounded border border-amber-300 bg-white px-2 py-1 text-sm tabular-nums focus:outline-none"
              />
              <Button kind="ghost" size="sm" onClick={() => applyQuickAdjust(1)}>+ Subir a todos</Button>
              <Button kind="ghost" size="sm" onClick={() => applyQuickAdjust(-1)}>− Bajar a todos</Button>
              <span className="ml-auto text-[11px] text-amber-600">
                {pendingAmounts.size > 0
                  ? `${pendingAmounts.size} cambio${pendingAmounts.size !== 1 ? 's' : ''} pendiente${pendingAmounts.size !== 1 ? 's' : ''}`
                  : 'Sin cambios'}
              </span>
            </div>
            {mxnGroups.map(group => (
              <div key={group.cat}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">{group.label}</p>
                <div className="overflow-auto rounded-xl border border-border-soft">
                  <table className="tl-tbl min-w-full">
                    <thead>
                      <tr>
                        <th>Vehículo</th>
                        {group.svcIds.map(id => <th key={id} className="r whitespace-nowrap">{group.svcName[id]}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {group.szIds.map(szId => (
                        <tr key={szId}>
                          <td className="font-medium">{group.szName[szId]}</td>
                          {group.svcIds.map(svcId => {
                            const currentAmount = group.priceMap[`${svcId}-${szId}`]
                            const key = `${svcId}-${szId}`
                            const pendingVal = pendingAmounts.get(key)
                            const isDirty = pendingVal !== undefined && pendingVal !== currentAmount
                            return (
                              <td key={svcId} className="r p-1">
                                {currentAmount !== undefined ? (
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0.01"
                                    step="1"
                                    value={pendingVal ?? currentAmount}
                                    onChange={(e) => {
                                      const val = Number(e.target.value)
                                      setPendingAmounts(prev => {
                                        const next = new Map(prev)
                                        next.set(key, val)
                                        return next
                                      })
                                    }}
                                    className={[
                                      'w-24 rounded border px-1.5 py-1 text-right text-sm tabular-nums focus:outline-none',
                                      isDirty
                                        ? 'border-amber-400 bg-amber-50 font-semibold text-amber-900'
                                        : 'border-border-soft bg-white focus:border-blue-400',
                                    ].join(' ')}
                                  />
                                ) : <span className="text-ink-300">—</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border-soft px-6 py-4">
            <Button kind="ghost" size="sm" onClick={exitEditMode} disabled={savingAll}>
              Cancelar
            </Button>
            <Button
              kind="go"
              size="sm"
              onClick={saveAllPending}
              loading={savingAll}
              disabled={pendingAmounts.size === 0}
            >
              {pendingAmounts.size > 0 ? `Guardar (${pendingAmounts.size})` : 'Guardar'}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function ExpenseLedgerScreen() {
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [modal, setModal] = useState<'expense' | 'withdrawal' | 'advance' | null>(null)
  const [tab, setTab] = useState<'expenses' | 'withdrawals' | 'advances'>('expenses')
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
  const animCombined = useCountUp(combinedTotal)
  const animExpenses = useCountUp(totals.expenses)
  const animWithdrawals = useCountUp(totals.withdrawals)
  const animAdvances = useCountUp(totals.advances)
  const counts = {
    expenses: (expenses.data ?? []).length,
    withdrawals: (withdrawals.data ?? []).length,
    advances: (advances.data ?? []).length,
  }

  return (
    <section className="space-y-5">
      {/* ─── Editorial header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Salidas de caja · {from === to ? from : `${from} → ${to}`}
          </p>
          <h2 className="font-display mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">Gastos</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button data-testid="gastos-new-expense" className="tl-btn tl-btn-primary" onClick={() => { setTab('expenses'); setModal('expense') }}>+ Gasto</button>
          <button data-testid="gastos-new-withdrawal" className="tl-btn tl-btn-secondary" onClick={() => { setTab('withdrawals'); setModal('withdrawal') }}>+ Retiro</button>
          <button data-testid="gastos-new-advance" className="tl-btn tl-btn-secondary" onClick={() => { setTab('advances'); setModal('advance') }}>+ Préstamo</button>
        </div>
      </div>

      {/* ─── Hero salida total ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 px-6 py-7 sm:px-9 sm:py-7 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.45)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-6 top-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Salidas</div>
        <div className="tl-stagger relative grid grid-cols-1 gap-6 sm:grid-cols-4 sm:gap-8">
          <div data-testid="metric-total-salida">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45">Total salida</p>
            <p className="font-display mt-2 text-[40px] font-black leading-none tracking-[-0.03em] text-rose-300 tabular-nums">
              {money(animCombined, 'MXN')}
            </p>
          </div>
          <div className="sm:border-l sm:border-white/10 sm:pl-8">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45">Gastos</p>
            <p data-testid="metric-gastos-value" className="font-display mt-2 text-[28px] font-bold leading-none tabular-nums text-white">
              {money(animExpenses, 'MXN')}
            </p>
            <p className="mt-1.5 text-[11px] text-white/40">{counts.expenses} registro{counts.expenses === 1 ? '' : 's'}</p>
          </div>
          <div className="sm:border-l sm:border-white/10 sm:pl-8">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45">Retiros</p>
            <p data-testid="metric-retiros-value" className="font-display mt-2 text-[28px] font-bold leading-none tabular-nums text-white">
              {money(animWithdrawals, 'MXN')}
            </p>
            <p className="mt-1.5 text-[11px] text-white/40">{counts.withdrawals} registro{counts.withdrawals === 1 ? '' : 's'}</p>
          </div>
          <div className="sm:border-l sm:border-white/10 sm:pl-8">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45">Préstamos</p>
            <p data-testid="metric-prestamos-value" className="font-display mt-2 text-[28px] font-bold leading-none tabular-nums text-white">
              {money(animAdvances, 'MXN')}
            </p>
            <p className="mt-1.5 text-[11px] text-white/40">{counts.advances} registro{counts.advances === 1 ? '' : 's'}</p>
          </div>
        </div>
      </div>

      {/* ─── Filter bar (inline, no panel) ────────────────────────── */}
      <div data-testid="panel-filtros" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border-soft bg-white p-3">
        <TextField label="Desde">
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </TextField>
        <TextField label="Hasta">
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </TextField>
        <SelectField label="Categoría">
          <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory | '')}>
            <option value="">Todas</option>
            {expenseCategories.map((item) => (
              <option key={item} value={item}>{categoryLabel(item)}</option>
            ))}
          </select>
        </SelectField>
      </div>

      {/* ─── Tabbed ledger ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          { id: 'expenses' as const, label: 'Gastos', count: counts.expenses },
          { id: 'withdrawals' as const, label: 'Retiros', count: counts.withdrawals },
          { id: 'advances' as const, label: 'Préstamos', count: counts.advances },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-150 ${
              tab === t.id ? 'bg-ink-900 text-white shadow-sm' : 'bg-white border border-border-soft text-ink-600 hover:bg-ink-50'
            }`}
          >
            {t.label}
            <span className={`inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
              tab === t.id ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-500'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
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
      )}
      {tab === 'withdrawals' && (
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
      )}
      {tab === 'advances' && (
        <MoneyTable
          title="Préstamos a lavadores"
          rows={(advances.data ?? []).map((row) => ({
            id: row.id,
            date: row.advanceDate,
            concept: row.employeeName,
            detail: row.reason || '-',
            amount: row.amount,
          }))}
          empty="No hay préstamos en este rango."
        />
      )}

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
    resolver: zodResolver(cashCountSchema) as Resolver<CashCountFormValues>,
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
    resolver: zodResolver(closeShiftSchema) as Resolver<CloseShiftFormValues>,
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
  const selectedShift = shifts.find((s) => s.id === Number(effectiveShiftId))

  // Animated count-up for the variance hero
  const animExpected = useCountUp(summary?.expectedCash ?? 0)
  const animCounted = useCountUp(counted ?? 0)
  const animVariance = useCountUp(variance ?? 0)

  return (
    <section className="space-y-5">
      {toast && <Toast message={toast} />}

      {/* ─── Editorial header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Cierre de caja · {data.currentBusinessDay?.businessDate ?? 'sin día'}
          </p>
          <h2 className="font-display mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">Corte de turno</h2>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border-soft bg-white p-1.5 shadow-xs">
          {shifts.length === 0 ? (
            <span className="px-3 text-[12.5px] text-ink-400">Sin turnos</span>
          ) : (
            shifts.map((shift) => {
              const isSelected = shift.id === Number(effectiveShiftId)
              const isOpen = shift.status === 'OPEN'
              return (
                <button
                  key={shift.id}
                  type="button"
                  data-testid={isSelected ? 'corte-shift-select-active' : undefined}
                  onClick={() => { setSelectedShiftId(shift.id); setCashCount(null) }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    isSelected
                      ? 'bg-ink-900 text-white shadow-sm'
                      : 'text-ink-600 hover:bg-ink-100'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-emerald-400' : 'bg-ink-300'}`} />
                  {shift.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino'}
                </button>
              )
            })
          )}
          {/* Hidden select preserves the existing E2E selector */}
          <select
            data-testid="corte-shift-select"
            value={effectiveShiftId}
            onChange={(event) => { setSelectedShiftId(Number(event.target.value)); setCashCount(null) }}
            aria-label="Turno"
            className="sr-only"
          >
            <option value={0}>Selecciona turno</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino'} — {shift.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!data.currentBusinessDay && (
        <Banner tone="warn" title="No hay dia abierto para hoy." text="Ve al Dashboard y abre el dia antes de hacer corte." />
      )}
      {data.currentBusinessDay && shifts.length === 0 && (
        <Banner tone="warn" title="No hay turnos para hoy." text="Ve al Dashboard y abre un turno." />
      )}
      {closeSummary.error && <ErrorMessage message={closeSummary.error.message} />}

      {/* ─── Hero variance comparison ─────────────────────────────── */}
      {selectedShift && summary && (
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 px-6 py-7 sm:px-9 sm:py-7 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.45)]">
          {/* dot grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl ${
            variance == null ? 'bg-violet-500/20' : variance >= 0 ? 'bg-emerald-500/25' : 'bg-rose-500/25'
          }`} />
          <div className="pointer-events-none absolute right-6 top-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            {summary.closed ? 'Turno cerrado' : 'Conteo activo'}
          </div>

          <div className="relative grid grid-cols-3 items-end gap-4 sm:gap-8">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45">Esperado</p>
              <p className="font-display mt-2 text-[36px] font-black leading-none tracking-[-0.03em] text-white tabular-nums sm:text-[44px]">
                {money(animExpected, 'MXN')}
              </p>
            </div>
            <div className="text-center text-white/30 text-[18px] sm:text-[22px] font-light">vs</div>
            <div className="text-right">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45">Contado</p>
              <p className="font-display mt-2 text-[36px] font-black leading-none tracking-[-0.03em] text-white tabular-nums sm:text-[44px]">
                {counted == null ? <span className="tl-skeleton-dark md" /> : money(animCounted, 'MXN')}
              </p>
            </div>
          </div>

          {variance != null && (
            <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/45">Diferencia</p>
                <p className={`font-display mt-1 text-[24px] font-black leading-none tabular-nums ${
                  variance >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}>
                  {animVariance >= 0 ? '+' : ''}{money(animVariance, 'MXN')}
                </p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold ${
                variance > 0
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : variance < 0
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-white/10 text-white/70'
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  variance > 0 ? 'bg-emerald-400' : variance < 0 ? 'bg-rose-400' : 'bg-white/40'
                }`} />
                {variance > 0 ? 'Sobrante' : variance < 0 ? 'Faltante' : 'Caja cuadrada'}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {/* ── 1. Conteo de efectivo ─────────────────────────────── */}
          <div className="tl-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-border-soft bg-ink-50/60 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white shadow-sm bg-gradient-to-b from-violet-500 to-violet-700">1</span>
                <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">Conteo de efectivo</h3>
              </div>
              <span className="font-mono text-[13px] font-bold tabular-nums text-ink-900">
                {money(localCountPreview, 'MXN')}
              </span>
            </div>
            <div className="p-5">
              <form className="space-y-5" onSubmit={cashForm.handleSubmit((values) => countMutation.mutate(values))}>
                {/* Billetes */}
                <div>
                  <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Billetes</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <CashInput label="$1000" name="bills1000" form={cashForm} />
                    <CashInput label="$500" name="bills500" form={cashForm} />
                    <CashInput label="$200" name="bills200" form={cashForm} />
                    <CashInput label="$100" name="bills100" form={cashForm} />
                    <CashInput label="$50" name="bills50" form={cashForm} />
                    <CashInput label="$20" name="bills20" form={cashForm} />
                  </div>
                </div>
                {/* Monedas */}
                <div className="border-t border-border-soft pt-5">
                  <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Monedas</p>
                  <div className="grid gap-3 md:grid-cols-5">
                    <CashInput label="$10" name="coins10" form={cashForm} />
                    <CashInput label="$5" name="coins5" form={cashForm} />
                    <CashInput label="$2" name="coins2" form={cashForm} />
                    <CashInput label="$1" name="coins1" form={cashForm} />
                    <CashInput label="$0.50" name="coins05" form={cashForm} />
                  </div>
                </div>
                {/* Morralla */}
                <div className="border-t border-border-soft pt-5">
                  <TextField label="Morralla total">
                    <input type="number" inputMode="decimal" min={0} step="0.01" {...cashForm.register('morrallaTotal')} />
                  </TextField>
                </div>
                {/* Total preview */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-4">
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-violet-600">Total contado</p>
                    <p className="font-display text-[24px] font-black leading-none tracking-[-0.02em] text-ink-900 tabular-nums mt-1">
                      {money(localCountPreview, 'MXN')}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={countMutation.isPending || !effectiveShiftId || summary?.closed}
                    data-testid="corte-save-count"
                    className="tl-btn tl-btn-primary"
                  >
                    {countMutation.isPending ? 'Calculando...' : 'Guardar conteo'}
                  </button>
                </div>
                {countMutation.error && <ErrorMessage message={countMutation.error.message} />}
              </form>
            </div>
          </div>

          {/* ── 2. Movimientos del turno ──────────────────────────── */}
          <div className="tl-panel overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border-soft bg-ink-50/60 px-5 py-3.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white shadow-sm bg-gradient-to-b from-emerald-400 to-emerald-600">2</span>
              <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">Movimientos del turno</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-emerald-700">Entra</p>
                  <p className="font-display mt-1 text-[22px] font-bold leading-none tabular-nums text-ink-900">
                    {summary ? money(summary.ticketRevenue, 'MXN') : '…'}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-500">Tickets</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-rose-700">Sale</p>
                  <p className="font-display mt-1 text-[22px] font-bold leading-none tabular-nums text-ink-900">
                    {summary ? money(summary.expensesTotal, 'MXN') : '…'}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-500">Gastos</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-amber-700">Sale</p>
                  <p className="font-display mt-1 text-[22px] font-bold leading-none tabular-nums text-ink-900">
                    {summary ? money(summary.withdrawalsTotal, 'MXN') : '…'}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-500">Retiros</p>
                </div>
              </div>
              <div className="rounded-xl border border-border-soft bg-ink-50/40 p-4 font-mono text-[12.5px]">
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400 font-sans">Desglose por método</p>
                <SummaryRow k="Efectivo (tickets)" v={summary ? money(summary.cashRevenue, 'MXN') : '…'} />
                <SummaryRow k="Tarjeta" v={summary ? money(summary.cardRevenue, 'MXN') : '…'} />
                <SummaryRow k="Depósito" v={summary ? money(summary.transferRevenue, 'MXN') : '…'} />
                {summary?.prepaidPackagesTotal != null && summary.prepaidPackagesTotal > 0 && (
                  <SummaryRow k="Paquetes prepagados" v={money(summary.prepaidPackagesTotal, 'MXN')} />
                )}
                {summary?.inventorySalesTotal != null && summary.inventorySalesTotal > 0 && (
                  <SummaryRow k="Miscelánea (ventas)" v={money(summary.inventorySalesTotal, 'MXN')} />
                )}
              </div>
              <p className="text-[11.5px] text-ink-400">
                Efectivo esperado = efectivo de tickets + paquetes + miscelánea − gastos − retiros.
              </p>
            </div>
          </div>

          {/* ── 3. Estado del corte ───────────────────────────────── */}
          {isShort && (
            <Banner tone="bad" title="Hay faltante." text="El sistema exige motivo antes de cerrar el turno." />
          )}
          {variance != null && variance > 0 && (
            <Banner tone="good" title="Hay sobrante." text="Puedes cerrar sin motivo obligatorio." />
          )}
        </div>

        <aside>
          <div className="sticky top-[72px] tl-panel overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border-soft bg-ink-50/60 px-5 py-3.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white shadow-sm bg-gradient-to-b from-amber-400 to-amber-600">3</span>
              <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">Cerrar turno</h3>
            </div>
            <div className="p-5">
              <form className="space-y-4" onSubmit={closeForm.handleSubmit((values) => closeMutation.mutate(values))}>
                {/* Status rows */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] text-ink-500">Estado</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      summary?.closed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${summary?.closed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {summary?.closed ? 'Cerrado' : (summary?.shiftStatus ?? 'Pendiente')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] text-ink-500">Conteo guardado</span>
                    <span className={`text-[12px] font-semibold ${cashCount || summary?.cashCount ? 'text-emerald-700' : 'text-ink-400'}`}>
                      {cashCount || summary?.cashCount ? '✓ Sí' : '— Pendiente'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] text-ink-500">Diferencia</span>
                    <span className={`font-mono text-[12.5px] font-bold tabular-nums ${
                      variance == null
                        ? 'text-ink-400'
                        : variance < 0
                        ? 'text-rose-700'
                        : variance > 0
                        ? 'text-emerald-700'
                        : 'text-ink-800'
                    }`}>
                      {variance == null ? '—' : (variance >= 0 ? '+' : '') + money(variance, 'MXN')}
                    </span>
                  </div>
                </div>

                {isShort && (
                  <TextField label="Motivo de faltante" error={closeForm.formState.errors.closingReason?.message}>
                    <textarea rows={3} placeholder="Ej. Faltó cambio en caja" {...closeForm.register('closingReason')} />
                  </TextField>
                )}
                {closeMutation.error && <ErrorMessage message={closeMutation.error.message} />}
                {reopenMutation.error && <ErrorMessage message={reopenMutation.error.message} />}
                <Button
                  kind="primary"
                  size="lg"
                  type="submit"
                  block
                  disabled={closeMutation.isPending || summary?.closed || !(cashCount || summary?.cashCount)}
                  testId="corte-close-shift"
                >
                  {closeMutation.isPending ? 'Cerrando...' : summary?.closed ? '✓ Turno cerrado' : 'Cerrar turno'}
                </Button>
                {hasRole('DUENO') && summary?.closed && (
                  <Button
                    kind="secondary"
                    size="lg"
                    block
                    disabled={reopenMutation.isPending}
                    onClick={() => {
                      const reason = window.prompt('Motivo para reabrir el turno cerrado')
                      if (reason?.trim()) reopenMutation.mutate(reason.trim())
                    }}
                  >
                    {reopenMutation.isPending ? 'Reabriendo...' : 'Reabrir turno'}
                  </Button>
                )}
              </form>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

// ─── Vigilancia (owner-only theft prevention) ─────────────────────────────────
function VigilanciaScreen() {
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(today)
  const [drillActor, setDrillActor] = useState<string | null>(null)

  const patterns = useQuery({
    queryKey: ['oversight-patterns', from, to],
    queryFn: () => api<OversightPatterns>(`/api/v1/oversight/patterns?from=${from}&to=${to}`),
  })

  const actorEvents = useQuery({
    queryKey: ['audit-events', from, to, drillActor],
    enabled: Boolean(drillActor),
    queryFn: () => api<AuditEvent[]>(`/api/v1/audit-events?from=${from}&to=${to}`),
  })

  const data = patterns.data
  const animCortesias = useCountUp(data?.totalCortesias ?? 0)
  const animVoided = useCountUp(data?.totalVoided ?? 0)
  const animFastEdits = useCountUp(data?.totalFastEdits ?? 0)
  const animShortage = useCountUp(Math.abs(data?.totalShortageVariance ?? 0))

  // Severity heuristic: 4+ cortesias + 2+ voids or shortage > 100 ⇒ red
  const overall = data
    ? (Math.abs(data.totalShortageVariance) > 200 || data.totalCortesias > 8 || data.totalVoided > 5 || data.totalFastEdits > 5)
      ? 'red'
      : (data.totalCortesias > 3 || data.totalVoided > 2 || data.totalShortageVariance < 0 || data.totalFastEdits > 1)
        ? 'amber'
        : 'green'
    : 'green'

  return (
    <section className="space-y-5">
      {/* Editorial header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Solo dueño · {from} → {to}
          </p>
          <h2 className="font-display mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">
            Vigilancia
          </h2>
          <p className="mt-1 max-w-xl text-[12.5px] text-ink-500">
            Patrones que ayudan a detectar irregularidades: cortesías, cancelaciones, ediciones rápidas,
            faltantes de caja y acciones fuera de horario.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold ${
            overall === 'red'
              ? 'bg-rose-100 text-rose-700'
              : overall === 'amber'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full ${overall !== 'green' ? 'animate-ping' : ''} rounded-full opacity-75 ${
                overall === 'red' ? 'bg-rose-400' : overall === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${
                overall === 'red' ? 'bg-rose-500' : overall === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
            </span>
            {overall === 'red' ? 'Revisar urgente' : overall === 'amber' ? 'Atención' : 'Normal'}
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400">Desde</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="tl-input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400">Hasta</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="tl-input" />
          </label>
        </div>
      </div>

      {patterns.error && <ErrorMessage message={patterns.error.message} />}

      {/* Red-flag KPI tiles */}
      <div className="tl-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={`tl-lift rounded-2xl border px-4 py-3.5 ${
          (data?.totalCortesias ?? 0) > 3 ? 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-white' : 'border-border-soft bg-white'
        }`}>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Cortesías</p>
          <p className="font-display mt-1 text-[26px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">
            {Math.round(animCortesias)}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">
            {(data?.byActor.filter((a) => a.ticketsCourtesy > 0).length ?? 0) > 0
              ? `Top: ${[...(data?.byActor ?? [])].sort((a, b) => b.ticketsCourtesy - a.ticketsCourtesy)[0]?.actor} (${[...(data?.byActor ?? [])].sort((a, b) => b.ticketsCourtesy - a.ticketsCourtesy)[0]?.ticketsCourtesy})`
              : 'sin cortesías'}
          </p>
        </div>
        <div className={`tl-lift rounded-2xl border px-4 py-3.5 ${
          (data?.totalVoided ?? 0) > 2 ? 'border-rose-200 bg-gradient-to-br from-rose-50/80 to-white' : 'border-border-soft bg-white'
        }`}>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Cancelados</p>
          <p className="font-display mt-1 text-[26px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">
            {Math.round(animVoided)}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">
            {(data?.byActor.filter((a) => a.ticketsVoided > 0).length ?? 0) > 0
              ? `Top: ${[...(data?.byActor ?? [])].sort((a, b) => b.ticketsVoided - a.ticketsVoided)[0]?.actor} (${[...(data?.byActor ?? [])].sort((a, b) => b.ticketsVoided - a.ticketsVoided)[0]?.ticketsVoided})`
              : 'sin cancelaciones'}
          </p>
        </div>
        <div className={`tl-lift rounded-2xl border px-4 py-3.5 ${
          (data?.totalFastEdits ?? 0) > 1 ? 'border-violet-200 bg-gradient-to-br from-violet-50/80 to-white' : 'border-border-soft bg-white'
        }`}>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Edits &lt; 1h</p>
          <p className="font-display mt-1 text-[26px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">
            {Math.round(animFastEdits)}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">Ediciones poco después de crear ticket</p>
        </div>
        <div className={`tl-lift rounded-2xl border px-4 py-3.5 ${
          (data?.totalShortageVariance ?? 0) < 0 ? 'border-rose-200 bg-gradient-to-br from-rose-50/80 to-white' : 'border-border-soft bg-white'
        }`}>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Faltantes</p>
          <p className={`font-display mt-1 text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums ${
            (data?.totalShortageVariance ?? 0) < 0 ? 'text-rose-700' : 'text-ink-900'
          }`}>
            {money(animShortage, 'MXN')}
          </p>
          <p className="mt-1 text-[11px] text-ink-500">
            {(data?.shortages.length ?? 0)} corte{data?.shortages.length === 1 ? '' : 's'} con faltante
          </p>
        </div>
      </div>

      {/* Per-actor activity */}
      <div className="tl-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border-soft bg-ink-50/60 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="h-[18px] w-[3px] rounded-full bg-gradient-to-b from-violet-500 to-violet-700" />
            <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">Actividad por usuario</h3>
          </div>
          <span className="text-[11px] text-ink-400">{data?.byActor.length ?? 0} usuarios activos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="tl-tbl zebra">
            <thead>
              <tr>
                <th>Riesgo</th>
                <th>Usuario</th>
                <th className="r">Tickets</th>
                <th className="r">Editados</th>
                <th className="r">Cancelados</th>
                <th className="r">Cortesías</th>
                <th className="r">Descuentos</th>
                <th className="r">Gastos</th>
                <th className="r">Retiros</th>
                <th className="r">Préstamos</th>
                <th className="r">Cortes</th>
                <th className="r">Ajustes nómina</th>
              </tr>
            </thead>
            <tbody>
              {(data?.byActor ?? []).map((a) => {
                const flag = (n: number, threshold: number) => n >= threshold ? 'font-bold text-rose-700' : ''
                const levelStyle =
                  a.suspicionLevel === 'HIGH'
                    ? 'bg-rose-100 text-rose-700'
                    : a.suspicionLevel === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-700'
                    : a.suspicionLevel === 'LOW'
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-emerald-100 text-emerald-700'
                const levelLabel =
                  a.suspicionLevel === 'HIGH' ? 'Alto'
                  : a.suspicionLevel === 'MEDIUM' ? 'Medio'
                  : a.suspicionLevel === 'LOW' ? 'Bajo'
                  : 'Limpio'
                return (
                  <tr key={a.actor} onClick={() => setDrillActor(a.actor)} className="cursor-pointer">
                    <td>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${levelStyle}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          a.suspicionLevel === 'HIGH' ? 'bg-rose-500'
                          : a.suspicionLevel === 'MEDIUM' ? 'bg-amber-500'
                          : a.suspicionLevel === 'LOW' ? 'bg-violet-500'
                          : 'bg-emerald-500'
                        }`} />
                        {levelLabel} · {a.suspicionScore}
                      </span>
                    </td>
                    <td className="font-semibold text-violet-700 hover:text-violet-900">{a.actor} →</td>
                    <td className="r tabular-nums">{a.ticketsCreated}</td>
                    <td className={`r tabular-nums ${flag(a.ticketsEdited, 3)}`}>{a.ticketsEdited}</td>
                    <td className={`r tabular-nums ${flag(a.ticketsVoided, 3)}`}>{a.ticketsVoided}</td>
                    <td className={`r tabular-nums ${flag(a.ticketsCourtesy, 4)}`}>{a.ticketsCourtesy}</td>
                    <td className="r tabular-nums">{a.ticketsDiscount}</td>
                    <td className="r tabular-nums">{a.expensesCreated}</td>
                    <td className={`r tabular-nums ${flag(a.withdrawalsCreated, 3)}`}>{a.withdrawalsCreated}</td>
                    <td className="r tabular-nums">{a.advancesCreated}</td>
                    <td className="r tabular-nums">{a.shiftsClosed}</td>
                    <td className={`r tabular-nums ${flag(a.payrollAdjustments, 1)}`}>{a.payrollAdjustments}</td>
                  </tr>
                )
              })}
              {(data?.byActor.length ?? 0) === 0 && !patterns.isLoading && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-ink-400">Sin actividad en este rango.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-column detail */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Shortages */}
        <div className="tl-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border-soft bg-ink-50/60 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="h-[18px] w-[3px] rounded-full bg-gradient-to-b from-rose-400 to-rose-600" />
              <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">Cortes con faltante</h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-bold text-rose-700">
              {data?.shortages.length ?? 0}
            </span>
          </div>
          <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
            {(data?.shortages ?? []).map((s) => (
              <div key={s.shiftCloseId} className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink-900">
                      <span className="font-mono tabular-nums">{s.businessDate}</span>
                      <span className="mx-1.5 text-ink-300">·</span>
                      {s.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      Esperado <span className="font-mono">{money(s.expectedCash, 'MXN')}</span> · Contado <span className="font-mono">{money(s.totalCounted, 'MXN')}</span>
                    </p>
                  </div>
                  <span className="font-mono text-[14px] font-bold tabular-nums text-rose-700">
                    {money(s.variance, 'MXN')}
                  </span>
                </div>
                {s.closingReason && (
                  <p className="mt-2 rounded-md bg-white px-2.5 py-1.5 text-[11.5px] italic text-ink-600 ring-1 ring-rose-100">
                    "{s.closingReason}"
                  </p>
                )}
              </div>
            ))}
            {(data?.shortages.length ?? 0) === 0 && !patterns.isLoading && (
              <p className="text-[12.5px] text-emerald-700 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">✓</span>
                Todos los cortes cuadraron en este rango.
              </p>
            )}
          </div>
        </div>

        {/* Off-hours actions */}
        <div className="tl-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border-soft bg-ink-50/60 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="h-[18px] w-[3px] rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
              <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">Fuera de horario</h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">
              {data?.offHoursActions.length ?? 0}
            </span>
          </div>
          <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
            {(data?.offHoursActions ?? []).slice(0, 20).map((e) => (
              <div key={e.id} className="rounded-xl border border-border-soft bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <AuditActionPill action={e.action} />
                  <span className="font-mono text-[11px] text-ink-500 tabular-nums">
                    {new Date(e.occurredAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', hour12: false })}
                  </span>
                </div>
                <p className="mt-1.5 text-[12.5px] text-ink-700">
                  <span className="font-semibold">{e.actorUsername || 'sistema'}</span>
                  {e.entityId && <span className="ml-1 text-ink-400">#{e.entityId}</span>}
                  {e.reason && <span className="ml-2 italic text-ink-500">— {e.reason}</span>}
                </p>
              </div>
            ))}
            {(data?.offHoursActions.length ?? 0) === 0 && !patterns.isLoading && (
              <p className="text-[12.5px] text-emerald-700 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">✓</span>
                Sin acciones fuera de horario.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Fast edits — full width */}
      {(data?.fastEdits.length ?? 0) > 0 && (
        <div className="tl-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border-soft bg-ink-50/60 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="h-[18px] w-[3px] rounded-full bg-gradient-to-b from-violet-400 to-violet-600" />
              <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">Tickets editados &lt; 1h después de crear</h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10.5px] font-bold text-violet-700">
              {data?.fastEdits.length}
            </span>
          </div>
          <div className="p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.fastEdits ?? []).map((e) => (
              <div key={e.id} className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold text-violet-700">#{e.entityId} · {e.details ?? ''}</span>
                  <span className="font-mono text-[11px] text-ink-500 tabular-nums">
                    {new Date(e.occurredAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] text-ink-600">por <span className="font-semibold">{e.actorUsername}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {drillActor && (
        <Modal title={`Actividad de ${drillActor}`} onClose={() => setDrillActor(null)}>
          <div className="space-y-4">
            <p className="text-[12.5px] text-ink-500">
              Últimas acciones de <span className="font-semibold text-ink-800">{drillActor}</span> entre{' '}
              <span className="font-mono tabular-nums">{from}</span> y{' '}
              <span className="font-mono tabular-nums">{to}</span>.
            </p>
            {actorEvents.isLoading && <p className="text-[12.5px] text-ink-400">Cargando…</p>}
            {actorEvents.error && <ErrorMessage message={actorEvents.error.message} />}
            {actorEvents.data && (() => {
              const filtered = actorEvents.data
                .filter((e) => (e.actorUsername || 'system') === drillActor)
                .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
              if (filtered.length === 0) {
                return <p className="text-[12.5px] text-ink-400">Sin eventos en este rango.</p>
              }
              // Group by action for the top stats
              const counts: Record<string, number> = {}
              filtered.forEach((e) => { counts[e.action] = (counts[e.action] ?? 0) + 1 })
              const topActions = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
              return (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {topActions.map(([action, n]) => (
                      <span key={action} className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-[11.5px] font-semibold text-ink-700">
                        <AuditActionPill action={action} />
                        <span className="font-mono tabular-nums">{n}</span>
                      </span>
                    ))}
                  </div>
                  <div className="max-h-[480px] overflow-y-auto rounded-xl border border-border-soft">
                    <table className="tl-tbl">
                      <thead>
                        <tr>
                          <th className="w-32">Hora</th>
                          <th>Acción</th>
                          <th>Entidad</th>
                          <th>Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.slice(0, 200).map((e) => (
                          <tr key={e.id}>
                            <td className="font-mono text-[11.5px] text-ink-500 tabular-nums">
                              {new Date(e.occurredAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', hour12: false })}
                            </td>
                            <td><AuditActionPill action={e.action} /></td>
                            <td className="text-[12px] text-ink-600">
                              {e.entityType}
                              {e.entityId != null && <span className="ml-1 text-ink-400">#{e.entityId}</span>}
                            </td>
                            <td className="text-[12px] text-ink-700">
                              {e.reason ? <span className="italic">{e.reason}</span> : null}
                              {e.reason && e.details ? <span className="mx-1 text-ink-300">·</span> : null}
                              {e.details ? <span className="font-mono text-[11px] text-ink-500">{e.details}</span> : null}
                              {!e.reason && !e.details ? <span className="text-ink-300">—</span> : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filtered.length > 200 && (
                    <p className="text-[11.5px] text-ink-400 text-center">
                      Mostrando 200 de {filtered.length} eventos.
                    </p>
                  )}
                </>
              )
            })()}
          </div>
        </Modal>
      )}
    </section>
  )
}

function AuditActionPill({ action }: { action: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    // Backend-emitted actions (canonical)
    TICKET_CREATED:               { bg: 'bg-violet-50',  text: 'text-violet-700', label: 'Ticket' },
    TICKET_EDITED:                { bg: 'bg-violet-50',  text: 'text-violet-700', label: 'Ticket edit' },
    TICKET_VOIDED:                { bg: 'bg-rose-50',    text: 'text-rose-700',   label: 'Cancelado' },
    TICKET_COURTESY:              { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Cortesía' },
    TICKET_DISCOUNT:              { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Descuento' },
    TICKET_PRICE_OVERRIDE:        { bg: 'bg-rose-50',    text: 'text-rose-700',   label: 'Precio manual' },
    TICKET_HIGH_DISCOUNT:         { bg: 'bg-rose-50',    text: 'text-rose-700',   label: 'Descuento alto' },
    EMPLOYEE_ADVANCE_FLAGGED:     { bg: 'bg-rose-50',    text: 'text-rose-700',   label: 'Anticipo frecuente' },
    SHIFT_CLOSED:                 { bg: 'bg-violet-50',  text: 'text-violet-700', label: 'Turno cerrado' },
    SHIFT_REOPENED:               { bg: 'bg-rose-50',    text: 'text-rose-700',   label: 'Turno reabierto' },
    EXPENSE_CREATED:              { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Gasto' },
    WITHDRAWAL_CREATED:           { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Retiro' },
    ADVANCE_CREATED:              { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Préstamo' },
    DEBT_PAYMENT_CREATED:         { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Pago deuda' },
    CASH_COUNT_CREATED:           { bg: 'bg-violet-50',  text: 'text-violet-700', label: 'Conteo caja' },
    EMPLOYEE_CREATED_SALARIED:    { bg: 'bg-violet-50',  text: 'text-violet-700', label: 'Empleado salario' },
    EMPLOYEE_COMP_CHANGED:        { bg: 'bg-rose-50',    text: 'text-rose-700',   label: 'Cambio sueldo' },
    PAYROLL_PERIOD_CREATED:       { bg: 'bg-violet-50',  text: 'text-violet-700', label: 'Nómina período' },
    PAYROLL_COMPUTED:             { bg: 'bg-violet-50',  text: 'text-violet-700', label: 'Nómina calc.' },
    PAYROLL_LOCKED:               { bg: 'bg-violet-50',  text: 'text-violet-700', label: 'Nómina bloqueada' },
    PAYROLL_UNLOCKED:             { bg: 'bg-rose-50',    text: 'text-rose-700',   label: 'Nómina desbloqueada' },
    PAYROLL_ADJUSTMENT_CREATED:   { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Ajuste nómina' },
    PAYROLL_ADJUSTMENT_LARGE:     { bg: 'bg-rose-50',    text: 'text-rose-700',   label: 'Ajuste grande' },
    PAYROLL_ADJUSTMENT_DELETED:   { bg: 'bg-rose-50',    text: 'text-rose-700',   label: 'Ajuste eliminado' },
    PAYROLL_EXPORTED:             { bg: 'bg-slate-100',  text: 'text-slate-600',  label: 'Nómina export' },
    // Legacy keys kept for backward compat
    TICKET_VOID:        { bg: 'bg-rose-50',     text: 'text-rose-700',   label: 'Cancelado' },
    TICKET_CREATE:      { bg: 'bg-violet-50',   text: 'text-violet-700', label: 'Ticket' },
    TICKET_UPDATE:      { bg: 'bg-violet-50',   text: 'text-violet-700', label: 'Ticket edit' },
    SHIFT_OPEN:         { bg: 'bg-slate-100',   text: 'text-slate-600',  label: 'Turno abierto' },
    SHIFT_CLOSE:        { bg: 'bg-violet-50',   text: 'text-violet-700', label: 'Turno cerrado' },
    DAY_OPEN:           { bg: 'bg-slate-100',   text: 'text-slate-600',  label: 'Día abierto' },
    DAY_CLOSE:          { bg: 'bg-slate-100',   text: 'text-slate-600',  label: 'Día cerrado' },
    EXPENSE_CREATE:     { bg: 'bg-amber-50',    text: 'text-amber-700',  label: 'Gasto' },
    WITHDRAWAL_CREATE:  { bg: 'bg-amber-50',    text: 'text-amber-700',  label: 'Retiro' },
    ADVANCE_CREATE:     { bg: 'bg-amber-50',    text: 'text-amber-700',  label: 'Préstamo' },
    CASH_COUNT_SAVE:    { bg: 'bg-violet-50',   text: 'text-violet-700', label: 'Corte caja' },
    INVENTORY_IN:       { bg: 'bg-emerald-50',  text: 'text-emerald-700', label: 'Entrada inv.' },
    INVENTORY_OUT:      { bg: 'bg-emerald-50',  text: 'text-emerald-700', label: 'Salida inv.' },
    INVENTORY_ADJ:      { bg: 'bg-emerald-50',  text: 'text-emerald-700', label: 'Ajuste inv.' },
    PAYROLL_PERIOD:     { bg: 'bg-violet-50',   text: 'text-violet-700', label: 'Nómina' },
    PAYROLL_ADJUSTMENT: { bg: 'bg-violet-50',   text: 'text-violet-700', label: 'Ajuste nómina' },
  }
  const style = cfg[action] ?? { bg: 'bg-ink-100', text: 'text-ink-600', label: action.replace(/_/g, ' ') }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
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

  const queryClient = useQueryClient()
  const flagged = useQuery({
    queryKey: ['audit-events', 'flagged'],
    queryFn: () => api<AuditEvent[]>('/api/v1/audit-events/flagged'),
  })
  const review = useMutation({
    mutationFn: (id: number) => api<AuditEvent>(`/api/v1/audit-events/${id}/review`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['audit-events'] })
    },
  })
  const pendingFlagged = flagged.data ?? []

  return (
    <section className="space-y-5">
      <PageHead
        tone="hero"
        title="Auditoria"
        subtitle="Cambios importantes de caja, tickets, gastos, nomina y correcciones."
      />

      {pendingFlagged.length > 0 && (
        <Panel tone="warn" title={`Cambios irregulares por revisar (${pendingFlagged.length})`}>
          <p className="mb-3 text-[13px] text-ink-600">
            Cambios grandes de nomina o de pago del personal. Revisa cada uno y marcalo como revisado.
          </p>
          <div className="space-y-2">
            {pendingFlagged.map((event) => (
              <div key={event.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-900">{event.reason || event.action}</p>
                  {event.details && <p className="text-xs text-amber-700">{event.details}</p>}
                  <p className="mt-0.5 text-[11px] text-amber-600">
                    {event.actorUsername} · {formatDateTime(event.occurredAt)}
                  </p>
                </div>
                <Button
                  kind="primary"
                  size="sm"
                  onClick={() => review.mutate(event.id)}
                  disabled={review.isPending}
                >
                  Marcar revisado
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      )}

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
            <input type="number" inputMode="decimal" min={1} value={entityId} onChange={(event) => setEntityId(event.target.value)} />
          </TextField>
        </div>
      </Panel>

      <Panel title="Eventos recientes">
        {events.error && <ErrorMessage message={events.error.message} />}
        <div className="overflow-hidden rounded-xl border border-border-soft">
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
                <tr key={event.id} className={event.severity === 'FLAGGED' ? 'bg-amber-50' : ''}>
                  <td className="whitespace-nowrap text-ink-500">{formatDateTime(event.occurredAt)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatars names={[event.actorUsername]} />
                      <span className="text-sm">{event.actorUsername}</span>
                    </div>
                  </td>
                  <td><AuditActionPill action={event.action} /></td>
                  <td className="text-ink-500">{event.entityType}{event.entityId ? ` #${event.entityId}` : ''}</td>
                  <td>{event.reason || '-'}</td>
                  <td className="text-ink-500">{event.details || '-'}</td>
                </tr>
              ))}
              {!events.isLoading && (events.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<IAudit size={20} />}
                      title="Sin eventos para estos filtros"
                      description="Cambia el rango o la entidad para ver mas registros."
                      tone="info"
                    />
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

  const resultValue = range ? Number(range.result) : null
  const resultTone: MetricVariant = resultValue == null ? 'feature' : resultValue >= 0 ? 'feature' : 'danger'

  return (
    <section className="space-y-5">
      <PageHead
        tone="hero"
        title="Reportes"
        subtitle="Resumen diario, mensual, corte de caja, lavadores y exportacion Excel."
      />

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
            <Button kind="primary" onClick={downloadExport} testId="reports-export" block>
              Descargar Excel
            </Button>
          </div>
        </div>
        {downloadError && <ErrorMessage message={downloadError} />}
      </Panel>

      {(daily.error || monthly.error || cashVariance.error || performance.error || preview.error) && (
        <ErrorMessage message={(daily.error || monthly.error || cashVariance.error || performance.error || preview.error)!.message} />
      )}

      <div className="tl-stagger grid gap-4 md:grid-cols-3 xl:grid-cols-6" data-testid="reports-range-metrics">
        {(() => {
          const sk = (wide?: boolean) => <span className={`tl-metric-skeleton${wide ? ' wide' : ''}`} />
          return (
            <>
              <Metric label="Ingresos" tone="good" value={range ? money(range.ticketRevenue, 'MXN') : sk(true)} />
              <Metric label="Salidas" tone="bad" value={range ? money(range.expensesTotal, 'MXN') : sk(true)} />
              <Metric label="Resultado" variant={resultTone} value={range ? money(range.result, 'MXN') : sk(true)} />
              <Metric label="Carros" tone="info" value={range ? String(range.carsWashed) : sk()} />
              <Metric label="Cortesias" value={range ? String(range.courtesyCount) : sk()} />
              <Metric label="Anulados" tone="warn" value={range ? String(range.voidedCount) : sk()} />
            </>
          )
        })()}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Panel title="Resumen por dia">
            <div className="overflow-hidden rounded-xl border border-border-soft">
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
                  {(range?.days ?? []).map((day) => {
                    const dayResult = Number(day.result)
                    const dayVar = day.cashVariance == null ? null : Number(day.cashVariance)
                    return (
                      <tr key={day.date}>
                        <td className="font-semibold">{day.date}</td>
                        <td className="r">{day.carsWashed}</td>
                        <td className="r">{money(day.ticketRevenue, 'MXN')}</td>
                        <td className="r">{money(day.expensesTotal, 'MXN')}</td>
                        <td className={`r ${dayResult >= 0 ? 'tl-money-good' : 'tl-money-bad'}`}>{money(day.result, 'MXN')}</td>
                        <td className={`r ${dayVar == null ? '' : dayVar >= 0 ? 'tl-money-good' : 'tl-money-bad'}`}>
                          {dayVar == null ? '-' : money(day.cashVariance, 'MXN')}
                        </td>
                      </tr>
                    )
                  })}
                  {!daily.isLoading && (range?.days.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          icon={<IReports size={20} />}
                          title="Sin datos en este rango"
                          description="Ajusta las fechas para ver el resumen diario."
                          tone="purple"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Rendimiento de lavadores">
            <div className="overflow-hidden rounded-xl border border-border-soft">
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
                      <td colSpan={4}>
                        <EmptyState
                          icon={<IPayroll size={20} />}
                          title="Sin lavadores con tickets"
                          description="No se acreditaron tickets a ningun lavador en este rango."
                          tone="info"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel tone="accent" title="Varianza de caja">
            <div className="tl-stagger grid gap-4 md:grid-cols-3" data-testid="reports-cash-variance">
              <Metric label="Esperado" tone="info" value={cashVariance.data ? money(cashVariance.data.expectedCash, 'MXN') : <span className="tl-metric-skeleton wide" />} />
              <Metric label="Contado" tone="info" value={cashVariance.data ? money(cashVariance.data.totalCounted, 'MXN') : <span className="tl-metric-skeleton wide" />} />
              <Metric
                label="Diferencia"
                tone={
                  cashVariance.data == null
                    ? 'default'
                    : Number(cashVariance.data.variance) >= 0
                      ? 'good'
                      : 'bad'
                }
                value={cashVariance.data ? money(cashVariance.data.variance, 'MXN') : <span className="tl-metric-skeleton wide" />}
              />
            </div>
            <div className="overflow-hidden rounded-xl border border-border-soft">
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
                  {(cashVariance.data?.rows ?? []).map((row) => {
                    const rowVar = Number(row.variance)
                    return (
                      <tr key={`${row.shiftId}-${row.date}`}>
                        <td>{row.date}</td>
                        <td>{row.shiftType}</td>
                        <td className="r">{money(row.expectedCash, 'MXN')}</td>
                        <td className="r">{money(row.totalCounted, 'MXN')}</td>
                        <td className={`r ${rowVar >= 0 ? 'tl-money-good' : 'tl-money-bad'}`}>{money(row.variance, 'MXN')}</td>
                      </tr>
                    )
                  })}
                  {!cashVariance.isLoading && (cashVariance.data?.rows.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          icon={<ICash size={20} />}
                          title="Sin cortes cerrados"
                          description="No hay cortes cerrados en este rango de fechas."
                          tone="info"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Export preview">
            <div className="tl-stagger flex flex-col gap-2">
              {(() => {
                const sk = (wide?: boolean) => <span className={`tl-metric-skeleton${wide ? ' wide' : ''}`} />
                const p = preview.data
                return (
                  <>
                    <StatStrip tone="info" label="Tickets" value={p ? String(p.ticketCount) : sk()} />
                    <StatStrip tone="good" label="Ingresos" value={p ? money(p.ticketRevenue, 'MXN') : sk(true)} />
                    <StatStrip tone="bad" label="Gastos" value={p ? money(p.expensesTotal, 'MXN') : sk(true)} />
                    <StatStrip tone="warn" label="Retiros" value={p ? money(p.withdrawalsTotal, 'MXN') : sk(true)} />
                    <StatStrip tone="warn" label="Préstamos" value={p ? money(p.advancesTotal, 'MXN') : sk(true)} />
                    <StatStrip tone="info" label="Cortes" value={p ? String(p.shiftCloseCount) : sk()} />
                    <StatStrip tone="purple" label="Inventario" value={p ? String(p.inventoryMovementCount) : sk()} />
                    <StatStrip tone="purple" label="Nómina" value={p ? String(p.payrollPeriodCount) : sk()} />
                  </>
                )
              })()}
            </div>
          </Panel>

          <Panel tone="feature" title="Resumen mensual">
            <div className="flex flex-col gap-2">
              {(() => {
                const sk = <span className="tl-skeleton-dark sm" />
                const m = monthly.data
                return (
                  <>
                    <SummaryRow label="Mes" value={m ? `${m.year}-${String(m.month).padStart(2, '0')}` : sk} />
                    <SummaryRow label="Carros" value={m ? String(m.carsWashed) : sk} />
                    <SummaryRow label="Ingresos" value={m ? money(m.ticketRevenue, 'MXN') : sk} />
                    <SummaryRow label="Resultado" value={m ? money(m.result, 'MXN') : sk} />
                  </>
                )
              })()}
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
            {(() => {
              const sk = (wide?: boolean) => <span className={`tl-metric-skeleton${wide ? ' wide' : ''}`} />
              const h = historical.data
              return (
                <>
                  <Metric label="Días" value={h ? String(h.totalDays) : sk()} />
                  <Metric label="Carros" value={h ? String(h.totalCars) : sk()} />
                  <Metric label="Ingresos" tone="good" value={h ? money(h.totalRevenue, 'MXN') : sk(true)} />
                  <Metric label="Resultado" tone="info" value={h ? money(h.totalResultado, 'MXN') : sk(true)} />
                </>
              )
            })()}
          </div>

          <div className="overflow-hidden rounded-xl border border-border-soft">
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
                    <td colSpan={6}>
                      <EmptyState
                        icon={<IReports size={20} />}
                        title="Sin datos históricos en este rango"
                        description="Ajusta las fechas para ver los días previos."
                        tone="info"
                      />
                    </td>
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

  const totalProducts = products.data?.length ?? 0

  return (
    <section className="space-y-5">
      {/* ─── Editorial header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Misceláneas · stock vivo</p>
          <h2 className="font-display mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">Inventario</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="tl-btn tl-btn-primary" onClick={() => setModal('product')}>+ Producto</button>
          <button className="tl-btn tl-btn-secondary" onClick={() => setModal('sale')}>Venta</button>
          <button className="tl-btn tl-btn-secondary" onClick={() => setModal('purchase')}>Compra</button>
          <button className="tl-btn tl-btn-secondary" onClick={() => setModal('adjustment')}>Ajuste</button>
        </div>
      </div>

      {(products.error || snapshot.error) && <ErrorMessage message={(products.error || snapshot.error)!.message} />}

      {/* ─── Hero stats ──────────────────────────────────────────── */}
      <div className="tl-stagger grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="tl-lift rounded-2xl border border-border-soft bg-gradient-to-br from-violet-50/60 to-white px-4 py-3.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Productos activos</p>
          <p className="font-display mt-1 text-[26px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">{totalProducts}</p>
        </div>
        <div className="tl-lift rounded-2xl border border-border-soft bg-gradient-to-br from-emerald-50/60 to-white px-4 py-3.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Valor estimado</p>
          <p className="font-display mt-1 text-[26px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">{money(totalValue, 'MXN')}</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3.5 ${lowCount > 0 ? 'border-rose-200 bg-gradient-to-br from-rose-50/80 to-white' : 'border-border-soft bg-white'}`}>
          <p className={`text-[10.5px] font-semibold uppercase tracking-[0.12em] ${lowCount > 0 ? 'text-rose-700' : 'text-ink-400'}`}>Stock bajo</p>
          <p className={`font-display mt-1 text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums ${lowCount > 0 ? 'text-rose-700' : 'text-ink-900'}`}>{lowCount}</p>
        </div>
      </div>

      {/* ─── Snapshot date control ────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border-soft bg-white p-3">
        <TextField label="Ver inventario hasta">
          <input type="datetime-local" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
        </TextField>
        <p className="pb-2 text-[12px] text-ink-400">{asOf ? '' : 'Si lo dejas vacío, usa la hora actual.'}</p>
      </div>

      {/* ─── Category panels ──────────────────────────────────────── */}
      {(['AROMA', 'SNACK', 'OTRO'] as ProductCategory[]).map((cat) => {
        const catRows = rows.filter((row) => (row.product.category ?? 'OTRO') === cat)
        if (catRows.length === 0) return null
        const catMeta = cat === 'AROMA'
          ? { label: 'Aromas', icon: '🌿', color: 'bg-gradient-to-b from-emerald-400 to-emerald-600', tint: 'bg-emerald-50/40' }
          : cat === 'SNACK'
          ? { label: 'Snacks', icon: '🍫', color: 'bg-gradient-to-b from-amber-400 to-amber-600', tint: 'bg-amber-50/40' }
          : { label: 'Otros', icon: '📦', color: 'bg-gradient-to-b from-ink-500 to-ink-700', tint: 'bg-ink-50/40' }
        const catValue = catRows.reduce((sum, r) => sum + r.quantityOnHand * r.product.currentUnitPrice, 0)
        return (
          <div key={cat} className="tl-panel overflow-hidden">
            <div className={`flex items-center justify-between border-b border-border-soft px-5 py-3.5 ${catMeta.tint}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-md text-[14px] text-white shadow-sm ${catMeta.color}`}>
                  {catMeta.icon}
                </span>
                <div>
                  <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">{catMeta.label}</h3>
                  <p className="text-[10.5px] text-ink-500">{catRows.length} producto{catRows.length === 1 ? '' : 's'} · {money(catValue, 'MXN')}</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="tl-tbl zebra">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th className="r">Stock</th>
                    <th className="r">Precio</th>
                    <th>Último movimiento</th>
                    <th>Indicador</th>
                    <th className="r">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {catRows.map((row) => {
                    const latest = row.recentMovements[0]
                    const lowStock = row.product.trackInventory && row.quantityOnHand <= 5
                    return (
                      <tr key={row.product.id}>
                        <td className="font-semibold">{row.product.name}</td>
                        <td className="font-mono text-[12px] text-ink-500">{row.product.sku || '-'}</td>
                        <td className="r tabular-nums font-semibold">{row.quantityOnHand.toFixed(2)}</td>
                        <td className="r tabular-nums">{money(row.product.currentUnitPrice, 'MXN')}</td>
                        <td className="text-[12.5px] text-ink-500">
                          {latest ? `${movementLabel(latest.movementType)} / ${latest.quantity}` : 'Sin movimientos'}
                        </td>
                        <td>
                          <InventoryStatusPill lowStock={lowStock} tracked={row.product.trackInventory} />
                        </td>
                        <td className="r">
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => {
                              setEditingProduct(row.product)
                              setModal('product')
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-violet-50 hover:text-violet-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      {!snapshot.isLoading && rows.length === 0 && (
        <div className="rounded-2xl border border-border-soft bg-white p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
            <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <rect x="4" y="7" width="16" height="13" rx="2" />
              <path d="M9 7V5a3 3 0 016 0v2" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-ink-700">No hay productos todavía.</p>
          <p className="mt-1 text-[12.5px] text-ink-400">Crea un producto y registra una compra inicial para empezar el inventario.</p>
          <button className="tl-btn tl-btn-primary tl-btn-sm mt-4" onClick={() => setModal('product')}>+ Nuevo producto</button>
        </div>
      )}

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
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku,
          currentUnitPrice: product.currentUnitPrice,
          trackInventory: product.trackInventory,
          active: product.active,
          category: product.category ?? 'OTRO',
        }
      : { name: '', sku: '', currentUnitPrice: 0, trackInventory: true, active: true, category: 'OTRO' },
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
        category: values.category,
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
          <input type="number" inputMode="decimal" min={0} step="0.01" {...form.register('currentUnitPrice')} />
        </TextField>
        <SelectField label="Categoría">
          <select {...form.register('category')}>
            <option value="AROMA">Aroma</option>
            <option value="SNACK">Snack</option>
            <option value="OTRO">Otro</option>
          </select>
        </SelectField>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" {...form.register('trackInventory')} className="h-4 w-4 rounded border-border-soft text-violet-600" />
          Controlar inventario
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" {...form.register('active')} className="h-4 w-4 rounded border-border-soft text-violet-600" />
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
  const phaseData = usePhaseData()
  const openShiftId = phaseData.shifts.data?.find((s) => s.status === 'OPEN')?.id ?? null
  const form = useForm<InventorySaleFormValues>({
    resolver: zodResolver(inventorySaleSchema) as Resolver<InventorySaleFormValues>,
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
        shiftId: !values.fiado && openShiftId ? openShiftId : undefined,
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
        <input type="checkbox" {...form.register('fiado')} className="h-4 w-4 rounded border-border-soft text-violet-600" />
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
    resolver: zodResolver(inventoryPurchaseSchema) as Resolver<InventoryPurchaseFormValues>,
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
    resolver: zodResolver(inventoryAdjustmentSchema) as Resolver<InventoryAdjustmentFormValues>,
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
          <input type="number" inputMode="decimal" step="0.01" {...form.register('quantity')} />
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
  // T is constrained to two concrete shapes that both have quantity/unitPrice/
  // movementDate, but TypeScript's Path<T> can't narrow across the union.
  // Alias the form as one of the concrete shapes for field access only.
  const f = form as unknown as UseFormReturn<InventorySaleFormValues>
  return (
    <Modal title={title} onClose={onClose} narrow>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <ProductSelect products={products} form={form} />
        <TextField label="Cantidad" error={f.formState.errors.quantity?.message}>
          <input type="number" inputMode="decimal" min={0} step="0.01" {...f.register('quantity')} />
        </TextField>
        <TextField label="Precio unitario" error={f.formState.errors.unitPrice?.message}>
          <input type="number" inputMode="decimal" min={0} step="0.01" placeholder="0 usa precio del producto en venta" {...f.register('unitPrice')} />
        </TextField>
        <TextField label="Fecha y hora">
          <input type="datetime-local" {...f.register('movementDate')} />
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
    resolver: zodResolver(payrollPeriodSchema) as Resolver<PayrollPeriodFormValues>,
    defaultValues: { startDate: previousSunday(today) },
  })
  const adjustmentForm = useForm<PayrollAdjustmentFormValues>({
    resolver: zodResolver(payrollAdjustmentSchema) as Resolver<PayrollAdjustmentFormValues>,
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
      setToast("Período creado")
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
      setToast('Ajuste guardado.')
      if (selectedPeriod?.status !== 'LOCKED') compute.mutate()
    },
  })
  const deleteAdjustment = useMutation({
    mutationFn: (id: number) => api<void>(`/api/v1/payroll/adjustments/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await invalidatePayroll(queryClient)
      setToast('Ajuste eliminado.')
      if (selectedPeriod?.status !== 'LOCKED') compute.mutate()
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

  // Auto-compute when an OPEN period is loaded/selected
  useEffect(() => {
    if (selectedPeriod?.status === 'OPEN' && !compute.isPending) {
      compute.mutate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod?.id])

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

      {/* ─── Editorial header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Cálculo semanal · domingo a sábado</p>
          <h2 className="font-display mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">Nómina</h2>
          {selectedPeriod && (
            <p className="mt-1 text-[12.5px] text-ink-500">
              <span className="font-mono tabular-nums">{selectedPeriod.startDate}</span>
              <span className="mx-1.5 text-ink-300">→</span>
              <span className="font-mono tabular-nums">{selectedPeriod.endDate}</span>
              {locked && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">Bloqueada</span>}
            </p>
          )}
        </div>
        <form className="flex flex-wrap items-end gap-2 rounded-2xl border border-border-soft bg-white p-3" onSubmit={form.handleSubmit((values) => createPeriod.mutate(values))} data-testid="payroll-period-form">
          <TextField label="Domingo" error={form.formState.errors.startDate?.message}>
            <input type="date" {...form.register('startDate')} data-testid="payroll-start-date" />
          </TextField>
          <button data-testid="payroll-create-period" className="tl-btn tl-btn-primary">
            + Período
          </button>
        </form>
      </div>
      {createPeriod.error && <ErrorMessage message={createPeriod.error.message} />}

      {/* ─── KPI strip ────────────────────────────────────────────── */}
      {selectedPeriod && (
        <div className="tl-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="tl-lift rounded-2xl border border-border-soft bg-gradient-to-br from-violet-50/60 to-white px-4 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Carros</p>
            <p className="font-display mt-1 text-[22px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">{totals.cars}</p>
          </div>
          <div className="tl-lift rounded-2xl border border-border-soft bg-gradient-to-br from-emerald-50/60 to-white px-4 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Comisiones</p>
            <p className="font-display mt-1 text-[22px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">{money(totals.commissions, 'MXN')}</p>
          </div>
          <div className="tl-lift rounded-2xl border border-border-soft bg-gradient-to-br from-amber-50/60 to-white px-4 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Préstamos descontados</p>
            <p className="font-display mt-1 text-[22px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">{money(totals.advances, 'MXN')}</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-100/40 to-white px-4 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-violet-700">Total a pagar</p>
            <p className="font-display mt-1 text-[22px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">{money(totals.net, 'MXN')}</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
        <Panel title="Períodos">
          <SelectField label="Estado">
            <select value={status} onChange={(event) => setStatus(event.target.value as PayrollPeriodStatus | '')}>
              <option value="">Todos</option>
              <option value="OPEN">Abiertos</option>
              <option value="COMPUTED">Calculados</option>
              <option value="LOCKED">Bloqueados</option>
            </select>
          </SelectField>
          <div className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft">
            {(periods.data ?? []).map((item) => (
              <button
                key={item.id}
                className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm hover:bg-ink-50 ${
                  selectedId === item.id ? 'bg-blue-50 text-blue-800' : ''
                }`}
                onClick={() => {
                  setSelectedPeriodId(item.id)
                  setSelectedEmployeeId(null)
                }}
              >
                <span>
                  <strong className="block">{item.startDate}</strong>
                  <span className="text-ink-400">al {item.endDate}</span>
                </span>
                <PayrollStatusPill status={item.status} />
              </button>
            ))}
            {!periods.isLoading && (periods.data ?? []).length === 0 && (
              <EmptyState
                icon={<IPayroll size={20} />}
                title="Sin períodos de nómina"
                description="Crea uno con la fecha del domingo del período a calcular."
                tone="info"
              />
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Resumen semanal">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-ink-400">Período</p>
                <p className="font-semibold">{selectedPeriod ? `${selectedPeriod.startDate} al ${selectedPeriod.endDate}` : 'Sin seleccionar'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!selectedId || locked || compute.isPending}
                  data-testid="payroll-compute"
                  className="tl-btn tl-btn-primary"
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
                  <Button
                    kind="secondary"
                    disabled={unlock.isPending}
                    onClick={() => {
                      const reason = window.prompt('Motivo para desbloquear la nomina')
                      if (reason?.trim()) unlock.mutate(reason.trim())
                    }}
                  >
                    Desbloquear
                  </Button>
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
            <div className="overflow-hidden rounded-xl border border-border-soft">
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
                    <th className="r">Bruto</th>
                    <th className="r">Neto</th>
                  </tr>
                </thead>
                <tbody className="">
                  {(selectedPeriod?.entries ?? []).map((entry) => (
                    <tr
                      key={entry.id}
                      className="cursor-pointer hover:bg-ink-50"
                      onClick={() => setSelectedEmployeeId(entry.employeeId)}
                    >
                      <td className="font-semibold">{entry.employeeName}</td>
                      <td className="r">{entry.carsWashed.toFixed(2)}</td>
                      <td className="r">{money(entry.baseSalary + entry.restDayPay - entry.absenceDeduction, 'MXN')}</td>
                      <td className="r">{money(entry.carsBonus, 'MXN')}</td>
                      <td className="r">{money(entry.commissions, 'MXN')}</td>
                      <td className="r">{money(entry.manualEarnings, 'MXN')}</td>
                      <td className="r">{money(entry.manualDeductions, 'MXN')}</td>
                      <td className="r">{money(entry.advancesDeducted, 'MXN')}</td>
                      <td className="r">{money(entry.grossPay, 'MXN')}</td>
                      <td className="r font-semibold">{money(entry.netPay, 'MXN')}</td>
                    </tr>
                  ))}
                  {!period.isLoading && (selectedPeriod?.entries.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-ink-400">
                        Crea o selecciona un período para calcular automáticamente.
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
                <input type="number" inputMode="decimal" min={0.01} step="0.01" {...adjustmentForm.register('amount')} disabled={locked} />
              </TextField>
              <TextField label="Nota" error={adjustmentForm.formState.errors.note?.message}>
                <input placeholder="clima, permiso, enfermo..." {...adjustmentForm.register('note')} disabled={locked} />
              </TextField>
              <button
                type="submit"
                disabled={!selectedId || locked || addAdjustment.isPending}
                data-testid="payroll-add-adjustment"
                className="tl-btn tl-btn-primary"
              >
                Agregar
              </button>
            </form>
            {(addAdjustment.error || deleteAdjustment.error) && <ErrorMessage message={(addAdjustment.error || deleteAdjustment.error)!.message} />}
            <div className="overflow-hidden rounded-xl border border-border-soft">
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
                      <td className="text-ink-500">{adjustment.note || '-'}</td>
                      <td className="r">{adjustment.type === 'EARNING' ? money(adjustment.amount, 'MXN') : '-'}</td>
                      <td className="r">{adjustment.type === 'DEDUCTION' ? money(adjustment.amount, 'MXN') : '-'}</td>
                      <td className="r">
                        <button
                          type="button"
                          disabled={locked || deleteAdjustment.isPending}
                          onClick={() => deleteAdjustment.mutate(adjustment.id)}
                          className="rounded-lg border border-red-100 px-3 py-1 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 active:scale-[0.98] disabled:text-ink-300"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(selectedPeriod?.adjustments.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
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
                <div className="space-y-1.5 text-sm">
                  <SummaryRow label="Lavador" value={selectedEntry.employeeName} />
                  <div className="my-2 border-t border-border-soft" />
                  <SummaryRow label="Sueldo base" value={money(selectedEntry.baseSalary, 'MXN')} />
                  {selectedEntry.restDayPay > 0 && (
                    <SummaryRow label="+ Dia de descanso" value={money(selectedEntry.restDayPay, 'MXN')} />
                  )}
                  {selectedEntry.absenceDeduction > 0 && (
                    <SummaryRow label="- Faltas" value={`-${money(selectedEntry.absenceDeduction, 'MXN')}`} />
                  )}
                  <SummaryRow label={`+ Bono carros (${selectedEntry.carsWashed.toFixed(2)})`} value={money(selectedEntry.carsBonus, 'MXN')} />
                  <SummaryRow label="+ Comision" value={money(selectedEntry.commissions, 'MXN')} />
                  <SummaryRow label="+ Extras" value={money(selectedEntry.manualEarnings, 'MXN')} />
                  <div className="flex items-center justify-between border-t border-border-soft pt-2 font-semibold">
                    <span>= Bruto</span>
                    <span>{money(selectedEntry.grossPay, 'MXN')}</span>
                  </div>
                  <SummaryRow label="- Deducciones" value={`-${money(selectedEntry.manualDeductions, 'MXN')}`} />
                  <SummaryRow label="- Prestamos" value={`-${money(selectedEntry.advancesDeducted, 'MXN')}`} />
                  <div className="flex items-center justify-between border-t border-border-soft pt-2 text-base font-bold text-violet-700">
                    <span>= Neto a pagar</span>
                    <span>{money(selectedEntry.netPay, 'MXN')}</span>
                  </div>
                  <div className="my-2 border-t border-border-soft" />
                  <SummaryRow label="Saldo deuda" value={debt.data ? money(debt.data.balance, 'MXN') : <span className="tl-metric-skeleton" />} />
                </div>
                <div className="overflow-hidden rounded-xl border border-border-soft">
                  <table className="tl-tbl zebra">
                    <thead className="">
                      <tr>
                        <th>Día</th>
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
              <p className="text-sm text-ink-400">Selecciona una fila para ver detalle y saldo de deuda.</p>
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
      <input type="number" inputMode="numeric" min={0} step={1} {...form.register(name)} data-testid={`cash-input-${String(name)}`} />
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

const packageSchema = z.object({
  shiftId: z.coerce.number().positive('Selecciona un turno'),
  washesIncluded: z.coerce.number().int().min(1, 'Minimo 1'),
  amount: z.coerce.number().min(0.01, 'Minimo $0.01'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).default('CASH'),
  notes: z.string().max(500).optional(),
})
type PackageFormValues = z.infer<typeof packageSchema>

function PrepaidPackageScreen() {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState<string | null>(null)
  const [calcServiceId, setCalcServiceId] = useState(0)
  const [calcSizeId, setCalcSizeId] = useState(0)
  const data = usePhaseData()
  const effectiveBusinessDay = data.currentBusinessDay ?? data.businessDays.data?.[0]
  const openShifts = (data.shifts.data ?? []).filter((s) => s.status === 'OPEN')

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema) as Resolver<PackageFormValues>,
    defaultValues: { shiftId: 0, washesIncluded: 10, amount: 0, paymentMethod: 'CASH', notes: '' },
  })

  const watchedWashes = form.watch('washesIncluded')
  const services = data.services.data ?? []
  const vehicleSizes = data.sizes.data ?? []
  const matchedPrice = (data.prices.data ?? []).find(
    (p) => p.serviceTypeId === calcServiceId && p.vehicleSizeId === calcSizeId,
  )
  const suggestedAmount = matchedPrice ? Math.round(matchedPrice.amount * Number(watchedWashes) * 100) / 100 : null

  useEffect(() => {
    if (openShifts[0]?.id && !form.getValues('shiftId')) {
      form.setValue('shiftId', openShifts[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openShifts[0]?.id])

  const packages = useQuery({
    queryKey: ['prepaid-packages', effectiveBusinessDay?.id],
    enabled: Boolean(effectiveBusinessDay?.id),
    queryFn: () => api<PrepaidPackage[]>(`/api/v1/prepaid-packages?business_day_id=${effectiveBusinessDay!.id}`),
  })

  const save = useMutation({
    mutationFn: (values: PackageFormValues) => api<PrepaidPackage>('/api/v1/prepaid-packages', {
      method: 'POST',
      body: JSON.stringify({
        businessDayId: effectiveBusinessDay?.id,
        shiftId: Number(values.shiftId),
        washesIncluded: Number(values.washesIncluded),
        amount: Number(values.amount),
        currency: 'MXN',
        paymentMethod: values.paymentMethod,
        notes: values.notes?.trim() || undefined,
      }),
    }),
    onSuccess: async () => {
      form.reset({ shiftId: openShifts[0]?.id ?? 0, washesIncluded: 10, amount: 0, paymentMethod: 'CASH', notes: '' })
      await queryClient.invalidateQueries({ queryKey: ['prepaid-packages'] })
      setToast('Paquete registrado')
    },
  })

  const disabledReason = !effectiveBusinessDay
    ? 'No hay dia de trabajo para hoy.'
    : openShifts.length === 0
      ? 'No hay turno abierto.'
      : null

  const list = packages.data ?? []
  const totalHoy = list.reduce((sum, p) => sum + p.amount, 0)

  return (
    <section className="space-y-5">
      {toast && <Toast message={toast} />}

      {/* ─── Editorial header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Pre-pago · {effectiveBusinessDay?.businessDate ?? 'sin día'}</p>
          <h2 className="font-display mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">Paquetes prepagados</h2>
          <p className="mt-1 text-[12.5px] text-ink-500">Vende el paquete una vez. Captura los lavados individuales como cortesía.</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white px-4 py-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-violet-700">Cobrado hoy</p>
          <p className="font-display mt-1 text-[24px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">
            {money(totalHoy, 'MXN')}
          </p>
          <p className="mt-1 text-[11px] text-ink-400">{list.length} paquete{list.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {disabledReason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{disabledReason}</div>
      )}

      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
        <Panel title="Vender paquete">
          <form className="space-y-4" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <SelectField label="Turno" error={form.formState.errors.shiftId?.message}>
              <select {...form.register('shiftId')} disabled={Boolean(disabledReason)}>
                <option value={0}>Selecciona turno</option>
                {openShifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.shiftType === 'MATUTINO' ? 'Mañana' : 'Tarde'}</option>
                ))}
              </select>
            </SelectField>

            <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Calculadora rapida</p>
              <div className="grid grid-cols-2 gap-2">
                <SelectField label="Servicio">
                  <select value={calcServiceId} onChange={(e) => setCalcServiceId(Number(e.target.value))}>
                    <option value={0}>Selecciona...</option>
                    {services.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </SelectField>
                <SelectField label="Tamaño">
                  <select value={calcSizeId} onChange={(e) => setCalcSizeId(Number(e.target.value))}>
                    <option value={0}>Selecciona...</option>
                    {vehicleSizes.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </SelectField>
              </div>
              {matchedPrice && (
                <div className="flex items-center justify-between rounded-lg bg-white border border-violet-200 px-3 py-2">
                  <span className="text-sm text-violet-700">
                    {watchedWashes} × {money(matchedPrice.amount, 'MXN')} =
                    <strong className="ml-1 text-violet-900">{money(suggestedAmount!, 'MXN')}</strong>
                  </span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-violet-700 hover:text-violet-900 underline underline-offset-2"
                    onClick={() => form.setValue('amount', suggestedAmount!)}
                  >
                    Usar precio
                  </button>
                </div>
              )}
              {calcServiceId > 0 && calcSizeId > 0 && !matchedPrice && (
                <p className="text-xs text-amber-600">Sin precio configurado para esta combinacion.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextField label="Lavadas incluidas" error={form.formState.errors.washesIncluded?.message}>
                <input type="number" inputMode="decimal" min={1} {...form.register('washesIncluded')} />
              </TextField>
              <TextField label="Monto cobrado ($)" error={form.formState.errors.amount?.message}>
                <input type="number" inputMode="decimal" min={0.01} step={0.01} {...form.register('amount')} />
              </TextField>
            </div>
            <SelectField label="Forma de pago" error={form.formState.errors.paymentMethod?.message}>
              <select {...form.register('paymentMethod')}>
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta</option>
                <option value="TRANSFER">Depósito</option>
              </select>
            </SelectField>
            <TextField label="Notas (opcional)" error={form.formState.errors.notes?.message}>
              <input placeholder="Ej. Cliente VIP, 10+3" {...form.register('notes')} />
            </TextField>
            {save.error && <ErrorMessage message={save.error.message} />}
            <Button kind="go" size="lg" type="submit" block disabled={save.isPending || Boolean(disabledReason)}>
              {save.isPending ? 'Guardando...' : 'Registrar venta'}
            </Button>
          </form>
        </Panel>

        <Panel
          title="Vendidos hoy"
          subtitle={list.length > 0 ? `${list.length} paquete${list.length === 1 ? '' : 's'} · ${money(totalHoy, 'MXN')}` : undefined}
        >
          {packages.isLoading && <p className="text-sm text-ink-400">Cargando...</p>}
          {list.length === 0 && !packages.isLoading && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-[14px] font-semibold text-ink-700">Aún no se venden paquetes hoy.</p>
              <p className="mt-1 text-[12.5px] text-ink-400">Usa el formulario para registrar la primera venta.</p>
            </div>
          )}
          {list.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border-soft">
              <table className="tl-tbl zebra">
                <thead>
                  <tr>
                    <th className="w-16">Hora</th>
                    <th>Lavadas</th>
                    <th className="r">Monto</th>
                    <th>Pago</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((pkg) => (
                    <tr key={pkg.id}>
                      <td className="font-mono text-[12px] text-ink-500 tabular-nums">
                        {new Date(pkg.occurredAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-[12px] font-bold text-violet-700">
                          {pkg.washesIncluded} lavadas
                        </span>
                      </td>
                      <td className="r font-display text-[15px] font-bold text-violet-700 tabular-nums">{money(pkg.amount, 'MXN')}</td>
                      <td>
                        {pkg.paymentMethod === 'CARD'
                          ? <Pill tone="info" dot={false}>Tarjeta</Pill>
                          : pkg.paymentMethod === 'TRANSFER'
                            ? <Pill tone="warn" dot={false}>Depósito</Pill>
                            : <Pill tone="gray" dot={false}>Efectivo</Pill>
                        }
                      </td>
                      <td className="text-[12.5px] text-ink-500">{pkg.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </section>
  )
}

function TicketsBrowser() {
  const queryClient = useQueryClient()
  const { hasRole } = useAuth()
  const data = usePhaseData()
  const effectiveBusinessDay = data.currentBusinessDay ?? data.businessDays.data?.[0]
  const [query, setQuery] = useState('')
  const [notaLookup, setNotaLookup] = useState('')
  const [status, setStatus] = useState<TicketStatus>('ACTIVE')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [voiding, setVoiding] = useState<Ticket | null>(null)

  // Live clock for header
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const clockStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  const openShifts = (data.shifts.data ?? []).filter((s) => s.status === 'OPEN')

  const tickets = useQuery({
    queryKey: ['tickets', effectiveBusinessDay?.id, status],
    enabled: Boolean(effectiveBusinessDay?.id) && !notaLookup.trim(),
    queryFn: () => api<Ticket[]>(`/api/v1/tickets?business_day_id=${effectiveBusinessDay!.id}&status=${status}`),
  })

  // Fetch counters for both statuses so the tab badges + snapshot strip stay live
  const activeCount = useQuery({
    queryKey: ['tickets', effectiveBusinessDay?.id, 'ACTIVE'],
    enabled: Boolean(effectiveBusinessDay?.id),
    queryFn: () => api<Ticket[]>(`/api/v1/tickets?business_day_id=${effectiveBusinessDay!.id}&status=ACTIVE`),
  })
  const voidedCount = useQuery({
    queryKey: ['tickets', effectiveBusinessDay?.id, 'VOIDED'],
    enabled: Boolean(effectiveBusinessDay?.id),
    queryFn: () => api<Ticket[]>(`/api/v1/tickets?business_day_id=${effectiveBusinessDay!.id}&status=VOIDED`),
  })

  const notaResult = useQuery({
    queryKey: ['tickets', 'nota', notaLookup.trim()],
    enabled: Boolean(notaLookup.trim()),
    queryFn: () => api<Ticket[]>(`/api/v1/tickets?nota_number=${encodeURIComponent(notaLookup.trim())}`),
  })

  const activeSource = notaLookup.trim() ? notaResult : tickets

  const filtered = (activeSource.data ?? []).filter((ticket) => {
    if (notaLookup.trim()) return true
    const haystack = `${ticket.notaNumber} ${ticket.internalRef ?? ''} ${ticket.vehicleDescription ?? ''} ${ticket.serviceTypeName} ${ticket.vehicleSizeName} ${ticket.assignments.map((a) => a.employeeName).join(' ')}`
      .toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  const activeList = activeCount.data ?? []
  const voidedList = voidedCount.data ?? []
  const totalCobrado = activeList.reduce((sum, t) => sum + t.priceAmount, 0)
  const animActiveCount = useCountUp(activeList.length)
  const animVoidedCount = useCountUp(voidedList.length)
  const animTotalCobrado = useCountUp(totalCobrado)

  return (
    <section className="space-y-5">
      {/* ─── Editorial header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Operación · {effectiveBusinessDay?.businessDate ?? 'sin día abierto'}
          </p>
          <h2 className="font-display mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">Tickets</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-border-soft bg-white px-4 py-2.5 shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400">
                {openShifts[0]?.shiftType === 'MATUTINO' ? 'Matutino' : openShifts[0]?.shiftType === 'VESPERTINO' ? 'Vespertino' : 'Sin turno'}
              </p>
              <p className="font-mono text-[13.5px] font-semibold tabular-nums text-ink-900">{clockStr}</p>
            </div>
          </div>
          <NavLink to="/tickets/nuevo" className="tl-btn tl-btn-primary">
            + Nuevo ticket
          </NavLink>
        </div>
      </div>

      {/* ─── Snapshot strip ───────────────────────────────────────── */}
      <div className="tl-stagger grid grid-cols-3 gap-3">
        <div className="tl-lift rounded-2xl border border-border-soft bg-gradient-to-br from-emerald-50/60 to-white px-4 py-3.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Activos</p>
          <p className="font-display mt-1 text-[26px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">{Math.round(animActiveCount)}</p>
        </div>
        <div className="tl-lift rounded-2xl border border-border-soft bg-gradient-to-br from-rose-50/60 to-white px-4 py-3.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Cancelados</p>
          <p className="font-display mt-1 text-[26px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">{Math.round(animVoidedCount)}</p>
        </div>
        <div className="tl-lift rounded-2xl border border-border-soft bg-gradient-to-br from-violet-50/60 to-white px-4 py-3.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Total cobrado</p>
          <p className="font-display mt-1 text-[26px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">{money(animTotalCobrado, 'MXN')}</p>
        </div>
      </div>

      {/* ─── Filters: status tabs + search inputs ─────────────────── */}
      <div className="tl-panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-soft px-4 py-3">
          <button
            type="button"
            onClick={() => setStatus('ACTIVE')}
            disabled={Boolean(notaLookup.trim())}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-150 ${
              status === 'ACTIVE'
                ? 'bg-ink-900 text-white shadow-sm'
                : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
            } disabled:opacity-50`}
          >
            Activos
            <span className={`inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
              status === 'ACTIVE' ? 'bg-white/20 text-white' : 'bg-white text-ink-500'
            }`}>{activeList.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatus('VOIDED')}
            disabled={Boolean(notaLookup.trim())}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-150 ${
              status === 'VOIDED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-ink-50 text-ink-600 hover:bg-rose-50 hover:text-rose-700'
            } disabled:opacity-50`}
          >
            Cancelados
            <span className={`inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
              status === 'VOIDED' ? 'bg-white/20 text-white' : 'bg-white text-ink-500'
            }`}>{voidedList.length}</span>
          </button>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-[2fr_1.4fr]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              className="tl-input pl-9"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setNotaLookup('') }}
              placeholder="Buscar por vehículo, servicio o lavador…"
              disabled={Boolean(notaLookup.trim())}
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] font-bold text-ink-400">#</span>
            <input
              className="tl-input pl-7 font-mono text-[12.5px]"
              value={notaLookup}
              onChange={(event) => { setNotaLookup(event.target.value); setQuery('') }}
              placeholder="Buscar por nota (ej. 20260521-0042)"
            />
          </div>
        </div>
      </div>

      {/* ─── Tickets table ────────────────────────────────────────── */}
      <div className="tl-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tl-tbl zebra">
            <thead>
              <tr>
                <th className="w-16">Hora</th>
                <th>Nota</th>
                <th>Vehículo</th>
                <th>Servicio</th>
                <th>Lavadores</th>
                <th className="r">Importe</th>
                <th>Pago</th>
                <th>Estado</th>
                <th className="r">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => {
                const occurred = ticket.occurredAt ?? ticket.createdAt
                const timeStr = new Date(occurred).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
                return (
                  <tr key={ticket.id}>
                    <td className="font-mono text-[12px] text-ink-500 tabular-nums">{timeStr}</td>
                    <td className="font-semibold">
                      {ticket.internalRef || ticket.notaNumber}
                      {ticket.internalRef && (
                        <p className="mt-0.5 font-mono text-[11px] font-normal text-ink-400">{ticket.notaNumber}</p>
                      )}
                    </td>
                    <td>
                      <span>{ticket.vehicleDescription || '-'}</span>
                      {ticket.notes && <p className="mt-0.5 text-[11px] text-ink-400">{ticket.notes}</p>}
                    </td>
                    <td className="text-[12.5px]">{ticket.serviceTypeName} / {ticket.vehicleSizeName}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {ticket.assignments.map((a) => (
                          <span key={a.employeeId} className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                            {a.employeeName.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="r font-semibold tabular-nums">{money(ticket.priceAmount, ticket.currency)}</td>
                    <td><PaymentPill ticket={ticket} /></td>
                    <td><TicketStatusPill ticket={ticket} /></td>
                    <td className="r">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="Ver / editar"
                          onClick={() => setSelected(ticket)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-violet-50 hover:text-violet-700"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        </button>
                        {ticket.status === 'ACTIVE' && (
                          <button
                            type="button"
                            title="Cancelar"
                            aria-label="Cancelar"
                            onClick={() => setVoiding(ticket)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink-50">
                        <svg className="h-5 w-5 text-ink-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-[14px] font-semibold text-ink-700">No hay tickets para estos filtros.</p>
                      <p className="mt-1 text-[12.5px] text-ink-400">
                        {notaLookup.trim() ? 'Revisa el número de nota e intenta de nuevo.' : query ? 'Ajusta la búsqueda o cambia el estado.' : 'Captura el primer ticket del turno.'}
                      </p>
                      {!notaLookup.trim() && !query && (
                        <NavLink to="/tickets/nuevo" className="tl-btn tl-btn-primary tl-btn-sm mt-4">
                          + Nuevo ticket
                        </NavLink>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`Ticket ${selected.notaNumber}`} onClose={() => setSelected(null)}>
          <TicketWorkspace
            mode="edit"
            ticket={selected}
            onSaved={() => setSelected(null)}
            readOnly={!hasRole('GERENTE')}
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
  const form = useForm<VoidFormValues>({ resolver: zodResolver(voidSchema) as Resolver<VoidFormValues>, defaultValues: { reason: '' } })
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
        {mutation.error && <ErrorMessage message={mutation.error.message} />}
        <div className="flex justify-end gap-2">
          <Button kind="ghost" onClick={onClose}>Volver</Button>
          <Button kind="danger" type="submit">Confirmar cancelación</Button>
        </div>
      </form>
    </Modal>
  )
}

function ExpenseModal({ data, onClose }: { data: ReturnType<typeof usePhaseData>; onClose: () => void }) {
  const queryClient = useQueryClient()
  const openShift = (data.shifts.data ?? []).find((shift) => shift.status === 'OPEN')
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as Resolver<ExpenseFormValues>,
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
        <SelectField label="Categoría" error={form.formState.errors.category?.message}>
          <select {...form.register('category')}>
            {expenseCategories.map((item) => (
              <option key={item} value={item}>{categoryLabel(item)}</option>
            ))}
          </select>
        </SelectField>
        <TextField label="Monto" error={form.formState.errors.amount?.message}>
          <input type="number" inputMode="decimal" min={0} step="0.01" {...form.register('amount')} />
        </TextField>
        <TextField label="Descripción" error={form.formState.errors.description?.message}>
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
    resolver: zodResolver(withdrawalSchema) as Resolver<WithdrawalFormValues>,
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
          <input type="number" inputMode="decimal" min={0} step="0.01" {...form.register('amount')} />
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
    resolver: zodResolver(advanceSchema) as Resolver<AdvanceFormValues>,
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
          <input type="number" inputMode="decimal" min={0} step="0.01" {...form.register('amount')} />
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
      <Button kind="primary" type="submit" disabled={loading} block>
        {loading ? 'Guardando...' : label}
      </Button>
    </div>
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
  const severityTone: PillTone = insight.severity === 'CRITICAL' ? 'bad' : insight.severity === 'WARNING' ? 'warn' : 'purple'
  const busy = acknowledge.isPending || dismiss.isPending

  return (
    <article className={`tl-ai-card tl-ai-card-${insight.severity.toLowerCase()}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="gray" dot={false}>{featureLabel(insight.featureType)}</Pill>
            <Pill tone={severityTone}>{severityLabel(insight.severity)}</Pill>
            <Pill tone="gray" dot={false}>{statusLabel(insight.status)}</Pill>
            <span className="text-xs text-ink-500">{insight.sourceFrom} a {insight.sourceTo}</span>
          </div>
          <h4 className="mt-3 text-[14px] font-bold text-ink-900 tracking-[-0.005em]">{insight.title}</h4>
          {visibleLines.length > 0 && (
            <div className="mt-2 space-y-1.5 text-[13.5px] leading-6 text-ink-700">
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
              <Button kind="secondary" size="sm" onClick={() => acknowledge.mutate()} disabled={busy}>
                Revisado
              </Button>
              <Button kind="ghost" size="sm" onClick={() => dismiss.mutate()} disabled={busy}>
                Descartar
              </Button>
            </>
          ) : (
            <Pill tone="gray" dot={false}>{statusLabel(insight.status)}</Pill>
          )}
        </div>
      </div>
      {(acknowledge.error || dismiss.error) && (
        <p className="mt-3 rounded-lg bg-bad-50 p-2 text-xs text-bad-700">{(acknowledge.error || dismiss.error)!.message}</p>
      )}
    </article>
  )
}

function AiLabeledText({ label, text }: { label: string; text: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">{label}</p>
      <p className="mt-1 text-[13.5px] font-semibold leading-6 text-ink-900">{text}</p>
    </div>
  )
}

function AiEvidenceList({ title, rows, ordered = false }: { title: string; rows: string[]; ordered?: boolean }) {
  if (rows.length === 0) return null
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">{title}</p>
      <Tag className={`mt-1 space-y-1 text-[13px] leading-6 text-ink-700 ${ordered ? 'list-decimal pl-5' : 'list-disc pl-5'}`}>
        {rows.map((row) => <li key={row}>{row}</li>)}
      </Tag>
    </div>
  )
}

function AiEmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-soft bg-ink-50/60 px-4 py-5 text-center text-[13px] text-ink-500">
      {text}
    </div>
  )
}

function AiDetailRows({ details }: { details: Record<string, unknown> | null }) {
  if (!details) return null
  const rows = Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && !Array.isArray(value) && typeof value !== 'object')
    .slice(0, 8)
  if (rows.length === 0) return null

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {rows.map(([key, value]) => (
        <div key={key} className="rounded-lg bg-white/70 px-3 py-2 text-xs ring-1 ring-black/5">
          <span className="block font-semibold uppercase tracking-wide text-ink-400">{key.replace(/_/g, ' ')}</span>
          <span className="mt-1 block break-words text-ink-700">{formatAiDetailValue(value)}</span>
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
      <div className="overflow-hidden rounded-xl border border-border-soft" data-testid={`money-table-${slug}`}>
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
                <td colSpan={4} className="px-4 py-8 text-center text-ink-400">{empty}</td>
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
      <Button kind="ghost" onClick={onClose}>Volver</Button>
      <Button kind="primary" type="submit">{submitLabel}</Button>
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
    resolver: zodResolver(employeeEditSchema) as Resolver<EmployeeEditFormValues>,
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
      restDayPremium: employee.restDayPremium ?? 0,
      absenceDayPenalty: employee.absenceDayPenalty ?? 0,
    },
  })
  const watchedActive = form.watch('active')
  const watchedPayrollType = form.watch('payrollType')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-[var(--shadow-lg)] overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-soft bg-white px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">Lavador</p>
            <h3 className="text-[17px] font-bold tracking-tight text-ink-900">{employee.fullName}</h3>
          </div>
          <button type="button" onClick={onClose} className="tl-icon-btn" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form className="space-y-4 p-6" onSubmit={form.handleSubmit(onSave)}>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Nombre" error={form.formState.errors.fullName?.message}>
              <input {...form.register('fullName')} />
            </TextField>
            <TextField label="Teléfono" error={form.formState.errors.phone?.message}>
              <input type="tel" inputMode="tel" autoComplete="tel" {...form.register('phone')} />
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
              <input type="number" inputMode="decimal" min={0} step="0.01" {...form.register('baseWeeklySalary')} />
            </TextField>
            <TextField label="$ por carro" error={form.formState.errors.commissionRate?.message}>
              <input type="number" inputMode="decimal" min={0} step="0.01" {...form.register('commissionRate')} />
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
              <input type="number" inputMode="decimal" min={0} step="0.01" {...form.register('outOfShiftCommissionRate')} />
            </TextField>
          </div>
          {watchedPayrollType === 'SALARY' && (
            <div className="rounded-lg border border-border-soft bg-ink-50/60 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Reglas de sueldo</p>
              <div className="grid gap-3 md:grid-cols-2">
                <TextField label="Premio por dia de descanso" error={form.formState.errors.restDayPremium?.message}>
                  <input type="number" inputMode="decimal" min={0} step="0.01" {...form.register('restDayPremium')} />
                </TextField>
                <TextField label="Penalizacion fija por falta" error={form.formState.errors.absenceDayPenalty?.message}>
                  <input type="number" inputMode="decimal" min={0} step="0.01" {...form.register('absenceDayPenalty')} />
                </TextField>
              </div>
              <p className="mt-2 text-xs text-ink-500">
                Si trabaja los 7 días de la semana se le paga el dia de descanso (tarifa diaria + premio).
                Cada falta descuenta un dia de sueldo mas la penalizacion fija.
              </p>
            </div>
          )}
          <div className="rounded-lg border border-border-soft p-3 space-y-3">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" {...form.register('active')} className="h-4 w-4 rounded border-border-soft text-violet-600" />
              Activo
            </label>
            {!watchedActive && (
              <TextField label="Motivo de baja" error={form.formState.errors.deactivationReason?.message}>
                <input placeholder="Ej. Renuncia voluntaria" {...form.register('deactivationReason')} />
              </TextField>
            )}
            {!watchedActive && employee.deactivationReason && (
              <p className="text-xs text-ink-500">Motivo anterior: {employee.deactivationReason}</p>
            )}
          </div>
          {error && <ErrorMessage message={error} />}
          <div className="flex justify-end gap-3">
            <Button kind="ghost" onClick={onClose}>Cancelar</Button>
            <Button kind="primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SimpleList({ rows, empty }: { rows: { id: number; title: string; detail: string }[]; empty: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-soft bg-ink-50/60 px-4 py-5 text-center text-[13px] text-ink-500">
        {empty}
      </div>
    )
  }

  return (
    <div className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
          <span className="font-medium text-ink-900">{row.title}</span>
          <span className="text-right text-ink-500">{row.detail}</span>
        </div>
      ))}
    </div>
  )
}

function SelectField({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-ink-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11.5px] text-bad-700">{error}</span>}
    </label>
  )
}

function TextField({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactElement }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-ink-700">{label}</span>
      {children}
      {error
        ? <span className="mt-1 block text-[11.5px] text-bad-700">{error}</span>
        : hint ? <span className="mt-1 block text-[11px] text-ink-400">{hint}</span> : null}
    </label>
  )
}

async function invalidateAi(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['ai-insights'] }),
    queryClient.invalidateQueries({ queryKey: ['ai-daily-brief'] }),
    queryClient.invalidateQueries({ queryKey: ['ai-today'] }),
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
    DEMAND_FORECAST: 'Pronóstico',
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

// Human-readable Spanish label for each backend AI tool. The model speaks
// in tool-id snake_case ("get_daily_summary"); the owner shouldn't have to.
// Unknown names fall back to the raw id so a new tool isn't invisible if we
// forget to add a label.
const TOOL_LABELS: Record<string, string> = {
  get_daily_summary: 'Resumen del día',
  get_monthly_summary: 'Resumen del mes',
  get_range_summary: 'Resumen del rango',
  get_historical_range: 'Histórico (Excel viejo)',
  get_cash_variance: 'Diferencia de caja',
  get_employee_performance: 'Rendimiento de lavadores',
  get_inventory_snapshot: 'Inventario',
  get_oversight_patterns: 'Patrones de vigilancia',
  list_employees: 'Lista de empleados',
  get_employee_debt_balance: 'Deuda de empleado',
}
function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name
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

function PaymentPill({ ticket }: { ticket: Ticket }) {
  if (ticket.courtesy) return null
  if (ticket.paymentMethod === 'CARD') return <Pill tone="info" dot={false}>Tarjeta</Pill>
  if (ticket.paymentMethod === 'TRANSFER') return <Pill tone="warn" dot={false}>Windows</Pill>
  return <Pill tone="gray" dot={false}>Efectivo</Pill>
}

function Modal({ title, children, onClose, narrow = false }: { title: string; children: React.ReactNode; onClose: () => void; narrow?: boolean }) {
  const slug = testidSlug(title)
  const titleId = `modal-${slug}-title`
  return (
    <div
      className="tl-modal-backdrop fixed inset-0 z-40 flex items-start justify-center overflow-y-auto px-4 py-8"
      style={{ background: 'rgba(15,23,42,0.40)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid={`modal-${slug}`}
    >
      <div className={`tl-modal-content flex max-h-[calc(100vh-64px)] flex-col overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 ${narrow ? 'w-full max-w-lg' : 'w-full max-w-5xl'}`}>
        <div className="flex shrink-0 items-start gap-3 border-b border-border-soft px-6 py-4">
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
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return (
    <div
      className="tl-toast fixed right-4 top-4 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-white"
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
  const recList = records.data ?? []
  const onShiftCount = recList.filter((r) => !r.absence && !r.clockOut).length
  const completedCount = recList.filter((r) => !r.absence && r.clockOut).length
  const absentCount = recList.filter((r) => r.absence).length

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Personal · {date}</p>
          <h2 className="font-display mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">Asistencia</h2>
          <p className="mt-1 text-[12.5px] text-ink-500">Entradas, salidas y faltas del personal.</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400">Fecha</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="tl-input" />
        </label>
      </div>

      {records.error && <ErrorMessage message={records.error.message} />}

      <div className="tl-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatStrip tone="good" label="En turno" value={String(onShiftCount)} sub="con entrada sin salida" />
        <StatStrip tone="info" label="Completos" value={String(completedCount)} sub="entrada y salida hoy" />
        <StatStrip tone="bad" label="Faltas" value={String(absentCount)} sub="falta registrada" pulse={absentCount > 0} />
        <StatStrip tone="warn" label="Sin registrar" value={String(notRecorded.length)} sub="activos sin marcar" />
      </div>

      <Panel title="Registros del día">
        <div className="overflow-hidden rounded-xl border border-border-soft">
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
                      <Pill tone="bad">Falta</Pill>
                    ) : record.clockOut ? (
                      <Pill tone="gray">Completo</Pill>
                    ) : (
                      <Pill tone="good">En turno</Pill>
                    )}
                  </td>
                  <td>
                    {!record.absence && !record.clockOut && (
                      <Button kind="secondary" size="sm" onClick={() => handleClockOut(record.id)}>
                        Registrar salida
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!records.isLoading && (records.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<ICalendar size={20} />}
                      title="Sin registros para esta fecha"
                      description="Marca entradas desde la lista de abajo para empezar el día."
                      tone="info"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {notRecorded.length > 0 && (
        <Panel title="Sin registrar">
          <div className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft">
            {notRecorded.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-sm font-medium">{emp.fullName}</span>
                <div className="flex gap-2">
                  <Button kind="go" size="sm" disabled={clockIn.isPending} onClick={() => clockIn.mutate(emp.id)}>Entrada</Button>
                  <Button kind="danger" size="sm" disabled={markAbsent.isPending} onClick={() => markAbsent.mutate(emp.id)}>Falta</Button>
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
              <span className="mb-1 block text-sm font-medium text-ink-700">Hora de salida</span>
              <input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="w-full"
              />
            </label>
            {clockOut.error && <p className="mt-2 text-sm text-red-600">{clockOut.error.message}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button kind="ghost" onClick={() => { setClockOutId(null); setClockOutTime('') }}>Cancelar</Button>
              <Button kind="primary" disabled={!clockOutTime || clockOut.isPending} onClick={submitClockOut}>
                {clockOut.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
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
