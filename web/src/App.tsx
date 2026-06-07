import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Frame, MobileNav, MobileTopbar, Sidebar, Topbar, type NavRole } from './components/layout'
import { IAlert, IAudit, ICalendar, ICar, ICash, ICatalog, ICheck, IClients, ICut, IInfo, ILock, IMoney, IPayroll, IPlus, IReports, ISearch, ITickets, IX } from './components/icons'
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
  Sparkline,
  StatStrip,
  StatusPill,
  SummaryRow,
  type MetricVariant,
  type Tone as PillTone,
} from './components/ui'
import {
  BrandHero,
  Card as CardV2,
  Kpi as KpiV2,
  PageHeader as PageHeaderV2,
  RiskMeter,
  Sparkline as SparklineV2,
  UnderlineTabs,
} from './components/v2'

type Currency = 'MXN'
type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'
type TicketStatus = 'ACTIVE' | 'VOIDED'
type AuthRole = 'OPERADOR' | 'GERENTE' | 'DUENO' | 'ADMIN'
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
  doNotRehire?: boolean
  doNotRehireNote?: string | null
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
  // Estimated pay for this one car: share% x flat per-car rate (NOT a % of the
  // sale). perCarRate is the washer's in-shift commission-per-car or salaried
  // productivity bonus. Estimate only — end-of-week falta penalties can lower it.
  estimatedEarning?: number | null
  perCarRate?: number | null
  payrollType?: string | null
}

type TicketExtra = {
  serviceTypeId: number
  name: string
  amount: number
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
  discountReason?: string | null
  notes?: string | null
  customerId?: number | null
  customerName?: string | null
  extras?: TicketExtra[] | null
}

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'REST_DAY' | 'SICK' | 'SUSPENDED' | 'WEATHER'

type AttendanceRecord = {
  id: number
  employeeId: number
  employeeName: string
  workDate: string
  clockIn?: string | null
  clockOut?: string | null
  absence: boolean
  status?: AttendanceStatus
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
  prepaidSalesRevenue: number
  inventoryPurchaseCost: number
  expensesTotal: number
  withdrawalsTotal: number
  advancesTotal: number
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
  // Per-product low / critical stock thresholds. NULL → fall back to the
  // global defaults INV_MIN_STOCK_DEFAULT / INV_CRIT_STOCK_DEFAULT below.
  minStock?: number | null
  critStock?: number | null
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
  inventorySalesRevenue: number
  prepaidSalesRevenue: number
  inventoryPurchaseCost: number
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
  businessDayId: z.coerce.number().positive('Abre un día de trabajo primero'),
  shiftId: z.coerce.number().positive('Selecciona un turno abierto'),
  serviceTypeId: z.coerce.number().positive('Selecciona un servicio'),
  vehicleSizeId: z.coerce.number().positive('Selecciona un tamaño'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).default('CASH'),
  vehicleDescription: z.string().max(160, 'Máximo 160 caracteres').optional(),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
  courtesy: z.boolean().default(false),
  courtesyReason: z.string().max(500, 'Máximo 500 caracteres').optional(),
  discountPercent: z.coerce.number().min(0, 'Mínimo 0').max(100, 'Máximo 100').default(0),
  employeeIds: z.array(z.coerce.number()).min(1, 'Selecciona al menos un lavador'),
  occurredAt: z.string().optional(),
  internalRef: z.string().max(40, 'Máximo 40 caracteres').optional(),
  priceOverride: z.coerce.number().min(0, 'Mínimo $0').optional().or(z.literal('')),
  surchargeAmount: z.coerce.number().min(0, 'Mínimo $0').optional().or(z.literal('')),
  surchargeReason: z.string().max(120, 'Máximo 120 caracteres').optional(),
  discountReason: z.string().max(120, 'Máximo 120 caracteres').optional(),
  // Prepago = redeeming a prepaid package nota. The base was already paid at
  // sale; we capture the nota (internalRef) and the extra to collect (priceOverride).
  prepagoActive: z.boolean().default(false),
  // Lealtad: optional customer link. When set, the punch card advances on save.
  customerId: z.coerce.number().int().positive().optional().or(z.literal('')),
}).refine((v) => !(!v.courtesy && (v.discountPercent ?? 0) > 0 && !v.discountReason?.trim()), {
  message: 'Captura el motivo del descuento',
  path: ['discountReason'],
}).refine((v) => !(v.prepagoActive && !v.internalRef?.trim()), {
  message: 'Captura la nota prepagada',
  path: ['internalRef'],
})

type TicketFormValues = z.infer<typeof ticketSchema>

const voidSchema = z.object({
  reason: z.string().min(1, 'Escribe el motivo').max(500, 'Máximo 500 caracteres'),
})

type VoidFormValues = z.infer<typeof voidSchema>

const codeSchema = z.string()
  .min(1, 'Escribe un codigo')
  .max(40, 'Máximo 40 caracteres')
  .regex(/^[A-Z0-9_]+$/, 'Usa mayusculas, numeros o guion bajo')

const employeeSchema = z.object({
  fullName: z.string().min(1, 'Escribe el nombre').max(120, 'Máximo 120 caracteres'),
  phone: z.string().max(40, 'Máximo 40 caracteres').optional(),
  baseWeeklySalary: z.coerce.number().min(0, 'Mínimo 0'),
  payrollType: z.enum(['SALARY', 'COMMISSION']),
  commissionRate: z.coerce.number().min(0, 'Mínimo 0'),
  productivityBonusRate: z.coerce.number().min(0, 'Mínimo 0'),
})

type EmployeeFormValues = z.infer<typeof employeeSchema>

const serviceTypeSchema = z.object({
  code: codeSchema,
  name: z.string().min(1, 'Escribe el nombre').max(120, 'Máximo 120 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  category: z.enum(['STANDARD', 'EXTRA']).default('STANDARD'),
})

type ServiceTypeFormValues = z.infer<typeof serviceTypeSchema>

const vehicleSizeSchema = z.object({
  code: codeSchema,
  name: z.string().min(1, 'Escribe el nombre').max(120, 'Máximo 120 caracteres'),
  sortOrder: z.coerce.number().int('Debe ser número entero').min(0, 'Mínimo 0'),
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
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

const withdrawalSchema = z.object({
  withdrawalDate: z.string().min(1, 'Selecciona fecha'),
  businessDayId: z.coerce.number().optional(),
  shiftId: z.coerce.number().optional(),
  amount: z.coerce.number().positive('El monto debe ser mayor que 0'),
  reason: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>

const advanceSchema = z.object({
  advanceDate: z.string().min(1, 'Selecciona fecha'),
  businessDayId: z.coerce.number().optional(),
  shiftId: z.coerce.number().optional(),
  employeeId: z.coerce.number().positive('Selecciona lavador'),
  amount: z.coerce.number().positive('El monto debe ser mayor que 0'),
  reason: z.string().max(500, 'Máximo 500 caracteres').optional(),
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
  closingReason: z.string().max(500, 'Máximo 500 caracteres').optional(),
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
  concept: z.string().min(1, 'Selecciona concepto').max(80, 'Máximo 80 caracteres'),
  note: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

type PayrollAdjustmentFormValues = z.infer<typeof payrollAdjustmentSchema>

const productSchema = z.object({
  name: z.string().min(1, 'Escribe el nombre').max(120, 'Máximo 120 caracteres'),
  sku: z.string().max(60, 'Máximo 60 caracteres').optional(),
  currentUnitPrice: z.coerce.number().min(0, 'Mínimo 0'),
  trackInventory: z.boolean().default(true),
  active: z.boolean().default(true),
  category: z.enum(['AROMA', 'SNACK', 'OTRO']).default('OTRO'),
  // Empty string = "use global default" (sent as null to backend); any
  // non-negative number sets the per-product threshold.
  minStock: z.union([z.literal(''), z.coerce.number().min(0, 'Mínimo 0')]).optional(),
  critStock: z.union([z.literal(''), z.coerce.number().min(0, 'Mínimo 0')]).optional(),
}).refine(
  (v) => {
    const min = v.minStock === '' || v.minStock == null ? null : Number(v.minStock)
    const crit = v.critStock === '' || v.critStock == null ? null : Number(v.critStock)
    if (min == null || crit == null) return true
    return crit <= min
  },
  { message: 'Crítico debe ser ≤ mínimo', path: ['critStock'] },
)

type ProductFormValues = z.infer<typeof productSchema>

const inventorySaleSchema = z.object({
  productId: z.coerce.number().positive('Selecciona producto'),
  quantity: z.coerce.number().positive('Cantidad mayor que 0'),
  unitPrice: z.coerce.number().min(0, 'Mínimo 0').optional(),
  movementDate: z.string().optional(),
  fiado: z.boolean().default(false),
  employeeId: z.coerce.number().optional(),
})

type InventorySaleFormValues = z.infer<typeof inventorySaleSchema>

const inventoryPurchaseSchema = z.object({
  productId: z.coerce.number().positive('Selecciona producto'),
  quantity: z.coerce.number().positive('Cantidad mayor que 0'),
  unitPrice: z.coerce.number().min(0, 'Mínimo 0').optional(),
  movementDate: z.string().optional(),
})

type InventoryPurchaseFormValues = z.infer<typeof inventoryPurchaseSchema>

const inventoryAdjustmentSchema = z.object({
  productId: z.coerce.number().positive('Selecciona producto'),
  quantity: z.coerce.number().refine((value) => value !== 0, 'Cantidad no puede ser 0'),
  reason: z.string().min(1, 'El ajuste requiere motivo').max(500, 'Máximo 500 caracteres'),
  movementDate: z.string().optional(),
})

type InventoryAdjustmentFormValues = z.infer<typeof inventoryAdjustmentSchema>

const analystChatSchema = z.object({
  message: z.string().min(1, 'Escribe una pregunta').max(500, 'Máximo 500 caracteres'),
})

type AnalystChatFormValues = z.infer<typeof analystChatSchema>

const investigationSchema = z.object({
  question: z.string().min(1, 'Escribe que investigar').max(500, 'Máximo 500 caracteres'),
})

type InvestigationFormValues = z.infer<typeof investigationSchema>

// Use America/Monterrey (UTC-6, no DST) instead of toISOString() so the
// "today" rollover follows local business hours, not UTC midnight.
// Otherwise a cashier opening the day at 8pm would create tomorrow's row.
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Monterrey' }).format(new Date())

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
      throw new Error('Sesión expirada. Por favor vuelve a iniciar sesión.')
    }
  }
  if (!response.ok) {
    if (response.status === 401) {
      writeStoredAuth(null)
      throw new Error('Sesión expirada. Por favor vuelve a iniciar sesión.')
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
    const rank: Record<AuthRole, number> = { OPERADOR: 1, GERENTE: 2, DUENO: 3, ADMIN: 4 }
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
  '/asistencia':      { title: 'Asistencia',           section: 'Gestión' },
  '/asistencia-lab':  { title: 'Asistencia (Lab)',     section: 'Gestión' },
  '/reporte-personal':{ title: 'Reporte de personal',  section: 'Gestión' },
  '/vigilancia':      { title: 'Operación y personal', section: 'Gestión' },
  '/reportes':        { title: 'Reportes',             section: 'Dueño'   },
  '/ai':              { title: 'Análisis IA',          section: 'Dueño'   },
  '/auditoria':       { title: 'Auditoría',            section: 'Dueño'   },
}

function routeMeta(pathname: string) {
  return ROUTE_META[pathname] ?? { title: 'Turbo Lavado', section: 'Operación' }
}

function AppShell() {
  const { auth, logout } = useAuth()
  const location = useLocation()
  const isOwner = auth?.user.role === 'DUENO' || auth?.user.role === 'ADMIN'
  const flaggedCount = useQuery({
    queryKey: ['audit-events', 'flagged'],
    queryFn: () => api<AuditEvent[]>('/api/v1/audit-events/flagged'),
    enabled: Boolean(isOwner),
    refetchInterval: 60_000,
  })

  // Live sidebar stats — works for any role (OPERADOR can hit both endpoints).
  // Counts today's ACTIVE tickets for the carros stat and sums CASH tickets
  // for an approximate "caja en turno" indicator.
  const sidebarDay = useQuery({
    queryKey: ['sidebar-business-day', today],
    enabled: Boolean(auth),
    queryFn: () => api<BusinessDay[]>(`/api/v1/business-days?from=${today}&to=${today}`),
    refetchInterval: 60_000,
  })
  const sidebarBdayId = sidebarDay.data?.find((d) => d.status === 'OPEN')?.id ?? sidebarDay.data?.[0]?.id
  const sidebarTickets = useQuery({
    queryKey: ['sidebar-tickets', sidebarBdayId],
    enabled: Boolean(sidebarBdayId),
    queryFn: () => api<Ticket[]>(`/api/v1/tickets?business_day_id=${sidebarBdayId}`),
    refetchInterval: 30_000,
  })
  const carsToday = sidebarTickets.data?.filter((t) => t.status === 'ACTIVE').length
  const cashSum = (sidebarTickets.data ?? [])
    .filter((t) => t.status === 'ACTIVE' && t.paymentMethod === 'CASH')
    .reduce((sum, t) => sum + Number(t.priceAmount ?? 0), 0)
  const cashLabel = cashSum > 0
    ? cashSum >= 1000 ? `$${(cashSum / 1000).toFixed(cashSum >= 10_000 ? 0 : 1)}k` : `$${Math.round(cashSum)}`
    : '—'

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
          liveStats={{ carsToday, cashLabel }}
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

      <main key={location.pathname} className="tl-page px-4 pb-24 lg:px-6 lg:pb-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets/nuevo" element={<NewTicketScreen />} />
          <Route path="/tickets" element={<TicketsBrowser />} />
          <Route path="/gastos" element={<ExpenseLedgerScreen />} />
          <Route path="/cierre-dia" element={<EndOfDayScreen />} />
          <Route path="/corte" element={<ShiftCloseScreen />} />
          <Route path="/nomina" element={<RequirePayroll><PayrollScreen /></RequirePayroll>} />
          <Route path="/inventario" element={<RequireRole role="GERENTE"><InventoryScreen /></RequireRole>} />
          <Route path="/clientes" element={<ClientesScreen />} />
          <Route path="/lealtad" element={<RequireRole role="GERENTE"><LealtadScreen /></RequireRole>} />
          <Route path="/ai" element={<RequireRole role="DUENO"><AiScreen /></RequireRole>} />
          <Route path="/reportes" element={<RequireRole role="GERENTE"><ReportsScreen /></RequireRole>} />
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
    ADMIN: 'Admin',
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

// ── Clientes (customer directory + loyalty progress) ────────────────
type Customer = {
  id: number
  name: string
  phone: string | null
  notes: string | null
  loyaltyStatus: string | null
  active: boolean
  loyaltyProgress: number
  loyaltyRewardsEarned: number
  vehicleSizeId?: number | null
  vehicleSizeName?: string | null
  vehicleDescription?: string | null
}

type CustomerPackage = {
  id: number
  customerId: number
  serviceTypeId: number
  serviceTypeName: string
  vehicleSizeId: number
  vehicleSizeName: string
  washesTotal: number
  washesUsed: number
  remaining: number
  unitPrice: number
  amountPaid: number
  currency: string
  paymentMethod: string
  status: string
  notes?: string | null
  purchasedAt: string
}

function cliInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}
function cliColor(name: string) {
  const palette = ['#7c3aed', '#0891b2', '#16a34a', '#d97706', '#db2777', '#0ea5e9', '#dc2626', '#65a30d']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return palette[Math.abs(h) % palette.length]
}
function cliGroupPhone(phone: string | null | undefined) {
  if (!phone) return ''
  const d = phone.replace(/\D/g, '')
  if (d.length !== 10) return phone
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
}

function ClientesScreen() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', notes: '' })
  const [saved, setSaved] = useState<string | null>(null)
  const [newIds, setNewIds] = useState<number[]>([])
  const phoneRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '', vehicleSizeId: '' as number | '', vehicleDescription: '' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Buy-package mini form (inside the edit modal)
  const [buyForm, setBuyForm] = useState({ serviceTypeId: '' as number | '', vehicleSizeId: '' as number | '', washesTotal: 10 })

  useEffect(() => { phoneRef.current?.focus() }, [])

  useEffect(() => {
    if (editing) {
      setEditForm({
        name: editing.name, phone: editing.phone ?? '', notes: editing.notes ?? '',
        vehicleSizeId: editing.vehicleSizeId ?? '', vehicleDescription: editing.vehicleDescription ?? '',
      })
      setBuyForm({ serviceTypeId: '', vehicleSizeId: editing.vehicleSizeId ?? '', washesTotal: 10 })
      setConfirmDelete(false)
    }
  }, [editing?.id])

  const vehicleSizesQ = useQuery({
    queryKey: ['vehicle-sizes'],
    queryFn: () => api<VehicleSize[]>('/api/v1/vehicle-sizes'),
  })
  const serviceTypesQ = useQuery({
    queryKey: ['service-types'],
    queryFn: () => api<ServiceType[]>('/api/v1/service-types'),
  })
  const activeSizes = (vehicleSizesQ.data ?? []).filter((s) => s.active !== false).sort((a, b) => a.sortOrder - b.sortOrder)
  const standardServices = (serviceTypesQ.data ?? []).filter((s) => s.active !== false && s.category !== 'EXTRA')

  const packagesQ = useQuery({
    queryKey: ['customer-packages', editing?.id],
    enabled: Boolean(editing?.id),
    queryFn: () => api<CustomerPackage[]>(`/api/v1/customers/${editing!.id}/packages`),
  })

  const customersQ = useQuery({
    queryKey: ['customers', query],
    queryFn: () => api<Customer[]>(`/api/v1/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  })
  const all = customersQ.data ?? []
  const digits = form.phone.replace(/\D/g, '').slice(0, 10)
  // Look up by phone against the full directory so the dup warning isn't
  // limited to the current search results. Backend's q matches both name and
  // phone (LIKE), so we narrow to an exact 10-digit match after the round-trip.
  const phoneLookupQ = useQuery({
    queryKey: ['customers', 'phone-lookup', digits],
    enabled: digits.length === 10,
    queryFn: () => api<Customer[]>(`/api/v1/customers?q=${digits}`),
  })
  const dup = digits.length === 10
    ? (phoneLookupQ.data ?? []).find((c) => (c.phone ?? '').replace(/\D/g, '') === digits)
    : undefined
  // Phone is optional, but if the cashier started typing it has to be complete
  // (10 digits). 1–9 digits is almost always a paste-truncation or typo.
  const phoneValid = digits.length === 0 || digits.length === 10
  const canSave = form.name.trim().length > 0 && !dup && phoneValid && !phoneLookupQ.isLoading

  const createCustomer = useMutation({
    mutationFn: (body: { name: string; phone?: string; notes?: string }) =>
      api<Customer>('/api/v1/customers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setNewIds((ids) => [created.id, ...ids])
      setSaved(created.name)
      setForm({ name: '', phone: '', notes: '' })
      phoneRef.current?.focus()
      window.setTimeout(() => setSaved(null), 4000)
    },
  })

  const updateCustomer = useMutation({
    mutationFn: (body: { name?: string; phone?: string; notes?: string; vehicleSizeId?: number | null; vehicleDescription?: string }) =>
      api<Customer>(`/api/v1/customers/${editing!.id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setEditing(null)
    },
  })

  const buyPackage = useMutation({
    mutationFn: (body: { serviceTypeId: number; vehicleSizeId: number; washesTotal: number }) =>
      api<CustomerPackage>(`/api/v1/customers/${editing!.id}/packages`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-packages', editing?.id] })
    },
  })

  const deleteCustomer = useMutation({
    mutationFn: () => api(`/api/v1/customers/${editing!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setEditing(null)
    },
  })

  // "Premio listo" = the customer has a redeemable premio waiting on their
  // current card. Past redemptions don't count — once they cash in, progress
  // resets to 0 and the next reward hasn't been earned yet.
  const rewardCount = all.filter((c) => c.loyaltyProgress >= 5).length

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    createCustomer.mutate({
      name: form.name.trim(),
      phone: digits || undefined,
      notes: form.notes.trim() || undefined,
    })
  }

  return (
    <section className="space-y-5">
      <PageHeaderV2
        eyebrow="OPERACIÓN · CLIENTES"
        eyebrowDot
        title="Clientes"
        subtitle="Directorio de clientes del programa de lealtad. Registra clientes nuevos para empezar a contar sus lavados."
        actions={
          <button type="button" className="cli-headcta" onClick={() => phoneRef.current?.focus()}>
            <IPlus size={15} /> Nuevo cliente
          </button>
        }
      />

      <div className="cli-grid">
        {/* Directory */}
        <div className="tl2-card t-purple" style={{ overflow: 'hidden' }}>
          <div className="cli-dir-head">
            <div className="cli-search">
              <ISearch size={16} />
              <input
                className="cli-search__input"
                placeholder="Buscar por nombre o teléfono…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="cli-search__clr" onClick={() => setQuery('')} aria-label="Limpiar">
                  <IX size={14} />
                </button>
              )}
            </div>
            <div className="cli-stats">
              <span><b>{all.length}</b> clientes</span>
              <span className="cli-stats__dot" />
              <span><b>{rewardCount}</b> con premio listo</span>
            </div>
          </div>
          <div className="cli-tbl-head">
            <span>Cliente</span>
            <span>Progreso de lealtad</span>
            <span className="r">Estado</span>
          </div>
          <div className="cli-list">
            {customersQ.isLoading && (
              <div className="cli-noresults"><p>Cargando clientes…</p></div>
            )}
            {!customersQ.isLoading && all.length === 0 && (
              <div className="cli-noresults">
                <span className="lz-empty__ico"><ISearch size={22} /></span>
                <p>{query ? `Ningún cliente coincide con “${query}”.` : 'Sin clientes registrados todavía.'}</p>
              </div>
            )}
            {all.map((c) => {
              const isNew = newIds.includes(c.id)
              const punches = c.loyaltyProgress
              const rewards = c.loyaltyRewardsEarned
              return (
                <div
                  key={c.id}
                  className={`cli-row ${isNew ? 'is-new' : ''}`}
                  onClick={() => setEditing(c)}
                  style={{ cursor: 'pointer' }}
                  title="Editar cliente"
                >
                  <div className="cli-row__who">
                    <span className="cli-avatar" style={{ background: cliColor(c.name) }}>{cliInitials(c.name)}</span>
                    <div className="cli-row__name">
                      <span className="nm">
                        {c.name}
                        {isNew && <span className="cli-newtag">Nuevo</span>}
                      </span>
                      <span className="sb">
                        <span className="font-mono">{cliGroupPhone(c.phone)}</span>
                        {c.notes && <><span className="cli-row__sep">·</span>{c.notes}</>}
                      </span>
                    </div>
                  </div>
                  <div className="cli-row__prog">
                    <span className="cli-dots">
                      {Array.from({ length: 10 }, (_, i) => {
                        const n = i + 1
                        const cls = ['cli-dot', n <= punches ? 'done' : '', n === 5 ? 'm5' : '', n === 10 ? 'm10' : ''].filter(Boolean).join(' ')
                        return <span key={n} className={cls} />
                      })}
                    </span>
                    <span className="cli-row__count">{punches}/10{rewards > 0 && <> · {rewards}⭐</>}</span>
                  </div>
                  <div className="cli-row__state r">
                    {punches >= 9 ? (
                      <Pill tone="good">Lavado gratis listo</Pill>
                    ) : punches >= 5 ? (
                      <Pill tone="warn">Mitad listo</Pill>
                    ) : punches === 0 && rewards > 0 ? (
                      <Pill tone="good">Premio canjeado</Pill>
                    ) : (
                      <span className="cli-row__faltan">
                        {punches === 0 ? 'Sin lavados' : `Faltan ${5 - punches} p/ mitad`}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {editing && (
          <Modal title={`Editar cliente · ${editing.name}`} onClose={() => setEditing(null)} narrow>
            <div className="space-y-3 px-6 py-4">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Nombre</span>
                <input
                  className="tl-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Teléfono · 10 dígitos</span>
                <input
                  className="tl-input"
                  inputMode="numeric"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  style={{ fontFamily: 'var(--font-mono-display)', fontWeight: 700, letterSpacing: '0.04em' }}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Notas</span>
                <input
                  className="tl-input"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>

              {/* Car on file — so we can spot a mismatch (esp. a bigger car than a package covers). */}
              <div className="rounded-xl border border-border-soft bg-ink-50/40 p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Auto del cliente</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="tl-input"
                    value={editForm.vehicleSizeId}
                    onChange={(e) => setEditForm((f) => ({ ...f, vehicleSizeId: e.target.value ? Number(e.target.value) : '' }))}
                  >
                    <option value="">Tamaño…</option>
                    {activeSizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input
                    className="tl-input"
                    placeholder="Ej. Tsuru rojo"
                    value={editForm.vehicleDescription}
                    onChange={(e) => setEditForm((f) => ({ ...f, vehicleDescription: e.target.value }))}
                  />
                </div>
              </div>

              {/* Prepaid packages — remaining washes + buy. */}
              <div className="rounded-xl border border-border-soft bg-white p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Paquetes prepagados</p>
                {(packagesQ.data ?? []).filter((p) => p.status === 'ACTIVE').length === 0 ? (
                  <p className="text-[12px] text-ink-400">Sin paquetes activos.</p>
                ) : (
                  <div className="space-y-1.5">
                    {(packagesQ.data ?? []).filter((p) => p.status === 'ACTIVE').map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50/60 px-2.5 py-1.5">
                        <span className="text-[12.5px] text-ink-700">{p.serviceTypeName} · {p.vehicleSizeName}</span>
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                          {p.remaining}/{p.washesTotal} restantes
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2.5 grid grid-cols-[1fr_1fr_64px_auto] gap-2">
                  <select
                    className="tl-input"
                    value={buyForm.serviceTypeId}
                    onChange={(e) => setBuyForm((f) => ({ ...f, serviceTypeId: e.target.value ? Number(e.target.value) : '' }))}
                  >
                    <option value="">Servicio…</option>
                    {standardServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select
                    className="tl-input"
                    value={buyForm.vehicleSizeId}
                    onChange={(e) => setBuyForm((f) => ({ ...f, vehicleSizeId: e.target.value ? Number(e.target.value) : '' }))}
                  >
                    <option value="">Tamaño…</option>
                    {activeSizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input
                    className="tl-input"
                    type="number"
                    min={1}
                    value={buyForm.washesTotal}
                    onChange={(e) => setBuyForm((f) => ({ ...f, washesTotal: Math.max(1, Number(e.target.value) || 1) }))}
                  />
                  <button
                    type="button"
                    className="tl-btn tl-btn-sm tl-btn-primary"
                    disabled={buyPackage.isPending || !buyForm.serviceTypeId || !buyForm.vehicleSizeId}
                    onClick={() => buyPackage.mutate({
                      serviceTypeId: Number(buyForm.serviceTypeId),
                      vehicleSizeId: Number(buyForm.vehicleSizeId),
                      washesTotal: buyForm.washesTotal,
                    })}
                  >
                    {buyPackage.isPending ? '…' : 'Vender'}
                  </button>
                </div>
                {buyPackage.error && <p className="mt-1 text-[12px] text-rose-600">{buyPackage.error.message}</p>}
              </div>

              {updateCustomer.error && (
                <p className="text-[12px] text-rose-600">{updateCustomer.error.message}</p>
              )}
              {deleteCustomer.error && (
                <p className="text-[12px] text-rose-600">{deleteCustomer.error.message}</p>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-border-soft pt-3">
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-rose-700">¿Eliminar este cliente?</span>
                    <button
                      type="button"
                      className="tl-btn tl-btn-sm tl-btn-danger"
                      onClick={() => deleteCustomer.mutate()}
                      disabled={deleteCustomer.isPending}
                    >
                      {deleteCustomer.isPending ? 'Eliminando…' : 'Sí, eliminar'}
                    </button>
                    <button
                      type="button"
                      className="tl-btn tl-btn-sm tl-btn-ghost"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="tl-btn tl-btn-sm tl-btn-ghost"
                    style={{ color: 'var(--bad-600)' }}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Eliminar cliente
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="tl-btn tl-btn-ghost"
                    onClick={() => setEditing(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="tl-btn tl-btn-primary"
                    disabled={updateCustomer.isPending || editForm.name.trim().length === 0}
                    onClick={() => updateCustomer.mutate({
                      name: editForm.name.trim(),
                      phone: editForm.phone.replace(/\D/g, '').slice(0, 10) || undefined,
                      notes: editForm.notes.trim() || undefined,
                      vehicleSizeId: editForm.vehicleSizeId ? Number(editForm.vehicleSizeId) : null,
                      vehicleDescription: editForm.vehicleDescription.trim() || undefined,
                    })}
                  >
                    <ICheck size={14} /> {updateCustomer.isPending ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Nuevo cliente form */}
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="tl2-card t-ink" style={{ position: 'sticky', top: 18 }}>
            <div className="tl2-card__head">
              <div>
                <h3>Nuevo cliente</h3>
                <p>Teléfono y nombre — listo en segundos</p>
              </div>
            </div>
            <div className="tl2-card__body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Teléfono · 10 dígitos</span>
                  <input
                    ref={phoneRef}
                    className="tl-input"
                    inputMode="numeric"
                    placeholder="899 123 4567"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    style={{ fontFamily: 'var(--font-mono-display)', fontWeight: 700, letterSpacing: '0.04em', fontSize: 15 }}
                  />
                  <span className="mt-1 block text-[10.5px] text-ink-400">Es la identidad del cliente en lealtad</span>
                </label>

                {dup && (
                  <div className="cli-dup">
                    <IAlert size={15} />
                    <span>Ya existe <b>{dup.name}</b> con este número.</span>
                  </div>
                )}
                {!dup && !phoneValid && (
                  <div className="cli-dup">
                    <IAlert size={15} />
                    <span>El teléfono necesita 10 dígitos (llevas {digits.length}).</span>
                  </div>
                )}

                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Nombre del cliente</span>
                  <input
                    className="tl-input"
                    placeholder="Ej. Juan Pérez"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Notas <span className="text-ink-400 font-normal normal-case tracking-normal">· Opcional</span></span>
                  <input
                    className="tl-input"
                    placeholder="Ej. Jetta gris · ABC-12-34"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </label>

                <div className="flex items-center gap-2">
                  <button type="submit" className="tl-btn tl-btn-primary" disabled={!canSave || createCustomer.isPending}>
                    <ICheck size={15} /> {createCustomer.isPending ? 'Guardando…' : 'Guardar cliente'}
                  </button>
                  {(form.phone || form.name || form.notes) && (
                    <button type="button" className="tl-btn tl-btn-ghost" onClick={() => setForm({ name: '', phone: '', notes: '' })}>Limpiar</button>
                  )}
                </div>

                {createCustomer.error && (
                  <p className="text-[12px] text-rose-600">{createCustomer.error.message}</p>
                )}

                {saved && (
                  <div className="cli-saved">
                    <span className="cli-saved__ico"><ICheck size={15} /></span>
                    <span><b>{saved}</b> guardado. Tarjeta de lealtad iniciada en 0 de 10.</span>
                  </div>
                )}

                <div className="cli-foot">
                  <span><span className="lz-key">Tab</span> Siguiente campo</span>
                  <span><span className="lz-key">↵</span> Guardar</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}

// ── Lealtad (loyalty / punch-card overview) ────────────────────────
// ── Lealtad: 10-slot punch card matching the kit's lz-punch design.
function LzPunchCard({ punches }: { punches: number }) {
  const tier = punches >= 10 ? 'free' : punches >= 5 ? 'half' : 'none'
  return (
    <div className="lz-punch">
      <div className="lz-punch__top">
        <span className="lz-punch__title">Tarjeta de lavados</span>
        <span className="lz-punch__count"><b>{punches}</b> de 10</span>
      </div>
      <div className="lz-slots">
        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1
          const done = n <= punches
          const isHalf = n === 5
          const isFree = n === 10
          const isNext = !done && n === punches + 1
          const readyHalf = isHalf && tier === 'half'
          const readyFree = isFree && tier === 'free'
          const cls = ['lz-slot',
            done ? 'done' : '',
            isHalf ? 'm-half' : '', isFree ? 'm-free' : '',
            isNext ? 'next' : '',
            readyHalf || readyFree ? 'ready' : '',
          ].filter(Boolean).join(' ')
          return (
            <div key={n} className={cls}>
              {done ? <ICheck size={16} stroke={2.6} /> : n}
              {isHalf && <span className="lz-slot__tag half">½ precio</span>}
              {isFree && <span className="lz-slot__tag free">Gratis</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LzRewardCallout({ punches }: { punches: number }) {
  if (punches >= 10) {
    return (
      <div className="lz-callout free">
        <div className="lz-callout__ico"><ICheck size={22} stroke={2.6} /></div>
        <div className="lz-callout__body">
          <div className="lz-callout__title">Lavado gratis disponible</div>
          <div className="lz-callout__sub">Completó 10 lavados — el siguiente va por la casa.</div>
        </div>
      </div>
    )
  }
  if (punches >= 5) {
    return (
      <div className="lz-callout half">
        <div className="lz-callout__ico"><ICheck size={20} stroke={2.4} /></div>
        <div className="lz-callout__body">
          <div className="lz-callout__title">Medio precio disponible</div>
          <div className="lz-callout__sub">Llegó a 5 lavados — este lavado va a mitad de precio.</div>
        </div>
      </div>
    )
  }
  const faltanHalf = 5 - punches
  return (
    <div className="lz-callout none">
      <div className="lz-callout__ico"><ICar size={22} /></div>
      <div className="lz-callout__body">
        <div className="lz-callout__title">{punches === 0 ? 'Tarjeta nueva' : `Te faltan ${faltanHalf} ${faltanHalf === 1 ? 'lavado' : 'lavados'} para medio precio`}</div>
        <div className="lz-callout__sub">A los 5 lavados: mitad de precio. A los 10: gratis.</div>
      </div>
    </div>
  )
}

function LealtadScreen() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [selected, setSelected] = useState<Customer | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setActiveIdx(0) }, [query])

  const customersQ = useQuery({
    queryKey: ['customers'],
    queryFn: () => api<Customer[]>('/api/v1/customers'),
  })
  const all = customersQ.data ?? []

  // Lookup: match by name or by phone digits (mirrors the kit's last-4 idea).
  const qDigits = query.replace(/\D/g, '')
  const qNorm = query.trim().toLowerCase()
  const results: Customer[] = !query.trim() ? [] : all
    .filter((c) => {
      const phoneDigits = (c.phone ?? '').replace(/\D/g, '')
      if (qDigits.length >= 2 && phoneDigits.endsWith(qDigits)) return true
      return c.name.toLowerCase().includes(qNorm)
    })
    .slice(0, 8)

  const clientesActivos = all.length
  const conPremioListo = all.filter((c) => c.loyaltyProgress >= 5).length
  const premiosCanjeados = all.reduce((sum, c) => sum + (c.loyaltyRewardsEarned ?? 0), 0)
  const conversionPct = clientesActivos > 0
    ? Math.round((all.filter((c) => c.loyaltyRewardsEarned > 0).length / clientesActivos) * 100)
    : 0

  const proximosAlPremio = [...all]
    .filter((c) => c.loyaltyProgress >= 5)
    .sort((a, b) => b.loyaltyProgress - a.loyaltyProgress)

  const onLookupKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
    else if (event.key === 'Enter') {
      event.preventDefault()
      if (results.length) { setSelected(results[activeIdx]); setQuery('') }
    } else if (event.key === 'Escape') {
      setSelected(null); setQuery(''); inputRef.current?.focus()
    }
  }

  const punches = selected?.loyaltyProgress ?? 0

  return (
    <section className="space-y-5">
      <div className="tl2-page-header">
        <div className="tl2-page-header__left">
          <div className="tl2-page-header__eyebrow"><span className="dot" />GESTIÓN · LEALTAD</div>
          <h1 className="tl2-page-header__title">Lealtad</h1>
          <p className="tl2-page-header__subtitle">
            Tarjeta de lealtad de 10 lavados — al 5° toca medio precio, al 10° el lavado va por la casa.
          </p>
        </div>
        <div className="tl2-page-header__right">
          <button type="button" className="cli-headcta" onClick={() => navigate('/clientes')}>
            <IClients size={15} /> Ver clientes
          </button>
        </div>
      </div>

      <div className="lz-grid">
        {/* ── Left workspace: lookup → customer panel ───────────── */}
        <div className="tl2-card t-purple">
          <div className="tl2-card__body">
            {!selected && (
              <div>
                <div className="lz-seclabel"><span className="n">1</span>Buscar cliente</div>
                <div className="lz-lookup">
                  <div className="lz-lookup__wrap">
                    <span className="lz-lookup__ico"><ISearch size={20} /></span>
                    <input
                      ref={inputRef}
                      className="lz-lookup__input"
                      placeholder="nombre o últimos 4"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={onLookupKey}
                      aria-label="Buscar cliente"
                    />
                    <span className="lz-lookup__kbd">
                      <span className="lz-key">↵</span> abrir
                    </span>
                  </div>
                </div>

                {query.trim() && results.length > 0 && (
                  <div className="lz-results">
                    {results.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`lz-result ${idx === activeIdx ? 'active' : ''}`}
                        onClick={() => { setSelected(c); setQuery('') }}
                        onMouseEnter={() => setActiveIdx(idx)}
                      >
                        <span className="lz-result__av" style={{ background: cliColor(c.name) }}>{cliInitials(c.name)}</span>
                        <div className="lz-result__body">
                          <div className="lz-result__name">{c.name}</div>
                          <div className="lz-result__sub">{cliGroupPhone(c.phone)}</div>
                        </div>
                        <span className="lz-result__meta">{c.loyaltyProgress}/10</span>
                      </button>
                    ))}
                  </div>
                )}

                {query.trim() && results.length === 0 && !customersQ.isLoading && (
                  <div className="lz-empty">
                    <span className="lz-empty__ico"><ISearch size={22} /></span>
                    <h4>Ningún cliente coincide con “{query}”.</h4>
                    <p>Registra el cliente desde la pantalla Clientes.</p>
                    <button type="button" className="cli-headcta" onClick={() => navigate('/clientes')}>
                      <IPlus size={14} /> Registrar nuevo
                    </button>
                  </div>
                )}

                {!query.trim() && (
                  <div className="lz-empty">
                    <span className="lz-empty__ico"><IClients size={22} /></span>
                    <h4>Busca un cliente para ver su tarjeta de lealtad.</h4>
                    <p>Escribe nombre completo o los últimos 4 dígitos del teléfono.</p>
                  </div>
                )}

                <div className="lz-foot">
                  <span><span className="lz-key">↑</span><span className="lz-key">↓</span> Navegar</span>
                  <span><span className="lz-key">↵</span> Abrir cliente</span>
                  <span><span className="lz-key">Esc</span> Limpiar</span>
                </div>
              </div>
            )}

            {selected && (
              <div>
                <div className="lz-cust">
                  <span className="lz-cust__av" style={{ background: cliColor(selected.name) }}>{cliInitials(selected.name)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="lz-cust__name">{selected.name}</div>
                    <div className="lz-cust__sub">
                      <span className="font-mono">{cliGroupPhone(selected.phone)}</span>
                      {selected.loyaltyRewardsEarned > 0 && <span>· {selected.loyaltyRewardsEarned} premio{selected.loyaltyRewardsEarned === 1 ? '' : 's'} canjeado{selected.loyaltyRewardsEarned === 1 ? '' : 's'}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => { setSelected(null); setQuery(''); inputRef.current?.focus() }}
                    className="rounded-full bg-ink-50 px-3 py-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-600 hover:bg-ink-100">
                    Cambiar
                  </button>
                </div>

                <div className="lz-seclabel"><span className="n">2</span>Progreso de la tarjeta</div>
                <LzPunchCard punches={punches} />
                <LzRewardCallout punches={punches} />

                <div className="lz-actions">
                  <button
                    type="button"
                    disabled={punches < 9}
                    onClick={() => navigate('/tickets/nuevo')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400"
                    data-testid="lealtad-apply-free"
                  >
                    Aplicar gratis (10/10)
                  </button>
                  <button
                    type="button"
                    disabled={punches < 5}
                    onClick={() => navigate('/tickets/nuevo')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400"
                    data-testid="lealtad-apply-half"
                  >
                    Aplicar mitad (50% off)
                  </button>
                </div>

                <div className="lz-foot">
                  <span><span className="lz-key">Esc</span> Volver a buscar</span>
                  <span>Aplicar premio te lleva a Nuevo ticket — selecciona al cliente ahí para canjear.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right rail: KPIs + Próximos al premio ───────────── */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="tl2-kpi">
              <div className="tl2-kpi__label"><span className="dot" />Clientes activos</div>
              <div className="tl2-kpi__value">{clientesActivos}</div>
              <div className="tl2-kpi__foot"><span>en directorio</span></div>
            </div>
            <div className="tl2-kpi t-warn">
              <div className="tl2-kpi__label"><span className="dot" />Premio listo</div>
              <div className="tl2-kpi__value">{conPremioListo}</div>
              <div className="tl2-kpi__foot"><span>≥ 5 lavados</span></div>
            </div>
            <div className="tl2-kpi t-good">
              <div className="tl2-kpi__label"><span className="dot" />Premios canjeados</div>
              <div className="tl2-kpi__value">{premiosCanjeados}</div>
              <div className="tl2-kpi__foot"><span>histórico</span></div>
            </div>
            <div className="tl2-kpi t-info">
              <div className="tl2-kpi__label"><span className="dot" />Conversión</div>
              <div className="tl2-kpi__value">{conversionPct}%</div>
              <div className="tl2-kpi__foot"><span>al menos 1 premio</span></div>
            </div>
          </div>

          <div className="tl2-card t-purple">
            <div className="tl2-card__head">
              <div>
                <h3>Próximos al premio</h3>
                <p>{proximosAlPremio.length} cliente{proximosAlPremio.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <div className="tl2-card__body flush">
              {customersQ.isLoading && <div className="cli-noresults"><p>Cargando…</p></div>}
              {!customersQ.isLoading && proximosAlPremio.length === 0 && (
                <div className="cli-noresults">
                  <p>Nadie ha llegado a 5 lavados todavía.</p>
                </div>
              )}
              {proximosAlPremio.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className="cli-row w-full text-left"
                  style={{ background: 'transparent', cursor: 'pointer' }}
                >
                  <div className="cli-row__who">
                    <span className="cli-avatar" style={{ background: cliColor(c.name) }}>{cliInitials(c.name)}</span>
                    <div className="cli-row__name">
                      <span className="nm">{c.name}</span>
                      <span className="sb"><span className="font-mono">{cliGroupPhone(c.phone)}</span></span>
                    </div>
                  </div>
                  <div className="cli-row__prog">
                    <span className="cli-row__count">{c.loyaltyProgress}/10</span>
                  </div>
                  <div className="cli-row__state r">
                    {c.loyaltyProgress >= 9 ? <Pill tone="good">Gratis</Pill> : <Pill tone="warn">Mitad</Pill>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Dashboard hero big metric — kit v3's HeroBigMetric. Lives inside BrandHero.
function DashHeroMetric({
  icon,
  label,
  value,
  badges = [],
  spark,
  sparkColor = '#86efac',
  valueColor = '#fff',
  sepLeft,
  testId,
}: {
  icon?: ReactNode
  label: string
  value: ReactNode
  badges?: Array<[string, 'good' | 'warn' | 'info' | 'ghost']>
  spark?: number[]
  sparkColor?: string
  valueColor?: string
  sepLeft?: boolean
  testId?: string
}) {
  return (
    <div
      data-testid={testId}
      style={{
        borderLeft: sepLeft ? '1px solid rgba(255,255,255,0.08)' : 'none',
        paddingLeft: sepLeft ? 28 : 0,
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 10.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'rgba(255,255,255,0.50)',
        }}
      >
        {icon}
        {label}
      </div>
      <div
        className="tl2-mono-display"
        style={{
          marginTop: 10,
          fontFamily: 'var(--font-display)',
          fontSize: 46,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: valueColor,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {badges.map(([txt, tone]) => (
          <span
            key={txt}
            style={{
              background:
                tone === 'good' ? 'rgba(34,197,94,0.18)'
                : tone === 'warn' ? 'rgba(245,158,11,0.18)'
                : tone === 'info' ? 'rgba(139,92,246,0.18)'
                : 'rgba(255,255,255,0.12)',
              color:
                tone === 'good' ? '#86efac'
                : tone === 'warn' ? '#fcd34d'
                : tone === 'info' ? '#c4b5fd'
                : '#fff',
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {txt}
          </span>
        ))}
      </div>
      {spark && spark.length >= 2 && (
        <div style={{ marginTop: 14, color: sparkColor }}>
          <SparklineV2 data={spark} width={160} height={32} color={sparkColor} />
        </div>
      )}
    </div>
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
  const { auth, hasRole } = useAuth()
  const isOwner = hasRole('DUENO')
  // Month-to-date totals are GERENTE+ only — the cashier sees day-to-day numbers only.
  const canSeeMonthTotals = hasRole('GERENTE')
  const monthStart = today.slice(0, 7) + '-01'
  const monthHist = useQuery({
    queryKey: ['historical-month', monthStart],
    queryFn: () => api<HistoricalRangeResponse>(`/api/v1/reports/historical?from=${monthStart}&to=${today}`),
    enabled: canSeeMonthTotals,
  })

  // 7-day window for the BrandHero sparklines.
  const sparkFrom = (() => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() - 6)
    return d.toISOString().slice(0, 10)
  })()
  const sparkHist = useQuery({
    queryKey: ['historical-7d', sparkFrom, date],
    queryFn: () => api<HistoricalRangeResponse>(`/api/v1/reports/historical?from=${sparkFrom}&to=${date}`),
  })
  const sparkCarros = (sparkHist.data?.days ?? []).map((d) => Number(d.totalCars ?? 0))
  const sparkIngresos = (sparkHist.data?.days ?? []).map((d) => Number(d.revenueMxn ?? 0))
  const sparkResult = (sparkHist.data?.days ?? []).map((d) => Number(d.resultadoMxn ?? 0))

  const data = summary.data
  const yest = yestSummary.data
  const phaseData = usePhaseData()
  const openShifts = (phaseData.shifts.data ?? []).filter((s) => s.status === 'OPEN')
  const flagged = useQuery({
    queryKey: ['audit-events', 'flagged'],
    queryFn: () => api<AuditEvent[]>('/api/v1/audit-events/flagged'),
    enabled: isOwner,
  })
  const pendingFlagged = flagged.data ?? []

  const isLoading = summary.isLoading

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = auth?.user.fullName.split(' ')[0] ?? ''
  const dateObj = new Date(date + 'T00:00:00')
  const weekday = dateObj.toLocaleDateString('es-MX', { weekday: 'long' })
  const dayMonth = dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
  const dateLong = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dayMonth}`

  const monthDate = new Date()
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()

  // Operating-profit derived values (kit's "utilidad operativa" model).
  // Nómina is computed weekly, not daily — so we render it as "Pendiente"
  // in the cost panel and leave it out of the utilidad math entirely (rather
  // than pretending it's $0 and inflating today's apparent profit).
  const ingresos = (data?.ticketRevenue ?? 0) + (data?.prepaidSalesRevenue ?? 0) + (data?.inventorySalesRevenue ?? 0)
  const gastos = data?.expensesTotal ?? 0
  const utilidad = ingresos - gastos
  const margin = ingresos > 0 ? Math.round((utilidad / ingresos) * 100) : 0
  const carros = data?.carsWashed ?? 0
  const sources = [
    { key: 'tickets',  name: 'Lavados (tickets)', sub: `${carros} carros`, amount: data?.ticketRevenue ?? 0,         color: '#7c3aed' },
    { key: 'paquetes', name: 'Paquetes prepago',  sub: 'paquetes vendidos hoy',     amount: data?.prepaidSalesRevenue ?? 0,    color: '#0891b2' },
    { key: 'misc',     name: 'Miscelánea',        sub: 'aromas, tapetes',           amount: data?.inventorySalesRevenue ?? 0,  color: '#d97706' },
  ]
  const maxSrc = Math.max(...sources.map((source) => source.amount), 1)
  const costs: Array<{ key: string; name: string; sub: string; amount: number; color: string; pending?: boolean }> = [
    { key: 'nomina', name: 'Nómina del día',    sub: 'se calcula al cerrar la semana', amount: 0,      color: '#f59e0b', pending: true },
    { key: 'gastos', name: 'Gastos operativos', sub: 'material + agua + CFE',          amount: gastos, color: '#ef4444' },
  ]
  const maxCost = Math.max(...costs.map((cost) => cost.amount), 1)

  return (
    <section className="db-wrap">
      {/* ─── Page header (v2): eyebrow + greeting + date picker ───── */}
      <div className="tl2-page-header">
        <div className="tl2-page-header__left">
          <div className="tl2-page-header__eyebrow">
            <span className="dot" />
            {dateLong} · TURBO LAVADO
          </div>
          <h1 className="tl2-page-header__title">{greeting}{firstName ? `, ${firstName}` : ''}.</h1>
          <p className="tl2-page-header__subtitle">Todo lo del día entra aquí — ingresos, costos y utilidad operativa.</p>
        </div>
        <div className="tl2-page-header__right">
          <label className="block">
            <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400">Ver fecha</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="tl-input" style={{ width: 180 }} />
          </label>
        </div>
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

      {/* ─── BrandHero: 3 editorial KPIs with sparklines + watermark ── */}
      <BrandHero
        watermark="TURBO"
        corner={<>TURBO LAVADO<span className="sep">·</span>RESUMEN</>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, marginTop: 22 }}>
          <DashHeroMetric
            testId="metric-carros-lavados"
            icon={<ICar size={14} />}
            label="Carros lavados"
            value={
              <span data-testid="metric-carros-lavados-value">
                {isLoading ? <span className="tl-metric-skeleton narrow" /> : carros}
              </span>
            }
            badges={[
              ...(data?.courtesyCount ? [[`${data.courtesyCount} cortesía${data.courtesyCount === 1 ? '' : 's'}`, 'warn'] as [string, 'warn']] : []),
              ...(openShifts.length > 0 ? [[`${openShifts.length} turno${openShifts.length === 1 ? '' : 's'} activo${openShifts.length === 1 ? '' : 's'}`, 'good'] as [string, 'good']] : []),
            ]}
            spark={sparkCarros}
          />
          <DashHeroMetric
            testId="metric-ingresos-autos"
            icon={<IMoney size={14} />}
            label="Ingresos"
            value={
              <span data-testid="metric-ingresos-autos-value">
                {isLoading ? <span className="tl-metric-skeleton wide" /> : money(ingresos, 'MXN')}
              </span>
            }
            badges={yest ? [[`vs ayer ${money(yest.ticketRevenue + yest.prepaidSalesRevenue + yest.inventorySalesRevenue, 'MXN')}`, 'ghost']] : []}
            spark={sparkIngresos}
            sepLeft
          />
          <DashHeroMetric
            icon={<IReports size={14} />}
            label="Resultado"
            value={isLoading ? <span className="tl-metric-skeleton wide" /> : money(utilidad, 'MXN')}
            valueColor={utilidad >= 0 ? '#86efac' : '#fda4af'}
            badges={[[`${margin}% margen`, margin >= 0 ? 'good' : 'warn']]}
            spark={sparkResult}
            sparkColor={utilidad >= 0 ? '#86efac' : '#fca5a5'}
            sepLeft
          />
        </div>

        {/* CTA strip — replaces the prior Quick actions row */}
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate('/tickets/nuevo')}
              className="tl2-press tl2-focus"
              style={{ background: '#fff', color: '#0f172a', height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, border: 0, fontFamily: 'var(--font-display)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              disabled={openShifts.length === 0}
            >
              <IPlus size={14} stroke={2.4} /> Nuevo ticket
            </button>
            <button
              type="button"
              onClick={() => navigate('/corte')}
              className="tl2-press tl2-focus"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'var(--font-display)', cursor: 'pointer' }}
            >
              Hacer corte
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--brand-green-bright)', boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
            {openShifts.length > 0
              ? `${openShifts.length} turno${openShifts.length === 1 ? '' : 's'} activo${openShifts.length === 1 ? '' : 's'}`
              : 'Sin turno abierto'}
          </div>
        </div>
      </BrandHero>

      {/* ─── 5-col mini KPI row ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <KpiV2
          label="Efectivo"
          value={money(data?.cashRevenue ?? 0, 'MXN')}
          tone="good"
          sub="ingreso en caja"
        />
        <KpiV2
          label="Depósito"
          value={money((data?.transferRevenue ?? 0) + (data?.cardRevenue ?? 0), 'MXN')}
          tone="warn"
          sub="transferencia + tarjeta"
        />
        <KpiV2
          label="Miscelánea"
          value={money(data?.inventorySalesRevenue ?? 0, 'MXN')}
          sub="aromas + tapetes"
        />
        <KpiV2
          label="Gastos"
          value={money(data?.expensesTotal ?? 0, 'MXN')}
          tone="bad"
          sub="material + agua + CFE"
        />
        <KpiV2
          label="Sobrante / faltante"
          value={
            data?.cashVariance == null
              ? 'Pendiente'
              : Number(data.cashVariance) === 0
                ? 'Cuadrada'
                : `${Number(data.cashVariance) > 0 ? '+' : ''}${money(Number(data.cashVariance), 'MXN')}`
          }
          tone={data?.cashVariance == null ? undefined : Number(data.cashVariance) === 0 ? 'good' : Number(data.cashVariance) < 0 ? 'bad' : 'good'}
          sub={data?.cashVariance == null ? 'por confirmar en corte' : 'vs efectivo esperado'}
        />
      </div>

      {/* ─── Sources + Costs ───────────────────────────────────────── */}
      <div className="db-cols">
        {/* Income sources */}
        <div className="tl2-card t-purple">
          <div className="tl2-card__head">
            <div>
              <h3>De dónde entró el dinero</h3>
              <p>Todas las fuentes de ingreso del día</p>
            </div>
          </div>
          <div className="tl2-card__body flush">
            <div className="db-bars">
              {sources.map((source) => (
                <div className="db-bar" key={source.key}>
                  <div className="db-bar__lbl">
                    <span className="db-bar__dot" style={{ background: source.color }} />
                    <div>
                      <div className="db-bar__name">{source.name}</div>
                      <div className="db-bar__sub">{source.sub}</div>
                    </div>
                  </div>
                  <div className="db-bar__track">
                    <div className="db-bar__fill" style={{ width: `${(source.amount / maxSrc) * 100}%`, background: source.color }} />
                  </div>
                  <div className="db-bar__amt">
                    {money(source.amount, 'MXN')}
                    <span className="pct">{ingresos > 0 ? Math.round((source.amount / ingresos) * 100) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="db-cardfoot">
              <span className="db-cardfoot__tot">Ingresos totales <b>{money(ingresos, 'MXN')}</b></span>
              <Pill tone="good">+ entra a utilidad</Pill>
            </div>
          </div>
        </div>

        {/* Costs */}
        <div className="tl2-card t-amber">
          <div className="tl2-card__head">
            <div>
              <h3>A dónde se fue</h3>
              <p>Costos que bajan la utilidad</p>
            </div>
          </div>
          <div className="tl2-card__body flush">
            <div className="db-bars">
              {costs.map((cost) => (
                <div className="db-bar" key={cost.key}>
                  <div className="db-bar__lbl">
                    <span className="db-bar__dot" style={{ background: cost.color }} />
                    <div>
                      <div className="db-bar__name">{cost.name}</div>
                      <div className="db-bar__sub">{cost.sub}</div>
                    </div>
                  </div>
                  <div className="db-bar__track">
                    <div className="db-bar__fill" style={{ width: `${(cost.amount / maxCost) * 100}%`, background: cost.color }} />
                  </div>
                  <div className="db-bar__amt">
                    {cost.pending ? <span style={{ color: 'var(--ink-400)', fontWeight: 600 }}>Pendiente</span> : money(cost.amount, 'MXN')}
                    {!cost.pending && (
                      <span className="pct">{ingresos > 0 ? Math.round((cost.amount / ingresos) * 100) : 0}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="db-cardfoot">
              <span className="db-cardfoot__tot">Costos totales <b>{money(gastos, 'MXN')}</b></span>
              <Pill tone="bad">− baja utilidad</Pill>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Acumulado del mes (GERENTE+ only) ─────────────────────── */}
      {canSeeMonthTotals && monthHist.data && (
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
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-emerald-400"
              style={{ width: `${Math.min(100, Math.round((monthDate.getDate() / daysInMonth) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── Movements feed (replaces the old recent-tickets table) ── */}
      <div className="tl2-card t-purple" data-testid="panel-tickets-recientes">
        <div className="tl2-card__head">
          <div>
            <h3>Movimientos de hoy</h3>
            <p>{(data?.recentTickets ?? []).length} registros</p>
          </div>
          <NavLink to="/tickets" className="text-[12px] font-semibold text-violet-600 no-underline hover:text-violet-700">
            Ver todos →
          </NavLink>
        </div>
        <div className="tl2-card__body flush">
          <div className="db-feed">
            {(data?.recentTickets ?? []).map((ticket) => {
              const occurred = ticket.occurredAt ?? ticket.createdAt
              const timeStr = new Date(occurred).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
              const lavadorNames = ticket.assignments.map((a) => a.employeeName)
              const firstLavador = lavadorNames[0]?.split(' ')[0]
              return (
                <div className="db-mv" key={ticket.id}>
                  <span className="db-mv__time">{timeStr}</span>
                  <div className="db-mv__mid">
                    <span className="db-mv__icon" style={{ background: 'var(--ink-100)', color: 'var(--ink-600)' }}>
                      <ITickets size={16} />
                    </span>
                    <div className="db-mv__txt">
                      <div className="db-mv__title">
                        {ticket.serviceTypeName} · {ticket.vehicleSizeName}
                        <span className="db-tag tk">Lavado</span>
                      </div>
                      <div className="db-mv__sub">
                        {ticket.vehicleDescription || '—'}
                        {firstLavador && ` · ${firstLavador}${lavadorNames.length > 1 ? ` +${lavadorNames.length - 1}` : ''}`}
                      </div>
                    </div>
                  </div>
                  <span className="db-mv__amt">
                    {ticket.courtesy ? <span className="italic text-amber-600">GRATIS</span> : `+${money(Number(ticket.priceAmount), 'MXN')}`}
                  </span>
                </div>
              )
            })}
            {!summary.isLoading && (data?.recentTickets.length ?? 0) === 0 && (
              <div className="py-10 text-center text-[13px] text-ink-400">
                Sin movimientos para esta fecha. Crea tickets desde Nuevo ticket.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function EndOfDayScreen() {
  const navigate = useNavigate()
  const data = usePhaseData()
  const [salidasReviewed, setSalidasReviewed] = useState(false)
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

  // Per-shift carros + efectivo from the day's recent tickets — kit Turnos cards
  // need both, computed locally rather than via a separate per-shift endpoint.
  const tickets = daily?.recentTickets ?? []
  const ticketsByShift = new Map<number, Ticket[]>()
  for (const t of tickets) {
    const arr = ticketsByShift.get(t.shiftId) ?? []
    arr.push(t)
    ticketsByShift.set(t.shiftId, arr)
  }
  const shiftStats = (shiftId: number) => {
    const ts = ticketsByShift.get(shiftId) ?? []
    return {
      cars: ts.filter((t) => t.status !== 'VOIDED').length,
      cash: ts.filter((t) => t.status !== 'VOIDED' && t.paymentMethod === 'CASH').reduce((s, t) => s + Number(t.priceAmount), 0),
    }
  }

  // Lista de cierre — kit's 4-item checklist, wired to real shift + ticket
  // + expense data. Each row maps to a destination + status.
  const matMorning = shifts.find((s) => s.shiftType === 'MATUTINO')
  const matEvening = shifts.find((s) => s.shiftType === 'VESPERTINO')
  const ticketsSinLavador = tickets.filter((t) => t.status !== 'VOIDED' && t.assignments.length === 0)
  const totalSalidas = (daily?.expensesTotal ?? 0) + (daily?.withdrawalsTotal ?? 0) + (daily?.advancesTotal ?? 0)
  const salidasCount =
    (daily ? (daily.expensesTotal > 0 ? 1 : 0) : 0)
    + (daily ? (daily.withdrawalsTotal > 0 ? 1 : 0) : 0)
    + (daily ? (daily.advancesTotal > 0 ? 1 : 0) : 0)

  type Check = {
    id: string
    title: string
    sub: string
    icon: ReactNode
    ok: boolean
    pending: boolean
    urgent?: boolean
    actionLabel: string
    onAction: () => void
  }

  const checklist: Check[] = [
    {
      id: 'matutino',
      title: 'Corte del turno matutino',
      sub: matMorning
        ? matMorning.status === 'CLOSED'
          ? 'Cerrado · sin pendientes'
          : 'Pendiente · cuenta el efectivo antes de cerrar'
        : 'Sin turno matutino abierto hoy',
      icon: <ICut size={16} />,
      ok: Boolean(matMorning && matMorning.status === 'CLOSED'),
      pending: Boolean(matMorning && matMorning.status === 'OPEN'),
      urgent: Boolean(matMorning && matMorning.status === 'OPEN'),
      actionLabel: matMorning && matMorning.status === 'OPEN' ? 'Hacer corte' : 'Ver corte',
      onAction: () => navigate('/corte'),
    },
    {
      id: 'vespertino',
      title: 'Corte del turno vespertino',
      sub: matEvening
        ? matEvening.status === 'CLOSED'
          ? 'Cerrado · sin pendientes'
          : 'Pendiente · cuenta el efectivo antes de cerrar'
        : 'Sin turno vespertino abierto hoy',
      icon: <ICut size={16} />,
      ok: Boolean(matEvening && matEvening.status === 'CLOSED'),
      pending: Boolean(matEvening && matEvening.status === 'OPEN'),
      urgent: Boolean(matEvening && matEvening.status === 'OPEN'),
      actionLabel: matEvening && matEvening.status === 'OPEN' ? 'Hacer corte' : 'Ver corte',
      onAction: () => navigate('/corte'),
    },
    {
      id: 'tickets',
      title: 'Tickets sin lavador',
      sub: ticketsSinLavador.length === 0
        ? 'Todos los tickets tienen lavador asignado'
        : `${ticketsSinLavador.length} ticket${ticketsSinLavador.length === 1 ? '' : 's'} sin asignar`,
      icon: <ITickets size={16} />,
      ok: ticketsSinLavador.length === 0,
      pending: ticketsSinLavador.length > 0,
      actionLabel: 'Revisar',
      onAction: () => navigate('/tickets'),
    },
    {
      id: 'salidas',
      title: 'Salidas del día revisadas',
      sub: salidasReviewed
        ? `${salidasCount} salida${salidasCount === 1 ? '' : 's'} · ${money(totalSalidas, 'MXN')} en total`
        : totalSalidas > 0
          ? `${salidasCount} salida${salidasCount === 1 ? '' : 's'} · ${money(totalSalidas, 'MXN')} sin revisar`
          : 'Sin gastos, retiros ni préstamos hoy',
      icon: <IMoney size={16} />,
      ok: salidasReviewed || totalSalidas === 0,
      pending: !salidasReviewed && totalSalidas > 0,
      actionLabel: salidasReviewed || totalSalidas === 0 ? 'Revisar' : 'Marcar revisado',
      onAction: () => {
        if (!salidasReviewed && totalSalidas > 0) setSalidasReviewed(true)
        else navigate('/gastos')
      },
    },
  ]
  const readyCount = checklist.filter((c) => c.ok).length
  const allReady = readyCount === checklist.length

  return (
    <section className="space-y-5">
      <PageHead
        title="Cierre del día"
        subtitle="Revisa el trabajo de hoy y cierra los turnos abiertos."
      />

      {/* Dark hero — day result + 4 stats grid */}
      <div
        style={{
          position: 'relative', overflow: 'hidden', borderRadius: 20,
          background: 'radial-gradient(120% 130% at 100% 0%, rgba(34,197,94,0.22), transparent 55%), linear-gradient(135deg, #0f0820, #1a0f2e 45%, #16281f)',
          padding: '22px 26px', color: '#fff',
          boxShadow: '0 24px 48px -22px rgba(15,23,42,0.5)',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.72)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--brand-green-bright)', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }} />
              {data.currentBusinessDay ? 'EN OPERACIÓN' : 'SIN DÍA ABIERTO'} · {today}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Resultado de hoy
            </div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              {daily && result != null && result < 0 && (
                <span
                  aria-hidden
                  style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: '#fda4af' }}
                >−</span>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
                  color: result == null ? 'rgba(255,255,255,0.45)' : result >= 0 ? 'rgba(134,239,172,0.85)' : 'rgba(252,165,165,0.85)',
                }}
              >$</span>
              <span
                className="tl2-mono-display"
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 800,
                  letterSpacing: '-0.04em', lineHeight: 1,
                  color: result == null ? 'rgba(255,255,255,0.55)' : result >= 0 ? '#86efac' : '#fda4af',
                }}
              >
                {daily ? Math.round(Math.abs(result ?? 0)).toLocaleString('es-MX') : '—'}
              </span>
              {daily && result != null && (
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'center', marginLeft: 8,
                    padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    background: result >= 0 ? 'rgba(134,239,172,0.16)' : 'rgba(252,165,165,0.16)',
                    border: `1px solid ${result >= 0 ? 'rgba(134,239,172,0.4)' : 'rgba(252,165,165,0.4)'}`,
                    color: result >= 0 ? '#bbf7d0' : '#fecaca',
                  }}
                >
                  <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>{result >= 0 ? '▲' : '▼'}</span>
                  {result >= 0 ? 'Ganancia' : 'Pérdida'}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
            {[
              { k: 'Carros', v: daily ? String(daily.carsWashed) : '—', c: '#fff' },
              { k: 'Efectivo', v: daily ? money(daily.cashRevenue, 'MXN') : '—', c: '#86efac' },
              { k: 'Tarjeta + dep.', v: daily ? money((daily.cardRevenue ?? 0) + (daily.transferRevenue ?? 0), 'MXN') : '—', c: '#93c5fd' },
              { k: 'Salidas', v: daily ? `−${money(totalSalidas, 'MXN')}` : '—', c: '#fda4af' },
            ].map((s) => (
              <div key={s.k} style={{ textAlign: 'right' }}>
                <div className="tl2-mono-display" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(255,255,255,0.7)' }}>{s.k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px] xl:items-start">
        <div className="space-y-5">
          {/* Lista de cierre — checklist */}
          <Panel flush title="Lista de cierre" subtitle={`${readyCount} de ${checklist.length} listos`}>
            {checklist.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 18px',
                  borderTop: i === 0 ? 0 : '1px solid var(--ink-100)',
                  background: c.ok
                    ? 'linear-gradient(90deg, rgba(220,252,231,0.3), #fff 50%)'
                    : c.urgent
                      ? 'linear-gradient(90deg, rgba(254,243,199,0.35), #fff 50%)'
                      : '#fff',
                }}
              >
                <span
                  style={{
                    width: 30, height: 30, borderRadius: 9,
                    display: 'grid', placeItems: 'center', flex: '0 0 auto',
                    background: c.ok ? 'var(--brand-green)' : c.urgent ? 'var(--warn-100)' : 'var(--ink-100)',
                    color: c.ok ? '#fff' : c.urgent ? 'var(--warn-700)' : 'var(--ink-500)',
                  }}
                >
                  {c.ok ? <ICheck size={16} stroke={2.6} /> : c.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-900)' }}>{c.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>{c.sub}</div>
                </div>
                {c.ok ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--good-700)' }}>
                    Listo
                  </span>
                ) : (
                  <span
                    style={{
                      background: c.urgent ? 'var(--warn-100)' : 'var(--ink-100)',
                      color: c.urgent ? 'var(--warn-700)' : 'var(--ink-600)',
                      fontSize: 10, fontWeight: 800, padding: '2px 8px',
                      borderRadius: 999, letterSpacing: '0.04em',
                    }}
                  >
                    {c.urgent ? 'PENDIENTE' : 'POR REVISAR'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={c.onAction}
                  className="tl2-press"
                  style={{
                    height: 32, padding: '0 14px', borderRadius: 8,
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                    background: c.urgent ? 'var(--ink-900)' : '#fff',
                    color: c.urgent ? '#fff' : 'var(--ink-800)',
                    border: c.urgent ? 0 : '1px solid var(--border-strong)',
                  }}
                >
                  {c.ok ? 'Ver' : c.actionLabel}
                </button>
              </div>
            ))}
            {checklist.length === 0 && (
              <EmptyState
                icon={<ICheck size={20} />}
                title="Sin pendientes"
                description="No hay turnos ni movimientos para revisar hoy."
                tone="info"
              />
            )}
          </Panel>

          {/* Turnos — kit-aligned 2-col cards with carros + efectivo */}
          <Panel title="Turnos">
            <div className="grid gap-3 md:grid-cols-2">
              {shifts.map((shift) => {
                const open = shift.status === 'OPEN'
                const stats = shiftStats(shift.id)
                return (
                  <div
                    key={shift.id}
                    style={{
                      background: '#fff',
                      border: `1px solid ${open ? 'var(--warn-100)' : 'var(--border-soft)'}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <strong style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>
                        {shift.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino'}
                      </strong>
                      <StatusPill kind={open ? 'Abierto' : 'Cerrado'} />
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                      <div>
                        <div className="tl2-mono-display" style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-900)' }}>{stats.cars}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>carros</div>
                      </div>
                      <div>
                        <div className="tl2-mono-display" style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-900)' }}>{money(stats.cash, 'MXN')}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>efectivo</div>
                      </div>
                    </div>
                    <Button kind={open ? 'primary' : 'secondary'} size="sm" block onClick={() => navigate('/corte')}>
                      {open ? 'Hacer corte' : 'Ver corte'}
                    </Button>
                  </div>
                )
              })}
              {!data.currentBusinessDay && (
                <Banner tone="warn" title="Abre el día para comenzar." />
              )}
              {data.currentBusinessDay && shifts.length === 0 && (
                <Banner tone="info" title="Abre un turno para capturar tickets." />
              )}
            </div>
          </Panel>
        </div>

        <aside style={{ position: 'sticky', top: 76 }}>
          <Panel tone="feature" title="Resumen final">
            <SummaryRow label="Turnos cerrados" value={`${closedShifts.length} de ${shifts.length}`} />
            <SummaryRow
              label="Lista de cierre"
              value={`${readyCount} / ${checklist.length}`}
              vTone={allReady ? 'good' : undefined}
            />
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
              <Button
                kind="primary"
                size="lg"
                block
                disabled={openShifts.length === 0}
                onClick={() => navigate('/corte')}
              >
                {allReady ? 'Cerrar día' : 'Cerrar turno abierto'}
              </Button>
              {!allReady && openShifts.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-500)', textAlign: 'center' }}>
                  Falta cerrar {openShifts.length === 1 ? 'un turno.' : `${openShifts.length} turnos.`}
                </div>
              )}
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
  const revisedAlerts = (history.data ?? [])
    .filter((i) => i.featureType === 'ANOMALY_ALERT' && i.status !== 'NEW')
    .slice(0, 20)

  return (
    <section className="space-y-5">
      {/* ─── Editorial header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />
            DUEÑO · INTELIGENCIA · {today_?.date ?? date}
          </p>
          <h2 className="font-display mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-900">
            Análisis IA
          </h2>
          <p className="mt-1 text-[12.5px] text-ink-500 max-w-xl">
            Brief diario, alertas activas y un analista que responde con datos del negocio.
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

      <AiBriefHero
        today={today_}
        loading={todayData.isLoading}
        onReloadBrief={() => refreshBrief.mutate()}
        reloading={refreshBrief.isPending}
        briefError={refreshBrief.error?.message}
        onAskQuestion={(q) => submitMessage(q)}
      />

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
            className="border-t border-border-soft bg-ink-50/60 p-4 space-y-3"
          >
            {/* SUGERENCIAS — single-click emoji prompts */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.10em] text-ink-500">SUGERENCIAS</span>
                <span className="text-[11px] text-ink-400">Toca para empezar</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['📊', '¿Cómo fue el día?'],
                  ['👤', '¿Quién lavó más carros?'],
                  ['💰', '¿Hubo faltante o sobrante?'],
                  ['📦', '¿Qué productos están bajos?'],
                  ['📈', '¿Cómo va el mes vs. el anterior?'],
                ].map(([emoji, q]) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => submitMessage(q)}
                    disabled={ask.isPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-white px-3 py-1 text-[12px] font-semibold text-ink-700 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                  >
                    <span className="text-[13px]">{emoji}</span>{q}
                  </button>
                ))}
              </div>
            </div>
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

        {/* ─── Right rail: Alerts + Insights guardados ───────── */}
        <aside className="space-y-4">
          <AiAlertsCard
            alerts={alerts}
            revisedAlerts={revisedAlerts}
            loading={todayData.isLoading}
            onAskQuestion={(q) => submitMessage(q)}
          />
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
  subtitle,
  rail,
  action,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  rail: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`tl-panel overflow-hidden ${className}`.trim()}>
      <div className="flex items-start justify-between gap-2.5 border-b border-border-soft bg-ink-50/60 px-5 py-3.5">
        <div className="flex items-start gap-2.5">
          <span className={`mt-1 h-[18px] w-[3px] rounded-full bg-gradient-to-b ${rail}`} />
          <div className="min-w-0">
            <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[11px] text-ink-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Today / Brief rail card ─────────────────────────────────────
// ── Featured brief hero ─────────────────────────────────────────
// Dark gradient full-width "BRIEF DEL DÍA" rail at the top of /ai. Pulls KPIs
// from `today.summary` and the day's narrative from `today.brief.summary`. The
// 3 follow-up question chips on the bottom-left submit straight into the chat
// composer via `onAskQuestion`.
// Build a data-driven headline that mirrors the design exactly:
//   "Día {tone}: {N} carros contra promedio de {X}. Ingresos {±Y%} vs. ayer."
// Numbers are embedded as colored spans up-front so there's no regex
// post-processing to mangle dates or stray digits in AI-generated text.
function buildBriefHeadline(opts: {
  cars: number
  recentAvgCars: number | null
  revDelta: number | null
}): JSX.Element {
  const { cars, recentAvgCars, revDelta } = opts
  const num = (s: string | number, color: string) => (
    <span className="tabular-nums" style={{ color, fontWeight: 800 }}>
      {s}
    </span>
  )
  const tone =
    cars === 0
      ? 'sin actividad'
      : recentAvgCars != null && cars < recentAvgCars * 0.5
        ? 'tranquilo'
        : recentAvgCars != null && cars > recentAvgCars * 1.25
          ? 'fuerte'
          : 'estable'
  return (
    <>
      Día {tone}: {num(`${cars} carro${cars === 1 ? '' : 's'}`, '#86efac')}
      {recentAvgCars != null && (
        <>{' '}contra promedio de {num(Math.round(recentAvgCars), '#fcd34d')}</>
      )}
      .
      {revDelta != null && (
        <>
          {' '}Ingresos {num(
            `${revDelta < 0 ? '−' : '+'}${Math.abs(revDelta)}%`,
            revDelta < 0 ? '#fca5a5' : '#86efac',
          )} vs. ayer.
        </>
      )}
    </>
  )
}

// Pull "promedio reciente de X" out of the AI brief bullets so the headline can
// reference the real 30-day average rather than just yesterday's number.
function parseRecentAverage(summary: string | undefined): number | null {
  if (!summary) return null
  const m = summary.match(/promedio reciente de\s+\$?([\d,]+\.?\d*)/i)
  if (!m) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function AiBriefHero({
  today,
  loading,
  onReloadBrief,
  reloading,
  briefError,
  onAskQuestion,
}: {
  today?: TodayResponse
  loading: boolean
  onReloadBrief: () => void
  reloading: boolean
  briefError?: string
  onAskQuestion: (q: string) => void
}) {
  const summaryLines = today?.brief ? aiSummaryLines(today.brief.summary) : []
  const updatedAt = today?.brief?.createdAt
    ? new Date(today.brief.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null

  const cars = today?.summary?.carsWashed ?? 0
  const revenue = today?.summary?.ticketRevenue ?? 0
  const result = today?.summary?.result ?? 0
  const variance = today?.summary?.cashVariance ?? null
  const pct = (curr: number, prev: number | undefined | null) =>
    prev == null || prev === 0 ? null : Math.round(((curr - prev) / Math.abs(prev)) * 100)
  const carsDelta = pct(cars, today?.previousDay?.carsWashed)
  const revDelta = pct(revenue, today?.previousDay?.ticketRevenue)
  const resDelta = pct(result, today?.previousDay?.result)

  // Headline: built from data so date strings and AI title lines never sneak
  // into the colorizer. Falls back to yesterday's number when the AI brief
  // hasn't surfaced a recent average yet.
  const recentAvgCars =
    parseRecentAverage(today?.brief?.summary) ?? today?.previousDay?.carsWashed ?? null
  const headlineNode = buildBriefHeadline({ cars, recentAvgCars, revDelta })

  // Fallback bullets used when AI brief is unavailable — keeps the hero populated
  // with the same narrative density the design shows.
  const fallbackBullets: Array<[string, string]> = [
    ['Carros lavados', `${cars} contra promedio reciente${today?.previousDay ? ` de ${today.previousDay.carsWashed}` : ''}`],
    ['Ingresos autos', `${money(revenue, 'MXN')}${today?.previousDay ? ` contra ${money(today.previousDay.ticketRevenue, 'MXN')}` : ''}`],
    ['Resultado', `${money(result, 'MXN')}${result < 0 ? ' · día en rojo' : ''}`],
    ['Diferencia caja', variance == null ? 'Pendiente de corte' : `${money(variance, 'MXN')} ${variance >= 0 ? 'sobrante' : 'faltante'}`],
  ]

  // Suggested questions — static for now; designs show 3 chips.
  const followUps = [
    '¿Por qué bajaron los ingresos hoy?',
    '¿Qué turno rindió mejor?',
    'Compara con el mismo día la semana pasada',
  ]

  return (
    <div
      className="relative overflow-hidden border border-white/[0.06] px-8 py-7 text-white"
      style={{
        borderRadius: 20,
        background:
          'radial-gradient(120% 100% at 100% 0%, rgba(34,197,94,0.18), transparent 55%), linear-gradient(135deg, #0f0820 0%, #1a0f2e 40%, #1f3a2e 100%)',
        boxShadow: '0 24px 48px -20px rgba(15,23,42,0.45)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute select-none uppercase"
        style={{
          right: 28,
          bottom: 18,
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: 88,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: 'rgba(255,255,255,0.06)',
        }}
      >
        BRIEF
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.06,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div
        className="absolute flex items-center text-[10.5px] font-bold uppercase"
        style={{ top: 22, right: 28, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.32)' }}
      >
        <span>BRIEF</span>
        <span className="mx-1.5 opacity-50">·</span>
        <span>DEL DÍA</span>
      </div>

      <div className="relative grid items-start gap-7 lg:grid-cols-[1fr_320px]">
        {/* LEFT — status + headline + bullets + chips */}
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/55">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
            </span>
            {loading && !today
              ? 'GENERANDO BRIEF…'
              : updatedAt
                ? `NUEVO · ACTUALIZADO ${updatedAt}`
                : 'BRIEF EN ESPERA'}
            <button
              type="button"
              onClick={onReloadBrief}
              disabled={reloading}
              className="ml-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70 transition hover:bg-white/10 disabled:opacity-50"
            >
              {reloading ? 'Generando…' : '↻ Recargar'}
            </button>
          </div>

          <h2
            className="mt-3 text-white"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              maxWidth: 560,
            }}
          >
            {headlineNode}
          </h2>

          <ul className="mt-4 space-y-1.5 text-[12.5px] leading-relaxed text-white/80">
            {(summaryLines.length > 0
              ? summaryLines.slice(0, 4).map((line) => {
                  const idx = line.indexOf('·')
                  return idx > 0
                    ? ([line.slice(0, idx).trim(), line.slice(idx + 1).trim()] as [string, string])
                    : (['', line] as [string, string])
                })
              : fallbackBullets
            ).map(([head, tail], i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-2 inline-block h-1 w-1 flex-none rounded-full bg-white/45" />
                <span>
                  {head && (
                    <>
                      <b className="text-white">{head}</b>
                      <span className="text-white/55"> · </span>
                    </>
                  )}
                  <span className="text-white/75">{tail}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {followUps.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onAskQuestion(q)}
                className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[11.5px] font-semibold text-white transition hover:bg-white/15"
              >
                {q}
              </button>
            ))}
          </div>

          {briefError && (
            <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-[11.5px] text-rose-200">
              {briefError}
            </p>
          )}
        </div>

        {/* RIGHT — KPI rows */}
        <div className="flex flex-col gap-2.5">
          {[
            { lbl: 'CARROS', val: String(cars), delta: carsDelta },
            { lbl: 'INGRESOS', val: money(revenue, 'MXN'), delta: revDelta },
            { lbl: 'RESULTADO', val: money(result, 'MXN'), delta: resDelta, valueColor: result >= 0 ? '#86efac' : '#fda4af' },
            {
              lbl: 'DIF. CAJA',
              val: variance == null ? 'Pendiente' : money(variance, 'MXN'),
              delta: null as number | null,
              valueColor: variance == null ? 'rgba(255,255,255,0.55)' : variance >= 0 ? '#86efac' : '#fda4af',
            },
          ].map((r) => (
            <div
              key={r.lbl}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.11em] text-white/55">{r.lbl}</div>
                <div
                  className="font-display mt-0.5 text-[17px] font-extrabold tabular-nums tracking-[-0.02em]"
                  style={{ color: r.valueColor ?? '#fff' }}
                >
                  {r.val}
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums ${
                  r.delta == null
                    ? 'bg-white/[0.08] text-white/55'
                    : r.delta >= 0
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-rose-400/20 text-rose-200'
                }`}
              >
                {r.delta == null ? '—' : `${r.delta >= 0 ? '↑' : '↓'} ${Math.abs(r.delta)}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

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
// Renders NEW + REVISED (acknowledged/dismissed) alerts behind a 4-tab filter
// (Todas / Críticas / Avisos / Revisadas) with tonal-gradient item cards.
// Each item has acknowledge/dismiss icon buttons and a "Preguntar al
// asistente →" link that pipes the alert title into the chat composer.
function AiAlertsCard({
  alerts,
  revisedAlerts,
  loading,
  onAskQuestion,
}: {
  alerts: AiInsight[]
  revisedAlerts: AiInsight[]
  loading: boolean
  onAskQuestion?: (q: string) => void
}) {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'REVISED'>('ALL')

  if (loading && alerts.length === 0 && revisedAlerts.length === 0) return null

  const newSorted = [...alerts].sort((a, b) => {
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 }
    return order[a.severity] - order[b.severity]
  })
  const counts = {
    ALL: newSorted.length,
    CRITICAL: newSorted.filter((a) => a.severity === 'CRITICAL').length,
    WARNING: newSorted.filter((a) => a.severity === 'WARNING').length,
    REVISED: revisedAlerts.length,
  }
  const visible: AiInsight[] =
    filter === 'ALL' ? newSorted
    : filter === 'REVISED' ? revisedAlerts
    : newSorted.filter((a) => a.severity === filter)

  if (!loading && counts.ALL === 0 && counts.REVISED === 0) {
    return (
      <AiRailCard title="Alertas" rail="from-emerald-400 to-emerald-600">
        <div className="p-4 flex items-center gap-2 text-[12.5px] text-good-700">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-good-100 text-good-700">✓</span>
          Sin alertas para hoy.
        </div>
      </AiRailCard>
    )
  }

  return (
    <AiRailCard
      title="Alertas"
      rail="from-rose-400 to-rose-600"
      action={
        counts.ALL > 0 ? (
          <span className="inline-flex items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10.5px] font-bold text-white tabular-nums">
            {counts.ALL}
          </span>
        ) : null
      }
    >
      {/* 4-tab filter: Todas / Críticas / Avisos / Revisadas */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border-soft px-4 py-2.5">
        {([
          { id: 'ALL' as const, label: 'Todas', count: counts.ALL },
          { id: 'CRITICAL' as const, label: 'Críticas', count: counts.CRITICAL },
          { id: 'WARNING' as const, label: 'Avisos', count: counts.WARNING },
          { id: 'REVISED' as const, label: 'Revisadas', count: counts.REVISED },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            disabled={t.count === 0 && t.id !== 'ALL'}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              filter === t.id
                ? 'bg-ink-900 text-white'
                : 'bg-ink-50 text-ink-600 border border-border-soft hover:bg-ink-100 disabled:opacity-40 disabled:hover:bg-ink-50'
            }`}
          >
            {t.label}
            <span className={`text-[10px] font-bold ${filter === t.id ? 'opacity-65' : 'opacity-60'}`}>{t.count}</span>
          </button>
        ))}
      </div>
      <div className="p-3 space-y-2 max-h-[460px] overflow-y-auto">
        {visible.map((a) => (
          <AiAlertItem key={a.id} insight={a} onAskQuestion={onAskQuestion} />
        ))}
        {visible.length === 0 && (
          <p className="px-2 py-6 text-center text-[12px] text-ink-400">
            {filter === 'REVISED' ? 'Aún no hay alertas revisadas.' : 'Sin alertas de este tipo.'}
          </p>
        )}
      </div>
    </AiRailCard>
  )
}

// Compact alert item with severity-tonal gradient, tag, title, summary, and the
// trio of actions: acknowledge (✓), dismiss (×), ask-the-assistant link. Used
// inside AiAlertsCard only.
function AiAlertItem({ insight, onAskQuestion }: { insight: AiInsight; onAskQuestion?: (q: string) => void }) {
  const queryClient = useQueryClient()
  const acknowledge = useMutation({
    mutationFn: () => api<AiInsight>(`/api/v1/ai/insights/${insight.id}/acknowledge`, { method: 'POST' }),
    onSuccess: () => invalidateAi(queryClient),
  })
  const dismiss = useMutation({
    mutationFn: () => api<AiInsight>(`/api/v1/ai/insights/${insight.id}/dismiss`, { method: 'POST' }),
    onSuccess: () => invalidateAi(queryClient),
  })

  const summaryLines = aiSummaryLines(insight.summary)
  const firstLine = summaryLines[0] ?? ''
  const busy = acknowledge.isPending || dismiss.isPending
  const isRevised = insight.status !== 'NEW'

  const tone =
    insight.severity === 'CRITICAL' ? 'crit' :
    insight.severity === 'WARNING' ? 'warn' :
    'info'
  const toneStyles: Record<'crit' | 'warn' | 'info', { bg: string; border: string; tagBg: string; tagText: string }> = {
    crit: {
      bg: 'linear-gradient(180deg, rgba(254,226,226,0.55), #fff 72%)',
      border: 'var(--bad-100, #fecaca)',
      tagBg: 'transparent',
      tagText: 'var(--bad-700, #b91c1c)',
    },
    warn: {
      bg: 'linear-gradient(180deg, rgba(254,243,199,0.55), #fff 72%)',
      border: 'var(--warn-100, #fde68a)',
      tagBg: 'transparent',
      tagText: 'var(--warn-700, #b45309)',
    },
    info: {
      bg: 'linear-gradient(180deg, rgba(219,234,254,0.55), #fff 72%)',
      border: 'var(--info-100, #bfdbfe)',
      tagBg: 'transparent',
      tagText: 'var(--info-700, #1d4ed8)',
    },
  }
  const s = toneStyles[tone]

  return (
    <article
      className="relative rounded-xl px-3.5 py-3"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className="text-[9.5px] font-bold uppercase tracking-[0.11em]"
          style={{ color: s.tagText }}
        >
          {featureLabel(insight.featureType)}
          {isRevised && <span className="ml-1 opacity-60">· {statusLabel(insight.status).toUpperCase()}</span>}
          {!isRevised && <span className="ml-1 opacity-60">· NUEVO</span>}
        </span>
        {!isRevised && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => acknowledge.mutate()}
              disabled={busy}
              title="Marcar como revisada"
              aria-label="Marcar como revisada"
              className="inline-flex h-5 w-5 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-white hover:text-emerald-700 disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => dismiss.mutate()}
              disabled={busy}
              title="Descartar"
              aria-label="Descartar"
              className="inline-flex h-5 w-5 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-white hover:text-rose-700 disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <h4 className="font-display text-[13px] font-extrabold tracking-[-0.01em] text-ink-900 leading-snug">
        {insight.title}
      </h4>
      {firstLine && (
        <p className="mt-1 text-[11.5px] leading-snug text-ink-700">{firstLine}</p>
      )}
      {onAskQuestion && (
        <button
          type="button"
          onClick={() => onAskQuestion(`Explícame esta alerta: ${insight.title}`)}
          className="mt-1.5 inline-flex items-center bg-transparent p-0 text-[11px] font-bold text-primary-700 transition-colors hover:text-primary-800"
        >
          Preguntar al asistente →
        </button>
      )}
      {(acknowledge.error || dismiss.error) && (
        <p className="mt-2 rounded bg-bad-50 px-2 py-1 text-[11px] text-bad-700">
          {(acknowledge.error || dismiss.error)!.message}
        </p>
      )}
    </article>
  )
}

// ── Insights guardados rail card ───────────────────────────────
// Replaces the prior "Bitácora reciente". Shows recent non-alert insights with
// a mono date badge + title + meta + star toggle, separated by dashed rules.
function AiHistoryCard({ rows, loading }: { rows: AiInsight[]; loading: boolean }) {
  if (loading || rows.length === 0) return null
  const items = rows.slice(0, 8)
  return (
    <AiRailCard
      title="Insights guardados"
      subtitle="Briefs y respuestas marcadas para revisar luego"
      rail="from-emerald-400 to-emerald-600"
      action={
        <span className="inline-flex items-center justify-center rounded-full bg-ink-100 px-1.5 py-0.5 text-[10.5px] font-bold text-ink-700 tabular-nums">
          {items.length}
        </span>
      }
    >
      <ul className="px-4 py-2">
        {items.map((insight, i) => {
          const d = new Date(insight.createdAt)
          const day = String(d.getDate()).padStart(2, '0')
          const month = d.toLocaleString('es-MX', { month: 'short' }).replace('.', '').toUpperCase()
          const summaryFirst = aiSummaryLines(insight.summary)[0] ?? ''
          return (
            <li
              key={insight.id}
              className="flex items-start gap-3 py-2.5"
              style={{ borderBottom: i === items.length - 1 ? 'none' : '1px dashed var(--border-soft)' }}
            >
              <span className="font-mono tabular-nums shrink-0 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-500" style={{ width: 48 }}>
                {day} {month}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold leading-snug text-ink-900">{insight.title}</p>
                {summaryFirst && (
                  <p className="mt-0.5 truncate text-[11px] text-ink-500">{summaryFirst}</p>
                )}
              </div>
              <button
                type="button"
                title="Destacar"
                aria-label="Destacar insight"
                className="shrink-0 bg-transparent text-[13px] text-ink-400 transition-colors hover:text-amber-500"
              >
                ★
              </button>
            </li>
          )
        })}
      </ul>
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

function paymentLabel(method: PaymentMethod): string {
  if (method === 'CARD') return 'Tarjeta'
  if (method === 'TRANSFER') return 'Depósito'
  return 'Efectivo'
}

/**
 * Read-only summary of a saved ticket. Hero + Panel-wrapped detail sections.
 * The Desglose section uses the same `tl-receipt` markup as the create form's
 * live preview so the saved ticket feels like the printed version of what was
 * captured. Managers get an "Editar" button that flips the parent modal into
 * edit mode.
 */
function TicketDetail({
  ticket,
  onEdit,
  onVoid,
  canEdit,
}: {
  ticket: Ticket
  onEdit?: () => void
  onVoid?: () => void
  canEdit: boolean
}) {
  const lavadores = ticket.assignments.map((a) => a.employeeName)
  const basePrice = ticket.originalPriceAmount != null
    ? Number(ticket.originalPriceAmount)
    : Number(ticket.priceAmount)
  const override = ticket.priceOverride != null ? Number(ticket.priceOverride) : null
  const surcharge = ticket.surchargeAmount != null ? Number(ticket.surchargeAmount) : 0
  const discountPct = Number(ticket.discountPercent ?? 0)
  const finalAmount = Number(ticket.priceAmount)
  const extras = ticket.extras ?? []
  const extrasSum = extras.reduce((sum, e) => sum + Number(e.amount), 0)
  // Anything the base + listed extras don't account for (a discount, a manual
  // tweak). Shown as its own signed line so base + extras + residual = total.
  const extrasResidual = Math.round((finalAmount - basePrice - extrasSum) * 100) / 100
  const isVoid = ticket.status === 'VOIDED'
  const hasMotivos = ticket.courtesy
    || (ticket.courtesyReason && ticket.courtesyReason.trim().length > 0)
    || (ticket.discountReason && ticket.discountReason.trim().length > 0 && discountPct > 0)
    || (ticket.surchargeReason && ticket.surchargeReason.trim().length > 0 && surcharge > 0)

  const heroGradient = isVoid
    ? 'radial-gradient(circle at 100% 0%, rgba(248,113,113,0.12), transparent 55%), linear-gradient(140deg, #1f2937 0%, #374151 60%, #4b5563 130%)'
    : ticket.courtesy
      ? 'radial-gradient(circle at 100% 0%, rgba(251,191,36,0.18), transparent 55%), linear-gradient(140deg, #5a3210 0%, #8a4d10 60%, #b8731c 130%)'
      : 'radial-gradient(circle at 100% 0%, rgba(34,197,94,0.16), transparent 55%), linear-gradient(140deg, #15091f 0%, #2f164a 55%, #1a6f2f 130%)'

  return (
    <section className="space-y-3" data-testid="ticket-detail">
      <header
        className="relative overflow-hidden rounded-2xl px-6 py-5 text-white shadow-md"
        style={{ background: heroGradient }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.95) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/55">
              Ticket {ticket.internalRef ? `· Nº ${ticket.internalRef}` : `· ${ticket.notaNumber}`}
            </p>
            <h2 className="mt-1.5 truncate font-display text-[22px] font-bold leading-[1.15] tracking-[-0.025em]">
              {ticket.serviceTypeName} <span className="text-white/50">·</span> {ticket.vehicleSizeName}
            </h2>
            <p className="mt-1.5 text-[12.5px] font-medium text-white/65">
              {formatDateTime(ticket.occurredAt ?? ticket.createdAt)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] backdrop-blur-sm ${
            isVoid ? 'bg-red-500/25 text-red-100 ring-1 ring-red-300/40'
            : ticket.courtesy ? 'bg-amber-200/25 text-amber-50 ring-1 ring-amber-200/40'
            : 'bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-300/40'
          }`}>
            {isVoid ? 'Cancelado' : ticket.courtesy ? 'Cortesía' : 'Activo'}
          </span>
        </div>

        <div className="relative my-4">
          <div className="absolute -left-7 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink-50" />
          <div className="absolute -right-7 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink-50" />
          <div className="border-t border-dashed border-white/25" />
        </div>

        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/55">
              {ticket.courtesy ? 'Sin cobro' : 'Total cobrado'}
            </p>
            <p
              className="font-display text-[40px] font-black leading-none tracking-[-0.035em]"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {ticket.courtesy ? 'GRATIS' : money(finalAmount, ticket.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/55">Pago</p>
            <p className="mt-0.5 text-[14px] font-semibold">
              {ticket.courtesy ? 'N/A' : paymentLabel(ticket.paymentMethod)}
            </p>
          </div>
        </div>
      </header>

      <Panel title="Detalles del servicio">
        <div className="tl-srow">
          <span className="k">Lavadores</span>
          <span className="v">
            {lavadores.length > 0 ? (
              <span className="inline-flex items-center gap-2">
                <Avatars names={lavadores} max={5} />
                <span className="text-[12.5px] font-medium text-ink-700">
                  {lavadores.join(', ')}
                </span>
              </span>
            ) : (
              <span className="italic text-ink-400">Ninguno</span>
            )}
          </span>
        </div>
        <div className="tl-srow">
          <span className="k">Descripción del vehículo</span>
          <span className="v">{ticket.vehicleDescription || <span className="italic text-ink-400">—</span>}</span>
        </div>
        {ticket.internalRef && (
          <div className="tl-srow">
            <span className="k">No. de nota</span>
            <span className="v font-mono">{ticket.internalRef}</span>
          </div>
        )}
      </Panel>

      {/* Desglose — same tl-receipt as create-form sidebar for visual continuity */}
      {!ticket.courtesy && (
        <div className="tl-receipt">
          <div className="head">
            <h4>Desglose del precio</h4>
            <span>{ticket.currency}</span>
          </div>
          <hr />
          {extras.length > 0 ? (
            <>
              <div className="ln">
                <span>Precio base</span>
                <b>{money(basePrice, ticket.currency)}</b>
              </div>
              {extras.map((e) => (
                <div className="ln" key={e.serviceTypeId}>
                  <span>+ {e.name}</span>
                  <b style={{ color: 'var(--warn-700)' }}>+{money(Number(e.amount), ticket.currency)}</b>
                </div>
              ))}
              {extrasResidual !== 0 && (
                <div className="ln">
                  <span>{extrasResidual < 0 ? 'Descuento / ajuste' : 'Cargo extra'}</span>
                  <b style={{ color: extrasResidual < 0 ? 'var(--good-700)' : 'var(--warn-700)' }}>
                    {extrasResidual < 0 ? '−' : '+'}{money(Math.abs(extrasResidual), ticket.currency)}
                  </b>
                </div>
              )}
            </>
          ) : override != null ? (
            <>
              <div className="ln">
                <span>Precio especial</span>
                <b>{money(override, ticket.currency)}</b>
              </div>
              <p className="text-[10.5px] italic text-ink-400">
                Override manual — sin descuento/cargo aplicado
              </p>
            </>
          ) : (
            <>
              <div className="ln">
                <span>Precio base</span>
                <b>{money(basePrice, ticket.currency)}</b>
              </div>
              {discountPct > 0 && (
                <>
                  <div className="ln">
                    <span>Descuento {discountPct}%</span>
                    <b style={{ color: 'var(--good-700)' }}>−{money(basePrice * discountPct / 100, ticket.currency)}</b>
                  </div>
                  {ticket.discountReason && (
                    <p className="-mt-1 pl-1 text-[10.5px] italic text-ink-400">↳ {ticket.discountReason}</p>
                  )}
                </>
              )}
              {surcharge > 0 && (
                <>
                  <div className="ln">
                    <span>Cargo extra</span>
                    <b style={{ color: 'var(--warn-700)' }}>+{money(surcharge, ticket.currency)}</b>
                  </div>
                  {ticket.surchargeReason && (
                    <p className="-mt-1 pl-1 text-[10.5px] italic text-ink-400">↳ {ticket.surchargeReason}</p>
                  )}
                </>
              )}
            </>
          )}
          <hr />
          <div className="ln tot">
            <span>Total</span>
            <b>{money(finalAmount, ticket.currency)}</b>
          </div>
        </div>
      )}

      {ticket.assignments.length > 0 && ticket.assignments.some((a) => a.estimatedEarning != null) && (
        <Panel title="Pago a lavadores · estimado">
          <div className="space-y-1.5">
            {ticket.assignments.map((a) => (
              <div key={a.employeeId} className="flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Avatars names={[a.employeeName]} max={1} />
                  <span className="truncate text-[12.5px] font-medium text-ink-700">{a.employeeName}</span>
                  <span className="shrink-0 text-[11px] text-ink-400">· {Number(a.sharePct)}% del carro</span>
                </span>
                <b className="shrink-0 text-[13px] text-ink-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {a.estimatedEarning != null
                    ? `~${money(Number(a.estimatedEarning), ticket.currency)}`
                    : '—'}
                </b>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] italic leading-snug text-ink-400">
            Pago fijo por carro, no porcentaje. Estimado — las faltas de la semana pueden bajar la tarifa
            (a $15 o $10 por carro).
          </p>
        </Panel>
      )}

      {hasMotivos && (
        <Panel title="Motivos registrados">
          <div className="space-y-2.5">
            {ticket.courtesy && (
              <div className="flex gap-3 rounded-xl border border-amber-200/70 bg-amber-50/60 px-3.5 py-2.5">
                <div className="w-0.5 self-stretch rounded-full bg-amber-400" />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-amber-700">Cortesía</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-amber-900">
                    {ticket.courtesyReason || <span className="italic text-amber-600">Sin motivo registrado</span>}
                  </p>
                </div>
              </div>
            )}
            {ticket.discountReason && discountPct > 0 && (
              <div className="flex gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/50 px-3.5 py-2.5">
                <div className="w-0.5 self-stretch rounded-full bg-emerald-500" />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                    Motivo del descuento · {discountPct}%
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-emerald-900">{ticket.discountReason}</p>
                </div>
              </div>
            )}
            {ticket.surchargeReason && surcharge > 0 && (
              <div className="flex gap-3 rounded-xl border border-amber-200/70 bg-amber-50/50 px-3.5 py-2.5">
                <div className="w-0.5 self-stretch rounded-full bg-amber-500" />
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-amber-700">
                    Motivo del cargo · {money(surcharge, ticket.currency)}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-amber-900">{ticket.surchargeReason}</p>
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {ticket.notes && (
        <Panel title="Notas internas">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-800">{ticket.notes}</p>
        </Panel>
      )}

      {isVoid && (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-4 py-3">
          <div className="w-0.5 self-stretch rounded-full bg-red-500" />
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-red-700">Ticket cancelado</p>
            <p className="mt-0.5 text-[13px] leading-snug text-red-900">
              {ticket.voidReason || <span className="italic text-red-500">Sin motivo registrado</span>}
            </p>
            {ticket.voidedAt && (
              <p className="mt-1 text-[11px] text-red-600">Cancelado el {formatDateTime(ticket.voidedAt)}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border-soft bg-ink-50/40 px-4 py-2.5 text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-ink-400" />
          Capturado · {formatDateTime(ticket.createdAt)}
        </span>
        {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-ink-400" />
            Última edición · {formatDateTime(ticket.updatedAt)}
          </span>
        )}
      </div>

      {canEdit && (onEdit || onVoid) && !isVoid && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border-soft pt-3">
          {onVoid && <Button kind="ghost" onClick={onVoid}>Cancelar ticket</Button>}
          {onEdit && <Button kind="primary" onClick={onEdit}>Editar ticket</Button>}
        </div>
      )}
    </section>
  )
}

/** Small accent-rail + numbered chip + label used by TicketWorkspace sections. */
function SectionLabel({ num, text, extra, accent = 'purple' }: {
  num: number
  text: string
  extra?: string
  accent?: 'purple' | 'emerald' | 'amber' | 'ink'
}) {
  const accentColor = accent === 'purple' ? 'var(--primary-600)'
    : accent === 'emerald' ? 'var(--brand-green)'
    : accent === 'amber' ? 'var(--warn-500)'
    : 'var(--ink-700)'
  return (
    <div className="flex items-center gap-2">
      <span className="h-4 w-0.5 rounded" style={{ background: accentColor }} />
      <span
        className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] font-display text-[10px] font-bold text-white"
        style={{ background: accentColor }}
      >
        {num}
      </span>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.10em] text-ink-700">{text}</span>
      {extra && <span className="text-[11px] font-medium text-ink-500">{extra}</span>}
    </div>
  )
}

/** A k/v row inside the dark TicketWorkspace sidecar ledger. */
function SidecarLine({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12.5px]">
      <span className="text-white/55">{k}</span>
      <span className="min-w-0 text-right">{v}</span>
    </div>
  )
}

/** Keyboard shortcut hint with one or more <kbd> pills + a label. */
function KbdHint({ keys, label, sep }: { keys: string[]; label: string; sep?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-ink-300">{sep ?? '/'}</span>}
          <kbd className="inline-block min-w-[14px] rounded border border-border-soft bg-white px-1.5 text-center font-mono text-[10px] font-semibold text-ink-700">{k}</kbd>
        </span>
      ))}
      <span className="text-ink-500">{label}</span>
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────
// TicketPromoSelector — kit v3 segmented promo control. Lives in the
// page header actions area. Single button collapses into chip + three
// reveal pills (Cortesía / Oferta / Prepago) with sliding animation.
// ─────────────────────────────────────────────────────────────────────
// Header now mirrors the design: two top modes — Cortesía and the "Cliente
// frecuente" umbrella. Oferta (notas) and Prepago (paquete) are chosen from a
// nested 2-pill selector once Cliente frecuente is active, not as top pills.
type TicketPromoMode = 'cortesia' | 'frecuente' | null

const PROMO_OPTS: Array<{ id: NonNullable<TicketPromoMode>; label: string; dot: string; bg: string; tx: string; br: string }> = [
  { id: 'cortesia',  label: 'Cortesía',          dot: '#f59e0b', bg: 'var(--warn-50)',    tx: 'var(--warn-700)',    br: '#f59e0b' },
  { id: 'frecuente', label: 'Cliente frecuente', dot: '#8b5cf6', bg: 'var(--primary-50)', tx: 'var(--primary-700)', br: '#8b5cf6' },
]

function TicketPromoSelector({ active, onPick }: { active: TicketPromoMode; onPick: (m: NonNullable<TicketPromoMode>) => void }) {
  const [open, setOpen] = useState(false)
  const activeOpt = PROMO_OPTS.find((o) => o.id === active) ?? null

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tl2-press"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '7px 13px', borderRadius: 999, flex: '0 0 auto',
          border: `1px solid ${activeOpt ? activeOpt.br : 'var(--border-strong)'}`,
          background: activeOpt ? activeOpt.bg : '#fff',
          color: activeOpt ? activeOpt.tx : 'var(--ink-700)',
          fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
          boxShadow: open ? '0 6px 16px -8px rgba(15,23,42,0.3)' : 'none',
          transition: 'all .22s ease',
        }}
      >
        <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
          {activeOpt
            ? <span style={{ width: 8, height: 8, borderRadius: 999, background: activeOpt.dot }} />
            : PROMO_OPTS.map((o) => <span key={o.id} style={{ width: 5, height: 5, borderRadius: 999, background: o.dot }} />)}
        </span>
        {activeOpt ? activeOpt.label : 'Promos'}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .25s ease', transform: open ? 'rotate(180deg)' : 'none', opacity: 0.6 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {PROMO_OPTS.map((o, i) => {
        const isActive = o.id === active
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => { onPick(o.id); setOpen(false) }}
            className="tl2-press"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, borderRadius: 999, flex: '0 0 auto',
              whiteSpace: 'nowrap', overflow: 'hidden', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${isActive ? o.br : 'transparent'}`,
              background: isActive ? o.dot : o.bg,
              color: isActive ? '#fff' : o.tx,
              maxWidth: open ? 150 : 0,
              paddingLeft: open ? 13 : 0,
              paddingRight: open ? 13 : 0,
              marginLeft: open ? 0 : -6,
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0) scale(1)' : 'translateX(-10px) scale(0.7)',
              pointerEvents: open ? 'auto' : 'none',
              boxShadow: isActive && open ? `0 6px 16px -8px ${o.dot}` : 'none',
              transition: `all .32s cubic-bezier(.34,1.56,.64,1) ${open ? i * 60 : (2 - i) * 45}ms`,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 999, background: isActive ? '#fff' : o.dot, flex: '0 0 auto' }} />
            {o.label}
            {isActive && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: -1 }}>
                <path d="M5 12l5 5L20 7" />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
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
  const [washerFocus, setWasherFocus] = useState(false)
  // Oferta = loyalty stamp card. Customer brings back N previous nota
  // receipts; 5 notas = half wash off, 10 notas = full wash free. We store
  // the mode locally and translate to discount/courtesy on the underlying
  // form fields so the backend stays unchanged. (Legacy tickets used a
  // "Prepago:" reason prefix for this — parse it for back-compat on load.)
  const [ofertaMode, setOfertaMode] = useState<'none' | '5' | '10'>(() => {
    const dr = ticket?.discountReason ?? ''
    const cr = ticket?.courtesyReason ?? ''
    if (cr.startsWith('Oferta') || cr.startsWith('Prepago')) return '10'
    if (dr.startsWith('Oferta') || (dr.startsWith('Prepago') && !dr.startsWith('Prepago: nota'))) return '5'
    return 'none'
  })
  const [ofertaOpen, setOfertaOpen] = useState(false)

  // Lealtad — customer search picker on the ticket form. Search state lives
  // here; the form-dependent selection lookup happens below after `form` is built.
  const [cliQuery, setCliQuery] = useState('')
  const cliResultsQ = useQuery({
    queryKey: ['customers', 'ticket-picker', cliQuery],
    enabled: cliQuery.trim().length >= 2,
    queryFn: () => api<Customer[]>(`/api/v1/customers?q=${encodeURIComponent(cliQuery.trim())}`),
  })
  // Precio Especial multi-pick. Cashier ticks N extras (Encerado, Pulido,
  // Lav.Interior) and the picker accumulates base + sum(extras) into
  // priceOverride. Selecting nothing = no override = catalog price applies.
  // No round-trip yet for edits: when editing an existing ticket the
  // override is preserved as a single number; the cashier can re-pick if
  // they want to itemize again.
  const [selectedExtraIds, setSelectedExtraIds] = useState<Set<number>>(new Set())
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
    discountReason: ticket?.discountReason ?? '',
    prepagoActive: Boolean(ticket?.discountReason?.startsWith('Prepago: nota')),
    customerId: (ticket?.customerId ?? '') as number | '',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ticket?.id])

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema) as Resolver<TicketFormValues>,
    defaultValues: formDefaults,
  })

  // Lealtad — read the currently selected customer so we can render its
  // punch progress and surface "Aplicar mitad" / "Aplicar gratis" suggestions.
  const selectedCustomerId = (form.watch('customerId') as number | '' | undefined) || null
  const selectedCustomerQ = useQuery({
    queryKey: ['customers', 'detail', selectedCustomerId],
    enabled: Boolean(selectedCustomerId),
    queryFn: () => api<Customer[]>('/api/v1/customers').then((rows) => rows.find((c) => c.id === selectedCustomerId) ?? null),
  })
  const selectedCustomer = selectedCustomerQ.data ?? null

  // Prepaid packages for the selected customer + which one (if any) is being redeemed.
  const [redeemPackageId, setRedeemPackageId] = useState<number | null>(null)
  const customerPackagesQ = useQuery({
    queryKey: ['customer-packages', selectedCustomerId],
    enabled: Boolean(selectedCustomerId),
    queryFn: () => api<CustomerPackage[]>(`/api/v1/customers/${selectedCustomerId}/packages`),
  })
  const activePackages = (customerPackagesQ.data ?? []).filter((p) => p.status === 'ACTIVE' && p.remaining > 0)
  const redeemPackage = activePackages.find((p) => p.id === redeemPackageId) ?? null
  // Drop the redemption if the customer changes/clears.
  useEffect(() => { setRedeemPackageId(null) }, [selectedCustomerId])

  // Reset when navigating between tickets in edit mode
  useEffect(() => {
    form.reset(formDefaults)
    // Re-seed the extras chip selection from the notes markers ("+ Encerado",
    // "+ Pulido", …) that the chip picker writes on save. Empty Set when
    // loading a legacy ticket without markers — the cashier can re-pick if
    // they want to itemize. Without this, the lit chips from a prior ticket
    // would persist into the next one.
    const markers = ticket?.notes ?? ''
    const extras = (data.services.data ?? []).filter((s) => s.category === 'EXTRA')
    const next = new Set<number>()
    for (const e of extras) {
      const re = new RegExp(`\\+\\s*${e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
      if (re.test(markers)) next.add(e.id)
    }
    setSelectedExtraIds(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, data.services.data])

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
    // Package redemption: base wash is prepaid; charge only the size difference
    // when today's car is bigger than the package's locked size (else $0).
    if (redeemPackage) {
      const base = (data.prices.data ?? []).find((price) =>
        price.serviceTypeId === Number(watched.serviceTypeId) &&
        price.vehicleSizeId === Number(watched.vehicleSizeId) &&
        price.currency === 'MXN'
      )?.amount
      if (base === undefined) return undefined
      return Math.max(0, Math.round((base - redeemPackage.unitPrice) * 100) / 100)
    }
    // Prepago: only the typed extra is charged (the base was paid at sale). 0 = fully covered.
    if (watched.prepagoActive) {
      const extra = watched.priceOverride !== '' && watched.priceOverride != null
        ? Number(watched.priceOverride) : 0
      return Math.round(extra * 100) / 100
    }
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
  }, [data.prices.data, watched.courtesy, watched.prepagoActive, watched.serviceTypeId, watched.vehicleSizeId,
      watched.discountPercent, watched.surchargeAmount, watched.priceOverride, redeemPackage])

  const save = useMutation({
    mutationFn: (values: TicketFormValues) => {
      const prepago = values.prepagoActive === true
      const prepagoNota = (values.internalRef ?? '').trim()
      const prepagoExtra = values.priceOverride !== '' && values.priceOverride != null ? Number(values.priceOverride) : 0
      // An empty priceOverride coerces to 0 via the schema, so only a positive
      // value counts as a real manual override. Normal tickets must omit it and
      // keep the server-resolved price — a 0 override would force the ticket to
      // $0.00 under the backend's `>= 0` guard. (Prepago intentionally sends 0.)
      const override = prepago
        ? prepagoExtra
        : (values.priceOverride !== '' && values.priceOverride != null && Number(values.priceOverride) > 0
            ? Number(values.priceOverride) : undefined)
      const surcharge = !values.courtesy && !prepago && values.surchargeAmount !== '' && values.surchargeAmount != null
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
        courtesy: prepago ? false : values.courtesy,
        courtesyReason: prepago ? undefined : (values.courtesyReason || undefined),
        discountPercent: (values.courtesy || prepago) ? 0 : (values.discountPercent ?? 0),
        employeeIds: values.employeeIds.map(Number),
        occurredAt: values.occurredAt ? localTimeToIso(values.occurredAt, baseDate) : undefined,
        internalRef: values.internalRef?.trim() || undefined,
        priceOverride: override,
        surchargeAmount: surcharge > 0 ? surcharge : 0,
        surchargeReason: !values.courtesy && surcharge > 0
          ? (values.surchargeReason?.trim() || undefined) : undefined,
        discountReason: prepago
          ? `Prepago: nota #${prepagoNota}`
          : (!values.courtesy && (values.discountPercent ?? 0) > 0
            ? (values.discountReason?.trim() || undefined) : undefined),
        notes: values.notes?.trim() || undefined,
        customerId: values.customerId ? Number(values.customerId) : undefined,
        // Persist ticked add-ons as structured lines so the ticket view can show
        // the real price math. Courtesy/prepago never carry extras. Always sent
        // (empty array clears them on edit); the server re-prices each from the
        // catalog — client amounts are never trusted.
        extraServiceTypeIds: (values.courtesy || prepago || redeemPackage) ? [] : Array.from(selectedExtraIds),
        // Redeem one wash from the customer's prepaid package. Server validates
        // ownership/size and computes the (possibly bigger-car) charge.
        redeemCustomerPackageId: redeemPackage ? redeemPackage.id : undefined,
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

  // Three mutually-exclusive top-of-ticket modes: Cortesía / Oferta / Prepago.
  // Oferta maps 5/10 notas presets onto discountPercent/courtesy (the encoded
  // reason round-trips the mode on edit). Prepago captures a prepaid nota
  // (internalRef) + extra to collect (priceOverride); the base was already paid.
  const clearPrepagoFields = () => {
    form.setValue('prepagoActive', false, { shouldValidate: true })
    form.setValue('internalRef', '', { shouldValidate: true })
    form.setValue('priceOverride', '', { shouldValidate: true })
  }
  const clearOferta = () => {
    setOfertaMode('none')
    setOfertaOpen(false)
    form.setValue('discountPercent', 0, { shouldValidate: true })
    form.setValue('discountReason', '', { shouldValidate: true })
    form.setValue('courtesy', false, { shouldValidate: true })
    form.setValue('courtesyReason', '', { shouldValidate: true })
  }
  const applyOferta = (m: '5' | '10') => {
    clearPrepagoFields()
    setOfertaMode(m)
    setOfertaOpen(false)
    if (m === '5') {
      form.setValue('courtesy', false, { shouldValidate: true })
      form.setValue('courtesyReason', '')
      form.setValue('discountPercent', 50, { shouldValidate: true })
      form.setValue('discountReason', 'Oferta: 5 notas (medio lavado)', { shouldValidate: true })
    } else {
      form.setValue('discountPercent', 0, { shouldValidate: true })
      form.setValue('discountReason', '')
      form.setValue('courtesy', true, { shouldValidate: true })
      form.setValue('courtesyReason', 'Oferta: 10 notas (lavado completo)', { shouldValidate: true })
    }
  }
  const activatePrepago = () => {
    setOfertaMode('none')
    setOfertaOpen(false)
    form.setValue('courtesy', false, { shouldValidate: true })
    form.setValue('courtesyReason', '')
    form.setValue('discountPercent', 0, { shouldValidate: true })
    form.setValue('discountReason', '', { shouldValidate: true })
    form.setValue('prepagoActive', true, { shouldValidate: true })
    const ov = form.getValues('priceOverride')
    if (ov === '' || ov == null) form.setValue('priceOverride', 0, { shouldValidate: true })
  }
  const setCortesia = (on: boolean) => {
    if (on) {
      clearPrepagoFields()
      setOfertaMode('none')
      setOfertaOpen(false)
      form.setValue('discountPercent', 0, { shouldValidate: true })
      form.setValue('discountReason', '', { shouldValidate: true })
      form.setValue('courtesy', true, { shouldValidate: true })
    } else {
      form.setValue('courtesy', false, { shouldValidate: true })
      form.setValue('courtesyReason', '')
    }
  }

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

  // Auto-select the appropriate shift by current time when creating a ticket.
  // (Edit mode keeps whatever shift the ticket was originally captured under.)
  useEffect(() => {
    if (mode !== 'create') return
    if (openShifts.length === 0) return
    const preferred = now.getHours() < 14 ? 'MATUTINO' : 'VESPERTINO'
    const match = openShifts.find((s) => s.shiftType === preferred) ?? openShifts[0]
    if (match && Number(form.getValues('shiftId')) !== match.id) {
      form.setValue('shiftId', match.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openShifts.length, now.getHours()])

  // Keyboard shortcuts the Atajos strip advertises: 1-4 picks one of the
  // first four service tiles, Q/W/E/R picks one of the first four vehicle
  // tiles, Cmd/Ctrl+Enter submits. Skipped when the focused element is
  // editable so typing "1" inside the Nota / Notas fields doesn't fire.
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (readOnly) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        formRef.current?.requestSubmit()
        return
      }
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      const editable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable
      if (editable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const services = (data.services.data ?? [])
        .filter((s) => s.active !== false && s.category !== 'EXTRA')
      const sizes = (data.sizes.data ?? [])
        .filter((s) => s.active !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      if (/^[1-9]$/.test(e.key)) {
        const svc = services[Number(e.key) - 1]
        if (svc) {
          e.preventDefault()
          form.setValue('serviceTypeId', svc.id as unknown as number, { shouldValidate: true })
        }
        return
      }
      const sizeIdx: Record<string, number> = { q: 0, w: 1, e: 2, r: 3, t: 4 }
      const k = e.key.toLowerCase()
      if (k in sizeIdx) {
        const size = sizes[sizeIdx[k]]
        if (size) {
          e.preventDefault()
          form.setValue('vehicleSizeId', size.id as unknown as number, { shouldValidate: true })
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [data.services.data, data.sizes.data, form, readOnly])

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

      {/* ─── Page header (v2): eyebrow · title · subtitle · live clock chip ── */}
      <div className="tl2-page-header">
        <div className="tl2-page-header__left">
          <div className="tl2-page-header__eyebrow">
            <span className="dot" />
            {mode === 'edit' ? 'Edición' : 'Captura'} · {data.currentBusinessDay?.businessDate ?? 'Sin día abierto'}
          </div>
          <h1 className="tl2-page-header__title">{mode === 'edit' ? 'Editar ticket' : 'Nuevo ticket'}</h1>
          {mode === 'create' && (
            <p className="tl2-page-header__subtitle">
              Captura el lavado: auto, importe, lavador.{ticketsTodayCount.data ? ` · ${ticketsTodayCount.data.recentTickets.length} ticket${ticketsTodayCount.data.recentTickets.length === 1 ? '' : 's'} hoy` : ''}
            </p>
          )}
        </div>
        <div className="tl2-page-header__right">
          <TicketPromoSelector
            active={
              watched.courtesy && ofertaMode === 'none' && !ofertaOpen && !watched.prepagoActive ? 'cortesia'
                : ofertaOpen || ofertaMode !== 'none' || watched.prepagoActive ? 'frecuente'
                : null
            }
            onPick={(m) => {
              if (m === 'cortesia') {
                const cortesiaOn = watched.courtesy && ofertaMode === 'none' && !ofertaOpen && !watched.prepagoActive
                setCortesia(!cortesiaOn)
              } else {
                // Cliente frecuente — umbrella over Oferta (notas) + Prepago.
                const frecuenteOn = ofertaOpen || ofertaMode !== 'none' || watched.prepagoActive
                if (frecuenteOn) {
                  clearOferta()
                  clearPrepagoFields()
                } else {
                  // Default benefit is Oferta por notas; the nested selector
                  // switches to Prepago. Clear any comped/prepago state first.
                  form.setValue('courtesy', false, { shouldValidate: true })
                  form.setValue('courtesyReason', '')
                  clearPrepagoFields()
                  setOfertaOpen(true)
                }
              }
            }}
          />
          {/* Live shift + clock chip — matches v3 kit's MATUTINO indicator */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 999,
              background: 'linear-gradient(180deg, var(--good-50), #fff)',
              border: '1px solid var(--good-100)',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--brand-green-bright)', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--good-700)' }}>
              {openShifts[0]?.shiftType === 'MATUTINO' ? 'MATUTINO' : openShifts[0]?.shiftType === 'VESPERTINO' ? 'VESPERTINO' : 'SIN TURNO'}
            </span>
            <span className="tl2-mono-display" style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-900)' }}>{clockStr}</span>
          </div>
        </div>
      </div>

      {disabledReason && (
        <Banner tone="warn" title={disabledReason} text="Abre el dia y el turno desde el Dashboard antes de capturar tickets." />
      )}

      <form ref={formRef} className="grid gap-4 xl:grid-cols-[1fr_360px]" onSubmit={form.handleSubmit((values) => save.mutate(values))} data-testid="ticket-form">
        <div className="space-y-3">

          {/* ── DATOS DEL SERVICIO — single tone-purple card per v3 kit ─ */}
          <div
            className={`tl2-card${
              watched.courtesy ? ' t-amber' : watched.prepagoActive ? ' t-purple' : ofertaMode !== 'none' ? ' t-emerald' : ' t-purple'
            }`}
            style={{
              background: watched.courtesy
                ? 'linear-gradient(180deg, rgba(254,243,199,0.20), #fff 40%)'
                : watched.prepagoActive
                  ? 'linear-gradient(180deg, rgba(237,233,254,0.30), #fff 40%)'
                  : undefined,
            }}
          >
            {/* Cliente frecuente — nested benefit selector (Oferta por notas o Prepago).
                Mirrors the design: two top modes (Cortesía / Cliente frecuente), and the
                oferta-vs-prepago choice lives here once Cliente frecuente is active. */}
            {(ofertaOpen || ofertaMode !== 'none' || watched.prepagoActive) && (
              <div className="flex flex-wrap items-center gap-2.5 border-b border-border-soft px-4 pt-3 pb-3" style={{ background: 'linear-gradient(180deg, rgba(237,233,254,0.5), #fff 85%)' }}>
                <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary-500" />
                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-primary-700">Cliente frecuente</span>
                <span className="text-[11px] text-ink-500">¿qué beneficio usa?</span>
                <div className="ml-auto inline-flex gap-0.5 rounded-full border border-primary-100 bg-white p-[3px]">
                  {([['oferta', 'Oferta por notas'], ['prepago', 'Prepago']] as const).map(([k, lbl]) => {
                    const on = k === 'prepago' ? watched.prepagoActive : !watched.prepagoActive
                    return (
                      <button
                        key={k}
                        type="button"
                        className="tl2-press"
                        onClick={() => {
                          if (k === 'prepago') {
                            if (!watched.prepagoActive) activatePrepago()
                          } else if (watched.prepagoActive) {
                            clearPrepagoFields()
                            form.setValue('courtesy', false, { shouldValidate: true })
                            form.setValue('courtesyReason', '')
                            setOfertaOpen(true)
                          }
                        }}
                        style={{
                          padding: '5px 14px', borderRadius: 999, border: 0, cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                          background: on ? 'var(--primary-600)' : 'transparent',
                          color: on ? '#fff' : 'var(--primary-700)',
                          boxShadow: on ? '0 4px 10px -4px rgba(124,58,237,0.5)' : 'none',
                          transition: 'all .2s ease',
                        }}
                      >
                        {lbl}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Oferta selection popover — when user picks Oferta from PromoSelector
                but hasn't chosen 5 vs 10 notas yet. Sits above the form. */}
            {ofertaOpen && ofertaMode === 'none' && (
              <div className="border-b border-border-soft px-4 pt-3 pb-3" style={{ background: 'rgba(220,252,231,0.45)' }}>
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-good-700">
                  ¿Cuántas notas trae el cliente?
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => applyOferta('5')}
                    className="flex w-full items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-left text-[12.5px] font-semibold text-sky-800 hover:bg-sky-100"
                  >
                    <span>5 notas — medio lavado</span>
                    <span className="rounded-full bg-sky-200 px-1.5 text-[10.5px] font-bold text-sky-800">-50%</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyOferta('10')}
                    className="flex w-full items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-[12.5px] font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    <span>10 notas — lavado completo</span>
                    <span className="rounded-full bg-emerald-200 px-1.5 text-[10.5px] font-bold text-emerald-800">GRATIS</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOfertaOpen(false)}
                  className="mt-2 text-[10.5px] text-ink-400 hover:text-ink-600"
                >Cancelar</button>
              </div>
            )}

            <div className="flex flex-col gap-3 p-4">
              {/* Lealtad — optional customer picker. When a customer is selected we
                  surface punch progress + one-tap redemption buttons. */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3" data-testid="ticket-cliente-picker">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
                  Cliente (opcional · lealtad)
                </p>
                {!selectedCustomer && (
                  <div>
                    <input
                      type="text"
                      className="tl-input"
                      placeholder="Buscar por nombre o teléfono…"
                      value={cliQuery}
                      onChange={(e) => setCliQuery(e.target.value)}
                      data-testid="ticket-cliente-search"
                    />
                    {cliQuery.trim().length >= 2 && (cliResultsQ.data ?? []).length > 0 && (
                      <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-border-soft bg-white shadow-sm">
                        {(cliResultsQ.data ?? []).slice(0, 6).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              form.setValue('customerId', c.id as number | '', { shouldValidate: true })
                              setCliQuery('')
                            }}
                            className="flex w-full items-center gap-2 border-b border-border-soft px-3 py-2 text-left text-[12.5px] hover:bg-ink-50 last:border-b-0"
                          >
                            <span className="cli-avatar" style={{ background: cliColor(c.name), width: 28, height: 28, fontSize: 11 }}>{cliInitials(c.name)}</span>
                            <span className="flex-1">
                              <span className="font-semibold text-ink-900">{c.name}</span>
                              <span className="ml-2 font-mono text-[11px] text-ink-500">{cliGroupPhone(c.phone)}</span>
                            </span>
                            <span className="text-[10.5px] font-bold uppercase tracking-wide text-violet-700">{c.loyaltyProgress}/10</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {cliQuery.trim().length >= 2 && (cliResultsQ.data ?? []).length === 0 && !cliResultsQ.isLoading && (
                      <p className="mt-2 text-[11.5px] text-ink-400">Ningún cliente coincide. Regístralo en Clientes.</p>
                    )}
                  </div>
                )}
                {selectedCustomer && (() => {
                  const punches = selectedCustomer.loyaltyProgress
                  const canHalf = punches >= 5
                  const canFree = punches >= 9
                  return (
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="cli-avatar" style={{ background: cliColor(selectedCustomer.name), width: 32, height: 32 }}>
                          {cliInitials(selectedCustomer.name)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-ink-900">{selectedCustomer.name}</div>
                          <div className="font-mono text-[11px] text-ink-500">{cliGroupPhone(selectedCustomer.phone)}</div>
                        </div>
                        <span className="cli-dots">
                          {Array.from({ length: 10 }, (_, i) => {
                            const n = i + 1
                            const cls = ['cli-dot', n <= punches ? 'done' : '', n === 5 ? 'm5' : '', n === 10 ? 'm10' : ''].filter(Boolean).join(' ')
                            return <span key={n} className={cls} />
                          })}
                        </span>
                        <span className="text-[11.5px] font-mono font-semibold text-ink-700">{punches}/10</span>
                        <button
                          type="button"
                          onClick={() => { form.setValue('customerId', '' as number | '', { shouldValidate: true }); setCliQuery('') }}
                          className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-500 hover:bg-ink-50"
                          aria-label="Quitar cliente"
                        >
                          Quitar
                        </button>
                      </div>
                      {/* Car on file mismatch — helps catch a different/bigger car than usual. */}
                      {selectedCustomer.vehicleSizeId && Number(watched.vehicleSizeId) > 0
                        && Number(watched.vehicleSizeId) !== selectedCustomer.vehicleSizeId && (
                        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
                          ⚠ Auto distinto al registrado ({selectedCustomer.vehicleSizeName}
                          {selectedCustomer.vehicleDescription ? ` · ${selectedCustomer.vehicleDescription}` : ''}).
                        </p>
                      )}
                      {activePackages.length > 0 && (
                        <div className="mt-2.5 border-t border-emerald-100 pt-2.5">
                          <span className="text-[10.5px] font-bold uppercase tracking-wide text-emerald-700">Paquetes prepagados</span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {activePackages.map((p) => {
                              const on = redeemPackageId === p.id
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    if (on) { setRedeemPackageId(null); return }
                                    setRedeemPackageId(p.id)
                                    form.setValue('courtesy', false, { shouldValidate: true })
                                    form.setValue('prepagoActive', false, { shouldValidate: true })
                                    setOfertaMode('none')
                                    form.setValue('discountPercent', 0, { shouldValidate: true })
                                    form.setValue('discountReason', '', { shouldValidate: true })
                                    form.setValue('priceOverride', '' as number | '', { shouldValidate: true })
                                    form.setValue('serviceTypeId', p.serviceTypeId, { shouldValidate: true })
                                    if (!Number(watched.vehicleSizeId)) {
                                      form.setValue('vehicleSizeId', p.vehicleSizeId, { shouldValidate: true })
                                    }
                                  }}
                                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${on ? 'bg-emerald-600 text-white' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                                >
                                  {p.serviceTypeName} · {p.vehicleSizeName} · {p.remaining}/{p.washesTotal}
                                </button>
                              )
                            })}
                          </div>
                          {redeemPackage && (() => {
                            const sizes = data.sizes.data ?? []
                            const pkgSize = sizes.find((s) => s.id === redeemPackage.vehicleSizeId)
                            const curSize = sizes.find((s) => s.id === Number(watched.vehicleSizeId))
                            const bigger = pkgSize && curSize && curSize.sortOrder > pkgSize.sortOrder
                            return (
                              <p className={`mt-1.5 text-[11px] ${bigger ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {bigger
                                  ? `Auto más grande que el paquete (${pkgSize?.name}). Se cobra la diferencia.`
                                  : 'Cubierto por el paquete · se descuenta 1 lavado.'}
                              </p>
                            )
                          })()}
                        </div>
                      )}
                      {(canHalf || canFree) && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-emerald-100 pt-2.5">
                          <span className="text-[10.5px] font-bold uppercase tracking-wide text-emerald-700">Premio listo</span>
                          {canFree && (
                            <button
                              type="button"
                              onClick={() => {
                                form.setValue('prepagoActive', false, { shouldValidate: true })
                                setOfertaMode('none')
                                form.setValue('discountPercent', 0, { shouldValidate: true })
                                form.setValue('discountReason', '', { shouldValidate: true })
                                form.setValue('courtesy', true, { shouldValidate: true })
                                form.setValue('courtesyReason', 'Lealtad: lavado 10/10', { shouldValidate: true })
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-[11.5px] font-semibold text-white shadow-sm hover:bg-emerald-600"
                              data-testid="ticket-loyalty-apply-free"
                            >
                              Aplicar gratis (10/10)
                            </button>
                          )}
                          {canHalf && (
                            <button
                              type="button"
                              onClick={() => {
                                form.setValue('prepagoActive', false, { shouldValidate: true })
                                setOfertaMode('none')
                                form.setValue('courtesy', false, { shouldValidate: true })
                                form.setValue('courtesyReason', '', { shouldValidate: true })
                                form.setValue('discountPercent', 50, { shouldValidate: true })
                                form.setValue('discountReason', `Lealtad: mitad ${punches}/10`, { shouldValidate: true })
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[11.5px] font-semibold text-white shadow-sm hover:bg-amber-600"
                              data-testid="ticket-loyalty-apply-half"
                            >
                              Aplicar mitad (50% off)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Prepago redemption fields — captured when the Prepago pill is active. */}
              {watched.prepagoActive && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3" data-testid="ticket-prepago-fields">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">
                    Prepago — redime paquete
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField label="Nota prepagada" error={form.formState.errors.internalRef?.message}>
                      <input placeholder="# de nota" {...form.register('internalRef')} data-testid="ticket-prepago-nota" />
                    </TextField>
                    <TextField label="Extra a cobrar" error={form.formState.errors.priceOverride?.message}>
                      <input type="number" step="0.01" min="0" placeholder="0" {...form.register('priceOverride')} data-testid="ticket-prepago-extra" />
                    </TextField>
                  </div>
                  <p className="mt-2 text-[10.5px] text-violet-500">
                    El lavado ya se pagó al comprar el paquete. Cobra solo la diferencia (0 = cubierto).
                  </p>
                </div>
              )}
              {/* ⓪ Hidden Turno select — auto-locked by time of day; the active
                  shift is already shown in the page header. Kept in the DOM so
                  the form submits a shiftId, but no UI takes up form space. */}
              <select {...form.register('shiftId')} disabled={Boolean(disabledReason)} aria-label="Turno" className="sr-only">
                <option value={0}>Selecciona turno</option>
                {openShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>{shift.shiftType === 'MATUTINO' ? 'Mañana' : 'Tarde'}</option>
                ))}
              </select>

              {/* ── ① SERVICIO — tile grid ─────────────────────────────── */}
              {(() => {
                const allServices = (data.services.data ?? []).filter((s) => s.active !== false && s.category !== 'EXTRA')
                const selectedSvc = allServices.find((s) => s.id === Number(watched.serviceTypeId))
                return (
                  <div>
                    <SectionLabel num={1} text="SERVICIO" accent="purple" extra={selectedSvc ? `· ${selectedSvc.name}` : ''} />
                    <div className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-4">
                      {allServices.map((s) => {
                        const selected = Number(watched.serviceTypeId) === s.id
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => form.setValue('serviceTypeId', s.id as unknown as number, { shouldValidate: true })}
                            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98] ${
                              selected
                                ? 'border-violet-500 bg-gradient-to-b from-violet-50 to-white shadow-[0_6px_16px_-10px_rgba(124,58,237,0.45)]'
                                : 'border-border-soft bg-white hover:border-violet-200 hover:bg-violet-50/30'
                            }`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-violet-600 text-white' : 'bg-ink-100 text-ink-600'}`}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 3l1.6 4 4 1.6-4 1.6L12 14l-1.6-4-4-1.6 4-1.6L12 3z" />
                                <path d="M19 14l.8 2 2 .8-2 .8L19 20l-.8-2-2-.8 2-.8z" />
                              </svg>
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate font-display text-[13px] font-bold tracking-[-0.01em] ${selected ? 'text-violet-700' : 'text-ink-900'}`}>{s.name}</p>
                              {s.description && <p className="truncate text-[10.5px] text-ink-500">{s.description}</p>}
                            </div>
                            {selected && (
                              <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-violet-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    {form.formState.errors.serviceTypeId?.message && (
                      <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.serviceTypeId.message}</p>
                    )}
                  </div>
                )
              })()}

              {/* ── ② VEHÍCULO — tile grid with resolved price ─────────── */}
              {(() => {
                const allSizes = (data.sizes.data ?? []).filter((s) => s.active !== false).sort((a, b) => a.sortOrder - b.sortOrder)
                const selectedSize = allSizes.find((s) => s.id === Number(watched.vehicleSizeId))
                const prices = data.prices.data ?? []
                const priceFor = (sizeId: number) => {
                  const svcId = Number(watched.serviceTypeId)
                  if (!svcId || !sizeId) return null
                  return prices.find((p) => p.serviceTypeId === svcId && p.vehicleSizeId === sizeId && p.currency === 'MXN')?.amount ?? null
                }
                return (
                  <div>
                    <SectionLabel num={2} text="VEHÍCULO" accent="emerald" extra={selectedSize ? `· ${selectedSize.name}` : ''} />
                    <div className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-4">
                      {allSizes.map((s) => {
                        const selected = Number(watched.vehicleSizeId) === s.id
                        const price = priceFor(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => form.setValue('vehicleSizeId', s.id as unknown as number, { shouldValidate: true })}
                            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98] ${
                              selected
                                ? 'border-emerald-500 bg-gradient-to-b from-emerald-50 to-white shadow-[0_6px_16px_-10px_rgba(31,138,61,0.45)]'
                                : 'border-border-soft bg-white hover:border-emerald-200 hover:bg-emerald-50/30'
                            }`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-emerald-600 text-white' : 'bg-ink-100 text-ink-600'}`}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 17h18M4 13h16M5 13l2-5h10l2 5" />
                                <circle cx="7.5" cy="17" r="1.5" />
                                <circle cx="16.5" cy="17" r="1.5" />
                              </svg>
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-1.5">
                                <span className={`truncate font-display text-[13px] font-bold tracking-[-0.01em] ${selected ? 'text-emerald-700' : 'text-ink-900'}`}>{s.name}</span>
                                {price != null && (
                                  <span className={`shrink-0 font-mono text-[11.5px] font-bold tabular-nums ${selected ? 'text-emerald-700' : 'text-ink-500'}`}>${price}</span>
                                )}
                              </div>
                            </div>
                            {selected && (
                              <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    {form.formState.errors.vehicleSizeId?.message && (
                      <p className="mt-1.5 text-xs text-red-600">{form.formState.errors.vehicleSizeId.message}</p>
                    )}
                  </div>
                )
              })()}

              {/* sr-only selects mirror the form fields for e2e tests that
                  used <select> selectors (Servicio, Vehículo, Forma de pago).
                  The visible UI is the tile grids above and the Pago dropdown
                  in the dark sidecar — these hidden controls keep the legacy
                  contract intact without re-rendering anything. */}
              <select
                {...form.register('serviceTypeId')}
                aria-label="Servicio"
                className="sr-only"
                tabIndex={-1}
              >
                <option value={0}>Selecciona</option>
                {(data.services.data ?? [])
                  .filter((s) => s.active !== false && s.category !== 'EXTRA')
                  .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select
                {...form.register('vehicleSizeId')}
                aria-label="Vehículo"
                className="sr-only"
                tabIndex={-1}
              >
                <option value={0}>Selecciona</option>
                {(data.sizes.data ?? [])
                  .filter((s) => s.active !== false)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select
                {...form.register('paymentMethod')}
                aria-label="Forma de pago"
                className="sr-only"
                tabIndex={-1}
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Depósito</option>
              </select>

              {/* Extras chip picker. Operators cannot enter a free-form price —
                  ticking extras stacks each one's catalog price onto the base
                  via priceOverride, so corte still sees a single number. */}
              <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-white to-white p-3">
                <div>
                  {(() => {
                    if (watched.courtesy) return null
                    const currentSvc = (data.services.data ?? []).find((s) => s.id === Number(watched.serviceTypeId))
                    const sizeId = Number(watched.vehicleSizeId)
                    // Hide chips entirely when the primary service IS an extra
                    // (would be nonsense to stack Encerado on Encerado).
                    if (currentSvc && currentSvc.category === 'EXTRA') return null
                    // Prepago drives priceOverride itself — don't let extras clobber it.
                    if (watched.prepagoActive) return null

                    const prices = data.prices.data ?? []
                    const baseAmount = currentSvc && sizeId
                      ? (prices.find((pr) =>
                          pr.serviceTypeId === currentSvc.id && pr.vehicleSizeId === sizeId && pr.currency === 'MXN'
                        )?.amount ?? 0)
                      : 0

                    // All ACTIVE extras in the catalog — always shown, prices
                    // resolved per current vehicle (null until vehicle is picked
                    // or if no price row exists for this size).
                    const allExtras = (data.services.data ?? [])
                      .filter((s) => s.active !== false && s.category === 'EXTRA')
                      .map((s) => ({
                        service: s,
                        price: sizeId
                          ? prices.find((pr) =>
                              pr.serviceTypeId === s.id && pr.vehicleSizeId === sizeId && pr.currency === 'MXN'
                            )?.amount ?? null
                          : null,
                      }))
                    if (allExtras.length === 0) return null

                    const priceable = baseAmount > 0
                    const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    const recompute = (nextIds: Set<number>) => {
                      const nextSum = allExtras
                        .filter((x) => nextIds.has(x.service.id) && x.price != null)
                        .reduce((s, x) => s + (x.price as number), 0)
                      const next = nextIds.size === 0
                        ? '' as const  // No override -> catalog price applies
                        : baseAmount + nextSum
                      form.setValue('priceOverride', next as number | '', { shouldValidate: true })

                      // Sync notes — strip prior extra markers, re-add for picked
                      const extraNames = allExtras.map((x) => x.service.name)
                      let cleanNotes = (watched.notes ?? '').trim()
                      for (const name of extraNames) {
                        const re = new RegExp(`\\s*\\+\\s*${escapeRe(name)}`, 'gi')
                        cleanNotes = cleanNotes.replace(re, '').trim()
                      }
                      const markers = allExtras
                        .filter((x) => nextIds.has(x.service.id))
                        .map((x) => `+ ${x.service.name}`)
                        .join(' ')
                      const finalNotes = [cleanNotes, markers].filter(Boolean).join(' ').trim()
                      form.setValue('notes', finalNotes, { shouldValidate: true })
                    }
                    const toggleExtra = (id: number) => {
                      const target = allExtras.find((x) => x.service.id === id)
                      if (!target || target.price == null) return  // not priceable yet
                      const next = new Set(selectedExtraIds)
                      if (next.has(id)) next.delete(id); else next.add(id)
                      setSelectedExtraIds(next)
                      recompute(next)
                    }

                    return (
                      <div>
                        <p className="mb-1 text-[12px] font-semibold text-ink-700">
                          Sumar al precio base
                          {!priceable && (
                            <span className="ml-1.5 text-[10.5px] font-medium text-ink-400">
                              {sizeId === 0 || !currentSvc
                                ? '— elige servicio y vehículo'
                                : '— sin precio para este vehículo'}
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {allExtras.map(({ service, price }) => {
                            const picked = selectedExtraIds.has(service.id)
                            const canPrice = price != null && priceable
                            const onClick = () => toggleExtra(service.id)
                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={onClick}
                                disabled={!canPrice}
                                title={canPrice
                                  ? `Suma ${service.name} (+$${price}) al precio base $${baseAmount}`
                                  : 'Elige servicio y vehículo primero'}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                                  picked
                                    ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-[0_0_0_3px_rgba(251,191,36,0.15)]'
                                    : canPrice
                                      ? 'border-amber-300 bg-white text-amber-800 hover:bg-amber-50'
                                      : 'cursor-not-allowed border-dashed border-ink-200 bg-white/40 text-ink-400'
                                }`}
                              >
                                {picked && <span className="text-amber-600">✓</span>}
                                {service.name}
                                {canPrice && (
                                  <span className={`rounded-full px-1.5 text-[10.5px] font-bold ${
                                    picked ? 'bg-amber-300 text-amber-900' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {picked ? '−' : '+'}${price}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* ── ③ IDENTIFICACIÓN — Nota / Descripción / Hora ────────── */}
              <div>
                <SectionLabel num={3} text="IDENTIFICACIÓN" accent="amber" />
                <div className="mt-2 grid gap-2 md:grid-cols-[120px_1fr_168px]">
                  <div>
                    <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-600">Nota</label>
                    <input placeholder="Ej. 41703" disabled={watched.courtesy} {...form.register('internalRef')} className="tl-input" style={{ height: 36, fontSize: 13 }} />
                    {form.formState.errors.internalRef?.message && (
                      <p className="mt-1 text-xs text-red-600">{form.formState.errors.internalRef.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-600">Descripción del vehículo</label>
                    <input placeholder="Ej. Tsuru rojo, Tacoma blanca" {...form.register('vehicleDescription')} className="tl-input" style={{ height: 36, fontSize: 13 }} />
                    {form.formState.errors.vehicleDescription?.message && (
                      <p className="mt-1 text-xs text-red-600">{form.formState.errors.vehicleDescription.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-600">Hora</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        step={60}
                        lang="es-MX"
                        {...form.register('occurredAt')}
                        className="tl-input min-w-0 flex-1"
                        style={{ height: 36, fontSize: 13 }}
                      />
                      <button
                        type="button"
                        onClick={() => form.setValue('occurredAt', toLocalTimeValue(), { shouldValidate: true })}
                        className="shrink-0 rounded-md border border-border-soft px-2 text-[11px] font-semibold text-ink-600 transition hover:bg-ink-50"
                        style={{ height: 36 }}
                        title="Poner la hora actual"
                      >
                        Ahora
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ④ LAVADORES — list with checkbox + initial avatar ──── */}
              {(() => {
                const allLavadores = (data.employees.data ?? [])
                  .filter((e) => e.active)
                  .filter((e) => !/tia\s*gabi/i.test(e.fullName))
                  .sort((a, b) => a.fullName.localeCompare(b.fullName))
                const selectedIds = (watched.employeeIds ?? []).map(Number)
                const toggle = (id: number) => {
                  const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
                  form.setValue('employeeIds', next, { shouldValidate: true })
                }
                // The lavador search input keeps the e2e selector alive. The
                // visible row list filters from this query so the cashier can
                // still narrow down a long roster.
                const filtered = lavadorQuery.trim()
                  ? allLavadores.filter((e) => e.fullName.toLowerCase().includes(lavadorQuery.toLowerCase()))
                  : allLavadores
                return (
                  <div>
                    <SectionLabel
                      num={4}
                      text="LAVADORES"
                      accent="emerald"
                      extra={selectedIds.length > 0 ? `· ${selectedIds.length} asignados` : '· escribe para buscar'}
                    />
                    {selectedIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedIds.map((id) => {
                          const emp = allLavadores.find((e) => e.id === id)
                          if (!emp) return null
                          return (
                            <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-50 py-1 pl-3 pr-1 text-[12px] font-bold text-emerald-700">
                              {emp.fullName.split(' ').slice(0, 2).join(' ')}
                              <button type="button" onClick={() => toggle(id)} title="Quitar" aria-label={`Quitar ${emp.fullName}`} className="grid h-4 w-4 place-items-center rounded-full border-0 bg-emerald-600 p-0 text-white">
                                <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border-soft bg-white px-3 py-1.5">
                      <svg className="h-3.5 w-3.5 text-ink-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                      </svg>
                      <input
                        type="text"
                        value={lavadorQuery}
                        onChange={(e) => setLavadorQuery(e.target.value)}
                        onFocus={() => setWasherFocus(true)}
                        onBlur={() => setTimeout(() => setWasherFocus(false), 150)}
                        placeholder="Escribe un nombre para asignar lavador…"
                        data-testid="ticket-lavador-search"
                        className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] outline-none focus:ring-0"
                      />
                      {lavadorQuery && (
                        <button type="button" onClick={() => setLavadorQuery('')} className="text-[11px] text-ink-400 hover:text-ink-700">limpiar</button>
                      )}
                    </div>
                    {(washerFocus || lavadorQuery.trim()) && (
                    <div className="mt-1.5 overflow-hidden rounded-xl border border-border-soft bg-white shadow-lg" style={{ maxHeight: 240, overflowY: 'auto' }}>
                      {filtered.length === 0 && (
                        <div className="px-4 py-6 text-center text-[12px] text-ink-400">{lavadorQuery.trim() ? `Sin coincidencias para "${lavadorQuery.trim()}"` : 'Sin lavadores activos'}</div>
                      )}
                      {filtered.map((emp, i) => {
                        const on = selectedIds.includes(emp.id)
                        const initials = emp.fullName.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => toggle(emp.id)}
                            aria-pressed={on}
                            className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors ${i === 0 ? '' : 'border-t border-ink-100'} ${
                              on ? 'bg-gradient-to-r from-emerald-50/60 to-white' : 'hover:bg-ink-50/60'
                            }`}
                          >
                            <span
                              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded ${
                                on ? 'border-[1.5px] border-emerald-600 bg-emerald-600 text-white' : 'border-[1.5px] border-ink-300 bg-white'
                              }`}
                            >
                              {on && (
                                <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-[10.5px] font-bold ${
                                on ? 'bg-emerald-600 text-white' : 'bg-ink-100 text-ink-700'
                              }`}
                            >
                              {initials || '?'}
                            </span>
                            <span className={`flex-1 truncate text-[12.5px] font-semibold ${on ? 'text-emerald-700' : 'text-ink-900'}`}>{emp.fullName}</span>
                            {on && (
                              <span className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-emerald-700">asignado</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    )}
                    {form.formState.errors.employeeIds?.message && (
                      <p className="mt-1 text-xs text-red-600">{form.formState.errors.employeeIds.message}</p>
                    )}
                  </div>
                )
              })()}

              <div className="h-px bg-border-soft" />

              {/* ── AJUSTES — Cargo / Notas (Descuento is manager-only, edit flow) ── */}
              <div className={`grid gap-2.5 ${mode === 'edit' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                <div className="rounded-xl border border-dashed border-border-strong bg-white px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> CARGO
                  </p>
                  <div className="mt-1.5 grid grid-cols-[60px_1fr] gap-1.5">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="$"
                      aria-label="Cargo"
                      disabled={watched.courtesy}
                      data-testid="ticket-surcharge-amount"
                      {...form.register('surchargeAmount')}
                      className="tl-input"
                      style={{ height: 30, fontSize: 12 }}
                    />
                    <input
                      type="text"
                      placeholder={Number(watched.surchargeAmount) > 0 ? 'Motivo' : '— monto primero'}
                      aria-label="Motivo del cargo"
                      maxLength={120}
                      disabled={watched.courtesy || !(Number(watched.surchargeAmount) > 0)}
                      {...form.register('surchargeReason')}
                      className="tl-input"
                      style={{ height: 30, fontSize: 12 }}
                    />
                  </div>
                  {form.formState.errors.surchargeReason?.message && (
                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.surchargeReason.message}</p>
                  )}
                </div>

                {mode === 'edit' && (
                <div className="rounded-xl border border-dashed border-border-strong bg-white px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> DESCUENTO · GERENTE
                  </p>
                  <div className="mt-1.5 grid grid-cols-[54px_1fr] gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      placeholder="%"
                      aria-label="Descuento (%)"
                      disabled={watched.courtesy}
                      {...form.register('discountPercent')}
                      className="tl-input"
                      style={{ height: 30, fontSize: 12 }}
                    />
                    <input
                      type="text"
                      placeholder={watched.discountPercent > 0 ? 'Motivo' : '— % primero'}
                      aria-label="Motivo del descuento"
                      maxLength={120}
                      disabled={watched.courtesy || !(watched.discountPercent > 0)}
                      {...form.register('discountReason')}
                      className="tl-input"
                      style={{ height: 30, fontSize: 12 }}
                    />
                  </div>
                  {form.formState.errors.discountReason?.message && (
                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.discountReason.message}</p>
                  )}
                </div>
                )}

                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-600">Notas internas</label>
                  <input
                    type="text"
                    placeholder="Cliente frecuente, billete grande…"
                    {...form.register('notes')}
                    className="tl-input mt-1"
                    style={{ height: 30, fontSize: 12 }}
                  />
                </div>
              </div>

              {/* Keyboard hints strip */}
              <div className="mt-1 flex flex-wrap items-center gap-3 rounded-lg bg-ink-50 px-3 py-2 text-[10.5px] text-ink-500">
                <span className="font-bold uppercase tracking-[0.08em] text-ink-700">Atajos</span>
                <KbdHint keys={['1', '2', '3', '4']} label="servicio" />
                <KbdHint keys={['Q', 'W', 'E', 'R']} label="vehículo" />
                <KbdHint keys={['Tab']} label="siguiente campo" />
                <KbdHint keys={['⌘', '↵']} label="guardar" sep="+" />
              </div>
            </div>
          </div>

        </div>

        {/* ── Sidecar: Total a cobrar (dark) — design kit v2 ─────── */}
        <aside>
          {(() => {
            const selectedSvc = (data.services.data ?? []).find((s) => s.id === Number(watched.serviceTypeId))
            const selectedSize = (data.sizes.data ?? []).find((s) => s.id === Number(watched.vehicleSizeId))
            const svcSelected = Boolean(selectedSvc && selectedSize)
            const lavadorNames = (data.employees.data ?? [])
              .filter((e) => (watched.employeeIds ?? []).map(Number).includes(e.id))
              .map((e) => e.fullName)
            const surchargeNum = Number(watched.surchargeAmount) || 0
            const discountNum = Number(watched.discountPercent) || 0
            const overrideNum = Number(watched.priceOverride) || 0
            const baseAmount = (data.prices.data ?? []).find((p) =>
              p.serviceTypeId === Number(watched.serviceTypeId)
              && p.vehicleSizeId === Number(watched.vehicleSizeId)
              && p.currency === 'MXN'
            )?.amount ?? 0
            const subTotal = livePrice ?? 0
            const integerPart = Math.floor(subTotal)
            const decimalPart = Math.round((subTotal - integerPart) * 100).toString().padStart(2, '0')
            const showTotal = svcSelected || watched.courtesy
            // svcSelected + no override + no override-equivalents (courtesy / prepago)
            // + livePrice came back undefined means there's no service_prices row
            // for this combo. Block save so the cashier doesn't capture a phantom $0
            // ticket — they need to either pick a Precio especial or ask the gerente
            // to add the tarifa first.
            const missingCatalogPrice = svcSelected && !watched.courtesy && !watched.prepagoActive && livePrice === undefined
            return (
              <div
                className={`tl-receipt overflow-hidden text-white shadow-[0_24px_48px_-20px_rgba(15,23,42,0.45)] xl:sticky xl:top-4${
                  watched.courtesy ? ' is-courtesy' : watched.prepagoActive ? ' is-prepago' : ''
                }`}
                style={{
                  borderRadius: 18,
                  background: 'radial-gradient(120% 100% at 100% 0%, rgba(34,197,94,0.18), transparent 55%), linear-gradient(135deg, #0f0820 0%, #1a0f2e 40%, #1f3a2e 100%)',
                }}
              >
                {/* ── EN CAPTURA top bar ────────────────────────── */}
                <div className="relative flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="relative inline-flex h-2 w-2 rounded-full"
                      style={{ background: 'var(--brand-green-bright)', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">EN CAPTURA</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold tracking-[0.10em] text-white/45 tabular-nums">
                    {watched.internalRef ? `#${watched.internalRef}` : '#PENDIENTE'}
                  </span>
                </div>

                {/* ── Big total — split typography ──────────────── */}
                <div className="relative px-5 pb-3 pt-5">
                  {/* ghosted $ watermark */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-0 right-5 font-display font-black uppercase leading-none text-white/[0.05]"
                    style={{ fontSize: 88, letterSpacing: '-0.04em' }}
                  >
                    $
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Total a cobrar</p>
                  {showTotal ? (
                    <>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <span
                          className="font-display font-bold"
                          style={{
                            fontSize: 20,
                            color: watched.courtesy ? 'rgba(252,211,77,0.55)' : 'rgba(255,255,255,0.45)',
                          }}
                        >$</span>
                        <span
                          key={subTotal}
                          className={`tl-bigtotal__num font-display font-extrabold leading-none tl-fade-in${watched.courtesy ? ' amber' : ''}`}
                          style={{
                            fontSize: 48,
                            letterSpacing: '-0.04em',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {watched.courtesy ? '0' : integerPart.toLocaleString('es-MX')}
                        </span>
                        <span
                          className="ml-0.5 font-display font-bold"
                          style={{
                            fontSize: 18,
                            color: watched.courtesy ? 'rgba(252,211,77,0.55)' : 'rgba(255,255,255,0.45)',
                          }}
                        >.{watched.courtesy ? '00' : decimalPart}</span>
                      </div>
                      {discountNum > 0 && !watched.courtesy && baseAmount > 0 && (
                        <div className="mt-1 text-[11.5px] text-white/55">
                          antes <span className="font-mono line-through">{money(baseAmount, 'MXN')}</span>
                          <span className="ml-1.5 font-bold text-emerald-300">ahorra {money(baseAmount * discountNum / 100, 'MXN')}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p
                      className="mt-1.5 font-display font-bold leading-tight text-white/45"
                      style={{ fontSize: 18, letterSpacing: '-0.02em' }}
                    >
                      Selecciona servicio<br />y vehículo…
                    </p>
                  )}

                  {/* ── Status pills row ──────────────────────── */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {watched.courtesy && (
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] text-amber-200">CORTESÍA</span>
                    )}
                    {ofertaMode !== 'none' && (
                      <span className="rounded-full bg-sky-400/25 px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] text-sky-200">OFERTA</span>
                    )}
                    {watched.prepagoActive && (
                      <span className="rounded-full bg-violet-400/25 px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] text-violet-200">PREPAGO</span>
                    )}
                    {svcSelected && !watched.courtesy && discountNum > 0 && (
                      <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] text-emerald-300">−{discountNum}% DESCUENTO</span>
                    )}
                    {svcSelected && surchargeNum > 0 && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] text-amber-200">+CARGO</span>
                    )}
                  </div>

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

                {/* ── Ledger ─────────────────────────────────────── */}
                <div className="flex flex-col gap-[7px] border-t border-dashed border-white/10 px-5 py-3">
                  {svcSelected && (
                    <>
                      <SidecarLine k="Servicio" v={<span className="text-[12px] font-semibold text-white">{selectedSvc!.name}</span>} />
                      <SidecarLine k="Vehículo" v={<span className="text-[12px] font-semibold text-white">{selectedSize!.name}</span>} />
                      <SidecarLine k="Base" v={<span className="font-mono text-white tabular-nums">{money(baseAmount, 'MXN')}</span>} />
                      {overrideNum > 0 && overrideNum !== baseAmount && (
                        <SidecarLine k="Precio especial" v={<span className="font-mono text-violet-300 tabular-nums">{money(overrideNum, 'MXN')}</span>} />
                      )}
                      {surchargeNum > 0 && (
                        <SidecarLine k="Cargo" v={<span className="font-mono text-amber-300 tabular-nums">+{money(surchargeNum, 'MXN')}</span>} />
                      )}
                      {discountNum > 0 && !watched.courtesy && (
                        <SidecarLine k={`Descuento · ${discountNum}%`} v={<span className="font-mono text-emerald-300 tabular-nums">−{money(baseAmount * discountNum / 100, 'MXN')}</span>} />
                      )}
                    </>
                  )}
                  {lavadorNames.length > 0 && (
                    <SidecarLine k={`Lavadores · ${lavadorNames.length}`} v={
                      <span className="flex flex-wrap justify-end gap-1">
                        {lavadorNames.map((name) => (
                          <span key={name} className="rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-300">{name.split(' ')[0]}</span>
                        ))}
                      </span>
                    } />
                  )}
                  {watched.vehicleDescription?.trim() && (
                    <SidecarLine k="Descripción" v={<span className="text-[11.5px] text-white/80">{watched.vehicleDescription.trim()}</span>} />
                  )}
                  {watched.notes?.trim() && (
                    <SidecarLine k="Notas" v={<span className="text-[11.5px] text-white/70">{watched.notes.trim().length > 36 ? `${watched.notes.trim().slice(0, 36)}…` : watched.notes.trim()}</span>} />
                  )}
                  <div className="my-1 border-t border-dashed border-white/10" />
                  <SidecarLine k="Pago" v={
                    // Controlled mirror of the sr-only Forma de pago select
                    // (which holds the RHF ref). Both write through setValue
                    // so the form state stays in sync.
                    <select
                      value={watched.paymentMethod}
                      onChange={(e) => form.setValue('paymentMethod', e.target.value as 'CASH' | 'TRANSFER', { shouldValidate: true })}
                      disabled={watched.courtesy}
                      className="rounded-md px-2 py-0.5 text-[12px] font-semibold text-white outline-none focus:ring-2 focus:ring-emerald-400/40"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
                    >
                      <option value="CASH" style={{ color: 'var(--ink-900)' }}>Efectivo</option>
                      <option value="TRANSFER" style={{ color: 'var(--ink-900)' }}>Depósito</option>
                    </select>
                  } />
                </div>

                {/* ── CTA ───────────────────────────────────────── */}
                <div className="px-5 pb-4 pt-1">
                  {save.error && (
                    <p className="mb-2.5 rounded-lg bg-red-500/15 px-3 py-2 text-[12px] font-medium text-red-200 ring-1 ring-red-300/30">{save.error.message}</p>
                  )}
                  {missingCatalogPrice && (
                    <p className="mb-2.5 rounded-lg bg-amber-500/15 px-3 py-2 text-[12px] font-medium text-amber-200 ring-1 ring-amber-300/30">
                      Sin precio para esta combinación. Captura un Precio especial o pide al gerente que agregue la tarifa.
                    </p>
                  )}
                  {readOnly ? (
                    <div className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-[11.5px] font-semibold text-amber-200">
                      Turno cerrado — solo lectura
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={save.isPending || Boolean(disabledReason) || (!svcSelected && !watched.courtesy) || missingCatalogPrice}
                      data-testid="ticket-submit"
                      className={`tl-cta-sexy tl2-focus${watched.courtesy ? ' amber' : watched.prepagoActive ? ' purple' : ''}`}
                    >
                      {save.isPending ? (
                        <span>Guardando…</span>
                      ) : (
                        <>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5L20 7" />
                          </svg>
                          <span>
                            {mode === 'edit' ? 'Guardar cambios' : watched.courtesy ? 'Guardar cortesía' : 'Guardar ticket'}
                          </span>
                          {showTotal && livePrice !== undefined && (
                            <span className="tl2-mono-display" style={{ marginLeft: 2, opacity: 0.92, fontWeight: 700 }}>· {watched.courtesy ? 'GRATIS' : money(livePrice, 'MXN')}</span>
                          )}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSaved()}
                    className="mt-1.5 w-full bg-transparent text-[11.5px] font-semibold text-white/45 hover:text-white/70"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )
          })()}
        </aside>
      </form>
    </section>
  )
}

const employeeEditSchema = z.object({
  fullName: z.string().min(1, 'Escribe el nombre').max(120, 'Máximo 120 caracteres'),
  phone: z.string().max(40, 'Máximo 40 caracteres').optional(),
  active: z.boolean(),
  baseWeeklySalary: z.coerce.number().min(0, 'Mínimo 0'),
  payrollType: z.enum(['SALARY', 'COMMISSION']),
  commissionRate: z.coerce.number().min(0, 'Mínimo 0'),
  productivityBonusRate: z.coerce.number().min(0, 'Mínimo 0'),
  deactivationReason: z.string().max(500, 'Máximo 500 caracteres').optional(),
  primaryShift: z.enum(['MATUTINO', 'VESPERTINO', '']).optional(),
  outOfShiftCommissionRate: z.coerce.number().min(0, 'Mínimo 0'),
  restDayPremium: z.coerce.number().min(0, 'Mínimo 0'),
  absenceDayPenalty: z.coerce.number().min(0, 'Mínimo 0'),
  doNotRehire: z.boolean().optional(),
  doNotRehireNote: z.string().max(500, 'Máximo 500 caracteres').optional(),
})
type EmployeeEditFormValues = z.infer<typeof employeeEditSchema>

type CatalogTab = 'precios' | 'servicios' | 'tamanos' | 'lavadores' | 'descuentos'

interface Discount {
  id: number
  code: string
  name: string
  percent: number
  daysLabel: string
  applyAtShiftStart: boolean
  active: boolean
  usesThisMonth: number
  color: 'warn' | 'purple' | 'good' | 'info' | 'amber'
  createdAt: string
  updatedAt: string
}

const DISCOUNT_TONE: Record<string, { bg: string; tx: string }> = {
  warn:   { bg: 'var(--warn-50)',    tx: 'var(--warn-700)' },
  purple: { bg: 'var(--primary-50)', tx: 'var(--primary-700)' },
  good:   { bg: 'var(--good-50)',    tx: 'var(--good-700)' },
  info:   { bg: '#eff6ff',           tx: '#1d4ed8' },
  amber:  { bg: '#fffbeb',           tx: '#b45309' },
}
const DISCOUNT_COLORS = ['warn', 'purple', 'good', 'info', 'amber'] as const

// Manager-only discount catalog (Catálogos › Descuentos). Discounts live here,
// not in the cashier's ticket flow — they auto-apply at shift start on the days
// they cover, or a manager applies one to a single ticket from Tickets.
function DescuentosTab() {
  const qc = useQueryClient()
  const discounts = useQuery({ queryKey: ['discounts'], queryFn: () => api<Discount[]>('/api/v1/discounts') }).data ?? []
  const [editing, setEditing] = useState<Discount | null>(null)
  const [creating, setCreating] = useState(false)

  const save = useMutation({
    mutationFn: (v: { id?: number; body: Record<string, unknown> }) =>
      v.id
        ? api<Discount>(`/api/v1/discounts/${v.id}`, { method: 'PATCH', body: JSON.stringify(v.body) })
        : api<Discount>('/api/v1/discounts', { method: 'POST', body: JSON.stringify(v.body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['discounts'] }); setEditing(null); setCreating(false) },
  })
  const patch = useMutation({
    mutationFn: (v: { id: number; body: Record<string, unknown> }) =>
      api<Discount>(`/api/v1/discounts/${v.id}`, { method: 'PATCH', body: JSON.stringify(v.body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discounts'] }),
  })

  return (
    <div className="space-y-5">
      <Banner
        tone="info"
        title="Los descuentos se aplican al inicio del turno"
        text={'Si marcas "Auto al iniciar turno", el cajero los ve activos por defecto al abrir su turno. Un descuento también puede aplicarse manualmente a un ticket desde Tickets — solo el gerente.'}
      />

      <CardV2
        tone="amber"
        title="Descuentos del catálogo"
        subtitle="Configura los descuentos disponibles. Marca AUTO para que se enciendan solos al iniciar turno los días que apliquen."
        actions={<Button kind="primary" size="sm" onClick={() => setCreating(true)}>+ Nuevo descuento</Button>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {discounts.map((d) => {
            const tone = DISCOUNT_TONE[d.color] ?? DISCOUNT_TONE.warn
            const days = d.daysLabel ? d.daysLabel.split(',').map((s) => s.trim()).filter(Boolean) : []
            return (
              <div key={d.id} style={{ overflow: 'hidden', background: d.active ? '#fff' : 'var(--ink-50)', border: '1px solid var(--border-soft)', borderRadius: 14, opacity: d.active ? 1 : 0.72 }}>
                <div style={{ background: tone.bg, padding: '12px 14px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="tl2-mono-display" style={{ fontSize: 10.5, fontWeight: 700, color: tone.tx, letterSpacing: '0.06em', opacity: 0.8 }}>{d.code}</div>
                      <div style={{ marginTop: 2, fontSize: 15, fontWeight: 800, color: tone.tx, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{d.name}</div>
                    </div>
                    <div className="tl2-mono-display" style={{ fontSize: 32, fontWeight: 800, color: tone.tx, letterSpacing: '-0.03em', lineHeight: 1 }}>−{Math.round(d.percent)}%</div>
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10, minHeight: 18 }}>
                    {days.map((day) => (
                      <span key={day} style={{ background: 'var(--ink-100)', color: 'var(--ink-700)', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' }}>{day}</span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => patch.mutate({ id: d.id, body: { applyAtShiftStart: !d.applyAtShiftStart } })}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px dashed var(--border-soft)', cursor: 'pointer', width: '100%', background: 'none', textAlign: 'left' }}
                  >
                    <span aria-hidden style={{ width: 34, height: 20, borderRadius: 999, background: d.applyAtShiftStart ? 'var(--brand-green)' : 'var(--ink-300)', position: 'relative', flex: '0 0 auto', transition: 'background .15s' }}>
                      <span style={{ position: 'absolute', top: 2, left: d.applyAtShiftStart ? 16 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff', transition: 'left .15s' }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-900)' }}>Auto al iniciar turno</span>
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-500)' }}>Se enciende solo los días que aplica</span>
                    </span>
                  </button>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>{d.usesThisMonth} usos este mes · {d.active ? 'Activa' : 'Pausada'}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button kind="ghost" size="sm" onClick={() => setEditing(d)}>Editar</Button>
                      <Button kind="ghost" size="sm" onClick={() => patch.mutate({ id: d.id, body: { active: !d.active } })}>{d.active ? 'Pausar' : 'Activar'}</Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <button
            type="button"
            onClick={() => setCreating(true)}
            style={{ background: 'transparent', border: '2px dashed var(--border-strong)', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ink-500)', cursor: 'pointer', fontSize: 13, fontWeight: 600, minHeight: 178 }}
          >
            + Crear descuento
          </button>
        </div>
      </CardV2>

      <CardV2 tone="purple" title="Calendario de descuentos · próximos 14 días" subtitle="Los descuentos marcados como AUTO se aplican al iniciar el turno del día correspondiente.">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => {
            const dt = new Date(); dt.setDate(dt.getDate() + i)
            const dow = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'][dt.getDay()]
            const hits = discounts.filter((x) => x.active && x.applyAtShiftStart && x.daysLabel.split(',').map((s) => s.trim()).includes(dow))
            return (
              <div key={i} className="flex min-h-[90px] flex-col gap-1 rounded-lg border px-2.5 py-2" style={{ background: hits.length ? 'linear-gradient(180deg, rgba(254,243,199,0.4), #fff 70%)' : '#fff', borderColor: hits.length ? 'var(--warn-100)' : 'var(--border-soft)' }}>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-ink-500">{dow}</div>
                <div className="tl2-mono-display font-display text-[18px] font-extrabold leading-none text-ink-900">{dt.getDate()}</div>
                <div className="mt-auto flex flex-col gap-1">
                  {hits.length === 0 && <span className="text-[10px] italic text-ink-300">sin descuentos</span>}
                  {hits.map((h) => (
                    <span key={h.id} style={{ alignSelf: 'flex-start', background: 'var(--warn-100)', color: 'var(--warn-700)', fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em' }}>{h.code} · −{Math.round(h.percent)}%</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardV2>

      {(creating || editing) && (
        <DiscountModal
          discount={editing}
          saving={save.isPending}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSave={(body, id) => save.mutate({ id, body })}
        />
      )}
    </div>
  )
}

function DiscountModal({ discount, onClose, onSave, saving }: {
  discount: Discount | null
  onClose: () => void
  onSave: (body: Record<string, unknown>, id?: number) => void
  saving: boolean
}) {
  const isEdit = !!discount
  const [code, setCode] = useState(discount?.code ?? '')
  const [name, setName] = useState(discount?.name ?? '')
  const [percent, setPercent] = useState(String(discount?.percent ?? 10))
  const [daysLabel, setDaysLabel] = useState(discount?.daysLabel ?? '')
  const [applyAtShiftStart, setApplyAtShiftStart] = useState(discount?.applyAtShiftStart ?? false)
  const [color, setColor] = useState<Discount['color']>(discount?.color ?? 'warn')

  const submit = () => {
    const body: Record<string, unknown> = { name: name.trim(), percent: Number(percent), daysLabel: daysLabel.trim(), applyAtShiftStart, color }
    if (!isEdit) body.code = code.trim().toUpperCase()
    onSave(body, discount?.id)
  }

  return (
    <Modal title={isEdit ? `Editar descuento · ${discount!.code}` : 'Nuevo descuento'} narrow onClose={onClose}>
      <div className="space-y-3">
        {!isEdit && (
          <Field label="Código (mayúsculas, sin espacios)">
            <input className="tl-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="LUN15" />
          </Field>
        )}
        <Field label="Nombre">
          <input className="tl-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lunes de descuento" autoFocus={isEdit} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Porcentaje (%)">
            <input className="tl-input" type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} />
          </Field>
          <Field label="Color">
            <select className="tl-input" value={color} onChange={(e) => setColor(e.target.value as Discount['color'])}>
              {DISCOUNT_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Días / vigencia (separa con comas)">
          <input className="tl-input" value={daysLabel} onChange={(e) => setDaysLabel(e.target.value)} placeholder="LUN, MAR  ·  o  ·  12 MAY  ·  o  ·  Jun - Ago" />
        </Field>
        <label className="flex items-center gap-2.5 cursor-pointer pt-1">
          <input type="checkbox" checked={applyAtShiftStart} onChange={(e) => setApplyAtShiftStart(e.target.checked)} />
          <span className="text-[13px] font-semibold text-ink-800">Auto al iniciar turno — se enciende solo los días que aplica</span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button kind="ghost" onClick={onClose}>Cancelar</Button>
          <Button kind="primary" disabled={saving || !name.trim() || (!isEdit && !code.trim())} onClick={submit}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear descuento'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function CatalogsScreen() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<CatalogTab>('precios')
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
    defaultValues: { code: '', name: '', description: '', category: 'STANDARD' },
  })
  const sizeForm = useForm<VehicleSizeFormValues>({
    resolver: zodResolver(vehicleSizeSchema) as Resolver<VehicleSizeFormValues>,
    defaultValues: { code: '', name: '', sortOrder: 0, category: 'AUTO' },
  })
  const priceForm = useForm<ServicePriceFormValues>({
    resolver: zodResolver(servicePriceSchema) as Resolver<ServicePriceFormValues>,
    defaultValues: { serviceTypeId: 0, vehicleSizeId: 0, amount: 0, effectiveFrom: today },
  })

  const employees = data.employees.data ?? []
  const services = data.services.data ?? []
  const sizes = data.sizes.data ?? []
  const prices = data.prices.data ?? []
  const discountsData = useQuery({ queryKey: ['discounts'], queryFn: () => api<Discount[]>('/api/v1/discounts') }).data ?? []
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
          doNotRehire: values.doNotRehire ?? false,
          doNotRehireNote: values.doNotRehire ? (values.doNotRehireNote?.trim() || undefined) : undefined,
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
        category: values.category,
      }),
    }),
    onSuccess: async () => {
      serviceForm.reset({ code: '', name: '', description: '', category: 'STANDARD' })
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

      <PageHeaderV2
        eyebrow="CONFIGURACIÓN · CATÁLOGOS"
        eyebrowDot
        title="Catálogos"
        subtitle="Servicios, tamaños, precios, lavadores y descuentos del día."
        actions={
          <NavLink to="/tickets/nuevo" className="tl-btn tl-btn-primary">
            + Nuevo ticket
          </NavLink>
        }
      />

      <UnderlineTabs<CatalogTab>
        value={tab}
        onChange={setTab}
        items={(
          [
            { id: 'precios',    label: 'Precios',    count: prices.length },
            { id: 'servicios',  label: 'Servicios',  count: services.length },
            { id: 'tamanos',    label: 'Tamaños',    count: sizes.length },
            { id: 'lavadores',  label: 'Lavadores',  count: employees.filter((e) => e.active).length },
            { id: 'descuentos', label: 'Descuentos', count: discountsData.filter((d) => d.active).length },
          ] as Array<{ id: CatalogTab; label: string; count?: number }>
        ).filter((it) => it.id !== 'descuentos' || hasRole('GERENTE'))}
      />

      <div className="grid gap-5">
        <div className="space-y-5">
          {tab === 'descuentos' && <DescuentosTab />}
          {tab === 'lavadores' && (
          <CardV2 tone="purple" title="Lavadores activos" subtitle="Comisión y sueldo que usa la Nómina. Editar para ajustar · Agregar para dar de alta.">
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
                    {employee.doNotRehire && (
                      <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700" title={employee.doNotRehireNote ?? 'No recontratar'}>
                        No recontratar
                      </span>
                    )}
                    <p className="text-xs text-ink-400">
                      {employee.payrollType === 'COMMISSION'
                        ? `Comision ${money(employee.commissionRate, 'MXN')}/carro`
                        : `Sueldo ${money(employee.baseWeeklySalary, 'MXN')}/sem`}
                    </p>
                    {employee.doNotRehire && employee.doNotRehireNote && (
                      <p className="text-[11px] text-red-600">⚠ {employee.doNotRehireNote}</p>
                    )}
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
          </CardV2>
          )}

          {tab === 'servicios' && (
          <CardV2
            tone="purple"
            title="Servicios"
            subtitle="Lavados y extras disponibles al crear un ticket. Toca Editar para cambiar · Agregar para crear uno nuevo."
            actions={<Button kind="primary" size="sm" onClick={() => setShowAddService(true)}>+ Agregar servicio</Button>}
          >
            <div className="mb-3 flex items-center justify-between" style={{ display: 'none' }}>
              <p className="text-[12.5px] text-ink-500">Lavados y extras disponibles al crear un ticket.</p>
              <Button kind="ghost" size="sm" onClick={() => setShowAddService(true)}>+ Agregar</Button>
            </div>
            <SimpleList
              empty="No hay servicios."
              rows={[...services]
                .sort((a, b) => {
                  const ac = a.category === 'EXTRA' ? 1 : 0
                  const bc = b.category === 'EXTRA' ? 1 : 0
                  return ac - bc || a.name.localeCompare(b.name)
                })
                .map((service) => ({
                  id: service.id,
                  title: (
                    <span className="inline-flex items-center gap-2">
                      <span>{service.name}</span>
                      {service.category === 'EXTRA' && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-amber-800">
                          Extra
                        </span>
                      )}
                    </span>
                  ),
                  detail: service.code,
                }))}
            />
          </CardV2>
          )}

          {tab === 'tamanos' && (
          <CardV2
            tone="purple"
            title="Tamaños de vehículo"
            subtitle="Las categorías que definen el precio. Editar para renombrar · Agregar para crear."
            actions={<Button kind="primary" size="sm" onClick={() => setShowAddSize(true)}>+ Agregar tamaño</Button>}
          >
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
          </CardV2>
          )}

          {tab === 'precios' && (
          <CardV2
            tone="purple"
            title="Matriz de precios · Autos y camionetas"
            subtitle="Toca cualquier precio para editarlo en su lugar."
          >
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
          </CardV2>
          )}

        </div>
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
            <SelectField label="Tipo" error={serviceForm.formState.errors.category?.message}>
              <select {...serviceForm.register('category')}>
                <option value="STANDARD">Lavado (servicio principal)</option>
                <option value="EXTRA">Extra (se suma a un lavado, p.ej. Encerado)</option>
              </select>
            </SelectField>
            <p className="text-[11.5px] leading-snug text-ink-500">
              Los Extras aparecen como botones en el ticket para sumar al precio del lavado base. Después de crearlo, agrega un precio por cada tamaño de vehículo en el panel de Precios.
            </p>
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
                            const displayVal = pendingVal ?? currentAmount
                            // Kit's inline price cell: "changed" shows warm amber tint;
                            // "big" (>25% delta) shows rose so dangerous edits stand out.
                            const isBig = isDirty && currentAmount != null && currentAmount > 0
                              && Math.abs((pendingVal as number) - currentAmount) / currentAmount > 0.25
                            return (
                              <td key={svcId} className="r p-1">
                                {currentAmount !== undefined ? (
                                  <span className={`cat-pricecell ${isBig ? 'big' : isDirty ? 'changed' : ''}`.trim()}>
                                    <span className="cur">$</span>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      min="0.01"
                                      step="1"
                                      value={displayVal}
                                      onChange={(e) => {
                                        const val = Number(e.target.value)
                                        setPendingAmounts((prev) => {
                                          const next = new Map(prev)
                                          next.set(key, val)
                                          return next
                                        })
                                      }}
                                    />
                                  </span>
                                ) : <span className="cat-dash">—</span>}
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
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editingWithdrawal, setEditingWithdrawal] = useState<Withdrawal | null>(null)
  const [editingAdvance, setEditingAdvance] = useState<EmployeeAdvance | null>(null)
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
      <PageHead
        title="Gastos"
        subtitle={`Salidas de caja · ${from === to ? from : `${from} → ${to}`}`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Button kind="primary" icon={<IPlus size={14} />} testId="gastos-new-expense" onClick={() => { setTab('expenses'); setModal('expense') }}>Gasto</Button>
            <Button kind="secondary" testId="gastos-new-withdrawal" onClick={() => { setTab('withdrawals'); setModal('withdrawal') }}>+ Retiro</Button>
            <Button kind="secondary" testId="gastos-new-advance" onClick={() => { setTab('advances'); setModal('advance') }}>+ Préstamo</Button>
          </div>
        }
      />

      {/* Hero salida total — clickable kit-aligned dark gradient with rose tint */}
      <div
        style={{
          position: 'relative', overflow: 'hidden', borderRadius: 20,
          background: 'radial-gradient(120% 130% at 100% 0%, rgba(244,63,94,0.22), transparent 55%), linear-gradient(135deg, #0f0820, #1a0f2e 45%, #2a1020)',
          padding: '22px 26px', color: '#fff',
          boxShadow: '0 24px 48px -22px rgba(15,23,42,0.5)',
        }}
      >
        <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 24, alignItems: 'flex-end' }}>
          <div data-testid="metric-total-salida">
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.5)' }}>
              Total salida · {from === today && to === today ? 'hoy' : from === to ? from : `${from} → ${to}`}
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'rgba(253,164,175,0.6)' }}>$</span>
              <span className="tl2-mono-display" style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em', color: '#fda4af', lineHeight: 1 }}>
                {Math.round(animCombined).toLocaleString('es-MX')}
              </span>
            </div>
          </div>
          {([
            { lab: 'Gastos', val: animExpenses, count: counts.expenses, k: 'expenses' as const, tid: 'metric-gastos-value' },
            { lab: 'Retiros', val: animWithdrawals, count: counts.withdrawals, k: 'withdrawals' as const, tid: 'metric-retiros-value' },
            { lab: 'Préstamos', val: animAdvances, count: counts.advances, k: 'advances' as const, tid: 'metric-prestamos-value' },
          ]).map((s) => (
            <button
              key={s.lab}
              type="button"
              onClick={() => setTab(s.k)}
              className="tl2-press"
              style={{
                textAlign: 'left', cursor: 'pointer',
                background: 'transparent', border: 0,
                borderLeft: '1px solid rgba(255,255,255,0.12)',
                paddingLeft: 22,
                fontFamily: 'inherit',
                opacity: tab === s.k ? 1 : 0.72,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {s.lab}{tab === s.k && <span style={{ width: 5, height: 5, borderRadius: 999, background: '#fda4af' }} />}
              </div>
              <div className="tl2-mono-display" data-testid={s.tid} style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: '#fff' }}>
                {money(s.val, 'MXN')}
              </div>
              <div style={{ marginTop: 4, fontSize: 10.5, color: 'rgba(255,255,255,0.4)' }}>
                {s.count} registro{s.count === 1 ? '' : 's'}
              </div>
            </button>
          ))}
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
        {tab === 'expenses' && (
          <SelectField label="Categoría">
            <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory | '')}>
              <option value="">Todas</option>
              {expenseCategories.map((item) => (
                <option key={item} value={item}>{categoryLabel(item)}</option>
              ))}
            </select>
          </SelectField>
        )}
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
          loading={expenses.isLoading}
          rows={(expenses.data ?? []).map((row) => ({
            id: row.id,
            date: row.expenseDate,
            concept: categoryLabel(row.category),
            detail: row.description || '-',
            amount: row.amount,
          }))}
          empty="No hay gastos en este rango."
          onRowClick={(id) => {
            const row = (expenses.data ?? []).find((r) => r.id === id)
            if (row) setEditingExpense(row)
          }}
        />
      )}
      {tab === 'withdrawals' && (
        <MoneyTable
          title="Retiros"
          loading={withdrawals.isLoading}
          rows={(withdrawals.data ?? []).map((row) => ({
            id: row.id,
            date: row.withdrawalDate,
            concept: 'Retiro',
            detail: row.reason || '-',
            amount: row.amount,
          }))}
          empty="No hay retiros en este rango."
          onRowClick={(id) => {
            const row = (withdrawals.data ?? []).find((r) => r.id === id)
            if (row) setEditingWithdrawal(row)
          }}
        />
      )}
      {tab === 'advances' && (
        <MoneyTable
          title="Préstamos a lavadores"
          loading={advances.isLoading}
          rows={(advances.data ?? []).map((row) => ({
            id: row.id,
            date: row.advanceDate,
            concept: row.employeeName,
            detail: row.reason || '-',
            amount: row.amount,
          }))}
          empty="No hay préstamos en este rango."
          onRowClick={(id) => {
            const row = (advances.data ?? []).find((r) => r.id === id)
            if (row) setEditingAdvance(row)
          }}
        />
      )}

      {modal === 'expense' && <ExpenseModal data={data} onClose={() => setModal(null)} />}
      {modal === 'withdrawal' && <WithdrawalModal data={data} onClose={() => setModal(null)} />}
      {modal === 'advance' && <AdvanceModal data={data} onClose={() => setModal(null)} />}
      {editingExpense && <ExpenseModal data={data} onClose={() => setEditingExpense(null)} editing={editingExpense} />}
      {editingWithdrawal && <WithdrawalModal data={data} onClose={() => setEditingWithdrawal(null)} editing={editingWithdrawal} />}
      {editingAdvance && <AdvanceModal data={data} onClose={() => setEditingAdvance(null)} editing={editingAdvance} />}
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

      {/* ─── Page header (v2) ──────────────────────────────────────── */}
      <div className="tl2-page-header">
        <div className="tl2-page-header__left">
          <div className="tl2-page-header__eyebrow"><span className="dot" />CIERRE DE CAJA · {data.currentBusinessDay?.businessDate ?? 'sin día'}</div>
          <h1 className="tl2-page-header__title">Corte de turno</h1>
          <p className="tl2-page-header__subtitle">Cuenta el efectivo del turno por denominaciones y compara con la caja esperada.</p>
        </div>
        <div className="tl2-page-header__right items-center gap-2 rounded-xl border border-border-soft bg-white p-1.5 shadow-xs">
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
                  <ReasonAction
                    kind="secondary"
                    size="lg"
                    block
                    pending={reopenMutation.isPending}
                    label="Reabrir turno"
                    pendingLabel="Reabriendo..."
                    title="Reabrir turno cerrado"
                    prompt="Vas a reabrir un turno que ya estaba cerrado. La acción queda registrada en la bitácora con tu nombre y la hora."
                    confirmLabel="Reabrir turno"
                    onConfirm={(reason) => reopenMutation.mutate(reason)}
                  />
                )}
              </form>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

// ─── Operación y personal (gerente + dueño risk monitoring) ─────────────────
// Formerly "Vigilancia". Route stays /vigilancia for bookmark stability; nav
// label, page title, and h2 use the new editorial copy.
// Sub-nav for the merged "Operación y auditoría" surface — both pages share these tabs.
function OperacionAuditoriaTabs() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
      isActive
        ? 'border-b-2 border-emerald-500 text-ink-900'
        : 'border-b-2 border-transparent text-ink-500 hover:text-ink-700'
    }`
  return (
    <nav className="flex items-center gap-1 border-b border-border-soft">
      <NavLink to="/vigilancia" end className={cls}>Operación</NavLink>
      <NavLink to="/auditoria" end className={cls}>Auditoría</NavLink>
    </nav>
  )
}

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
      <OperacionAuditoriaTabs />

      <PageHeaderV2
        eyebrow={`SOLO DUEÑO · ${from} → ${to}`}
        eyebrowDot
        title="Vigilancia"
        subtitle="Patrones que ayudan a detectar irregularidades: cortesías, cancelaciones, ediciones rápidas, faltantes de caja y acciones fuera de horario."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              className={overall === 'red' ? 'bg-rose-100 text-rose-700' : overall === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}
            >
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full ${overall !== 'green' ? 'animate-ping' : ''} rounded-full opacity-75 ${overall === 'red' ? 'bg-rose-400' : overall === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${overall === 'red' ? 'bg-rose-500' : overall === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              </span>
              {overall === 'red' ? 'Revisar urgente' : overall === 'amber' ? 'Atención' : 'Normal'}
            </div>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="tl-input" style={{ width: 140 }} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="tl-input" style={{ width: 140 }} />
          </div>
        }
      />

      {patterns.error && <ErrorMessage message={patterns.error.message} />}

      {/* Red-flag KPI tiles — v2 Kpi */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiV2
          label="Cortesías"
          value={String(Math.round(animCortesias))}
          tone={(data?.totalCortesias ?? 0) > 3 ? 'warn' : undefined}
          sub={
            (data?.byActor.filter((a) => a.ticketsCourtesy > 0).length ?? 0) > 0
              ? `Top: ${[...(data?.byActor ?? [])].sort((a, b) => b.ticketsCourtesy - a.ticketsCourtesy)[0]?.actor} (${[...(data?.byActor ?? [])].sort((a, b) => b.ticketsCourtesy - a.ticketsCourtesy)[0]?.ticketsCourtesy})`
              : 'sin cortesías'
          }
        />
        <KpiV2
          label="Cancelados"
          value={String(Math.round(animVoided))}
          tone={(data?.totalVoided ?? 0) > 2 ? 'bad' : undefined}
          sub={
            (data?.byActor.filter((a) => a.ticketsVoided > 0).length ?? 0) > 0
              ? `Top: ${[...(data?.byActor ?? [])].sort((a, b) => b.ticketsVoided - a.ticketsVoided)[0]?.actor} (${[...(data?.byActor ?? [])].sort((a, b) => b.ticketsVoided - a.ticketsVoided)[0]?.ticketsVoided})`
              : 'sin cancelaciones'
          }
        />
        <KpiV2
          label="Edits < 1h"
          value={String(Math.round(animFastEdits))}
          tone={(data?.totalFastEdits ?? 0) > 1 ? 'info' : undefined}
          sub="Ediciones poco después de crear"
        />
        <KpiV2
          label="Faltantes"
          value={money(animShortage, 'MXN')}
          tone={(data?.totalShortageVariance ?? 0) < 0 ? 'bad' : undefined}
          sub={`${data?.shortages.length ?? 0} corte${data?.shortages.length === 1 ? '' : 's'} con faltante`}
        />
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

      {/* Bottom 2-col: Cortes con faltante + Fuera de horario — kit pattern */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <CardV2
          tone="emerald"
          title="Cortes con faltante"
          actions={<Pill tone={(data?.shortages.length ?? 0) > 0 ? 'bad' : 'gray'}>{data?.shortages.length ?? 0}</Pill>}
        >
          {(data?.shortages.length ?? 0) === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-700)', fontSize: 13.5 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--good-100)', color: 'var(--good-700)', display: 'grid', placeItems: 'center' }}>
                <ICheck size={14} />
              </div>
              Todos los cortes cuadraron en este rango.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(data?.shortages ?? []).slice(0, 6).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bad-50)', borderRadius: 8, fontSize: 12.5 }}>
                  <span>{s.businessDate} · {s.shiftType === 'MATUTINO' ? 'Matutino' : 'Vespertino'}</span>
                  <b className="tl2-mono-display" style={{ color: 'var(--bad-700)' }}>{money(s.variance, 'MXN')}</b>
                </div>
              ))}
            </div>
          )}
        </CardV2>
        <CardV2
          tone="amber"
          title="Fuera de horario"
          actions={<Pill tone={(data?.totalOffHoursActions ?? 0) > 0 ? 'warn' : 'gray'}>{data?.totalOffHoursActions ?? 0}</Pill>}
        >
          {(data?.totalOffHoursActions ?? 0) === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-700)', fontSize: 13.5 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--good-100)', color: 'var(--good-700)', display: 'grid', placeItems: 'center' }}>
                <ICheck size={14} />
              </div>
              Sin acciones fuera de horario.
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--ink-700)' }}>
              <b className="tl2-mono-display">{data?.totalOffHoursActions}</b> acciones registradas fuera de las horas operativas.
            </div>
          )}
        </CardV2>
      </div>
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
  const [auditView, setAuditView] = useState<'timeline' | 'table'>('timeline')

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
      <OperacionAuditoriaTabs />
      <PageHeaderV2
        eyebrow="REGISTRO DE CAMBIOS"
        eyebrowDot
        title="Auditoría"
        subtitle="Cambios importantes de caja, tickets, gastos, nómina y correcciones."
        actions={
          <UnderlineTabs<'timeline' | 'table'>
            value={auditView}
            onChange={setAuditView}
            items={[
              { id: 'timeline', label: 'Cronología' },
              { id: 'table', label: 'Tabla' },
            ]}
          />
        }
      />

      {pendingFlagged.length > 0 && (
        <CardV2
          tone="amber"
          title={`Cambios irregulares por revisar (${pendingFlagged.length})`}
          subtitle="Cambios grandes de nómina o de pago del personal. Revisa cada uno y márcalo como revisado."
        >
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
        </CardV2>
      )}

      {auditView === 'table' && (
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
      )}

      {auditView === 'timeline' && (
        <Panel title={`Cronología · ${from === to ? from : `${from} → ${to}`}`}>
          <p className="text-[12.5px] text-ink-500 mb-3">
            Eventos agrupados por día. Cambia a <button type="button" onClick={() => setAuditView('table')} className="font-semibold text-violet-700 hover:text-violet-800">Tabla</button> para filtros y exportación.
          </p>
          {events.error && <ErrorMessage message={events.error.message} />}
          <div className="space-y-3">
            {(() => {
              const byDay = new Map<string, AuditEvent[]>()
              for (const ev of events.data ?? []) {
                const day = (ev.occurredAt ?? '').slice(0, 10)
                const arr = byDay.get(day) ?? []
                arr.push(ev)
                byDay.set(day, arr)
              }
              const days = Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]))
              if (days.length === 0 && !events.isLoading) {
                return <p className="text-[12.5px] text-ink-400 italic">Sin eventos en este rango.</p>
              }
              return days.map(([day, evs]) => (
                <div key={day} className="rounded-xl border border-border-soft bg-white p-3">
                  <div className="mb-2 inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.10em] text-ink-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-900" />
                    {day} · {evs.length} evento{evs.length === 1 ? '' : 's'}
                  </div>
                  <div className="space-y-1.5">
                    {evs.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-border-soft bg-white px-2.5 py-1.5 text-[12.5px]">
                        <span className="font-mono text-[10.5px] text-ink-500 w-12">{(ev.occurredAt ?? '').slice(11, 16)}</span>
                        <AuditActionPill action={ev.action} />
                        <span className="text-ink-700 min-w-0 flex-1 truncate">{ev.reason || ev.entityType}</span>
                        <span className="text-[11px] text-ink-500">{ev.actorUsername}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            })()}
          </div>
        </Panel>
      )}

      {auditView === 'table' && (
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
      )}
    </section>
  )
}

/**
 * Multi-bar chart strip — paired daily bars for ingresos (purple) + carros×$200
 * reference line (emerald), rendered without a charting lib so we don't ship one
 * just for this. Matches the design-kit "tl2-chart-strip" treatment: dot-legend,
 * big sub headline, last bar at full opacity. Day labels are the DD slice of
 * each date so the axis stays tight.
 */
// Kit v3 RpChart — single-series bar chart with metric toggle + hover tooltip.
type RpMetric = 'ingresos' | 'result' | 'cars'
const RP_METRICS_V3: Record<RpMetric, { label: string; color: string; hi: string; money: boolean; get: (d: DailySummary) => number }> = {
  ingresos: { label: 'Ingresos',  color: 'var(--primary-500)', hi: 'var(--primary-700)', money: true,  get: (d) => Number(d.ticketRevenue) || 0 },
  result:   { label: 'Resultado', color: '#34d399',            hi: 'var(--good-700)',     money: true,  get: (d) => Number(d.result) || 0 },
  cars:     { label: 'Carros',    color: '#22d3ee',            hi: '#0e7490',             money: false, get: (d) => Number(d.carsWashed) || 0 },
}

function RpChart({ days, metric, setMetric }: { days: DailySummary[]; metric: RpMetric; setMetric: (m: RpMetric) => void }) {
  const M = RP_METRICS_V3[metric]
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const max = Math.max(...sorted.map(M.get), 1)
  const [hover, setHover] = useState<number | null>(null)
  const totalForMetric = sorted.reduce((s, d) => s + M.get(d), 0)
  const totalCars = sorted.reduce((s, d) => s + (Number(d.carsWashed) || 0), 0)
  const totalIngresos = sorted.reduce((s, d) => s + (Number(d.ticketRevenue) || 0), 0)
  const headline = M.money ? money(totalForMetric, 'MXN') : totalForMetric.toLocaleString('es-MX')

  if (sorted.length === 0) {
    return (
      <div style={{ borderRadius: 18, border: '1px solid var(--border-soft)', background: '#fff', boxShadow: 'var(--shadow-sm)', padding: '20px 22px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-400)' }}>
          {M.label} · sin datos en el rango
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 18, border: '1px solid var(--border-soft)', background: '#fff', boxShadow: 'var(--shadow-sm)', padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-400)' }}>
            {M.label} · {sorted.length} día{sorted.length === 1 ? '' : 's'}
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink-900)' }}>{headline}</span>
            <span className="tl2-mono-display" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-500)' }}>
              {totalCars.toLocaleString('es-MX')} carros · {money(totalIngresos, 'MXN')}
            </span>
          </div>
        </div>
        <div style={{ display: 'inline-flex', padding: 3, gap: 2, background: 'var(--ink-100)', borderRadius: 10 }}>
          {(Object.entries(RP_METRICS_V3) as Array<[RpMetric, typeof M]>).map(([k, m]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMetric(k)}
              className="tl2-press"
              style={{
                padding: '6px 14px', borderRadius: 8, border: 0, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                background: metric === k ? '#fff' : 'transparent',
                color: metric === k ? 'var(--ink-900)' : 'var(--ink-500)',
                boxShadow: metric === k ? 'var(--shadow-xs)' : 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: m.color }} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 18, height: 200, display: 'flex', alignItems: 'flex-end', gap: sorted.length > 20 ? 4 : 8 }}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <div key={g} style={{ position: 'absolute', left: 0, right: 0, bottom: `${g * 100}%`, borderTop: '1px dashed var(--ink-100)' }} />
        ))}
        {sorted.map((d, i) => {
          const isHover = hover === i
          return (
            <div
              key={d.date}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: '100%', justifyContent: 'flex-end' }}
            >
              {isHover && (
                <div style={{ position: 'absolute', bottom: '102%', left: '50%', transform: 'translateX(-50%)', background: 'var(--ink-900)', color: '#fff', borderRadius: 8, padding: '7px 10px', fontSize: 11, whiteSpace: 'nowrap', zIndex: 5, boxShadow: '0 8px 20px -6px rgba(15,23,42,0.4)' }}>
                  <div style={{ fontWeight: 700 }}>{d.date}</div>
                  <div style={{ color: '#c4b5fd' }}>{money(Number(d.ticketRevenue) || 0, 'MXN')} ingresos</div>
                  <div style={{ color: '#86efac' }}>{money(Number(d.result) || 0, 'MXN')} resultado</div>
                  <div style={{ color: '#67e8f9' }}>{d.carsWashed} carros</div>
                </div>
              )}
              <div
                style={{
                  width: '70%', maxWidth: 22,
                  height: `${(M.get(d) / max) * 100}%`,
                  background: isHover ? M.hi : M.color,
                  borderRadius: '4px 4px 0 0',
                  transition: 'background .15s, height .25s ease',
                }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: sorted.length > 20 ? 4 : 8, marginTop: 6 }}>
        {sorted.map((d, i) => {
          const dayNum = parseInt(d.date.slice(8), 10)
          return (
            <div key={d.date + i} style={{ flex: 1, textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'var(--ink-300)', fontVariantNumeric: 'tabular-nums' }}>
              {(sorted.length <= 14 || dayNum % 2 === 1) ? String(dayNum).padStart(2, '0') : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Kit v3 RpKpi — KPI tile with optional "featured" dark variant for Resultado.
function RpKpi({ label, value, tone, featured }: { label: string; value: ReactNode; tone?: 'good' | 'bad' | 'purple' | 'gray'; featured?: boolean }) {
  const slug = testidSlug(label)
  if (featured) {
    return (
      <div data-testid={`metric-${slug}`} style={{
        borderRadius: 14, padding: '14px 16px',
        background: 'radial-gradient(120% 130% at 100% 0%, rgba(34,197,94,0.22), transparent 55%), linear-gradient(135deg, #0f0820, #1a0f2e 55%, #16281f)',
        color: '#fff',
        boxShadow: '0 14px 30px -16px rgba(15,23,42,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(255,255,255,0.6)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#86efac' }} />{label}
        </div>
        <div data-testid={`metric-${slug}-value`} className="tl2-mono-display" style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>{value}</div>
      </div>
    )
  }
  const dotColor: Record<NonNullable<typeof tone>, string> = {
    good: 'var(--good-500)', bad: 'var(--bad-500)', purple: 'var(--primary-500)', gray: 'var(--ink-300)',
  }
  const bgMap: Partial<Record<NonNullable<typeof tone>, string>> = {
    good: 'linear-gradient(180deg, var(--good-50), #fff 70%)',
    bad: 'linear-gradient(180deg, var(--bad-50), #fff 70%)',
  }
  return (
    <div data-testid={`metric-${slug}`} style={{
      borderRadius: 14, padding: '14px 16px',
      background: (tone && bgMap[tone]) || '#fff',
      border: '1px solid var(--border-soft)',
      boxShadow: 'var(--shadow-xs)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--ink-500)' }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: tone ? dotColor[tone] : 'var(--ink-300)' }} />{label}
      </div>
      <div data-testid={`metric-${slug}-value`} className="tl2-mono-display" style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink-900)' }}>{value}</div>
    </div>
  )
}

// Kit v3 RpStat — bigger stat block used inside Varianza + Histórico.
function RpStat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'good' | 'purple' | 'gray' }) {
  const accent: Record<NonNullable<typeof tone>, string> = { good: 'var(--good-500)', purple: 'var(--primary-500)', gray: 'var(--ink-300)' }
  const bg: Partial<Record<NonNullable<typeof tone>, string>> = {
    good: 'linear-gradient(180deg, var(--good-50), #fff 75%)',
    purple: 'linear-gradient(180deg, var(--primary-50), #fff 75%)',
  }
  return (
    <div style={{ borderRadius: 14, padding: '16px 18px', background: (tone && bg[tone]) || '#fff', border: '1px solid var(--border-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--ink-500)' }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: tone ? accent[tone] : 'var(--ink-300)' }} />{label}
      </div>
      <div className="tl2-mono-display" style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--ink-900)' }}>{value}</div>
    </div>
  )
}

function ReportsScreen() {
  // Kit v3 period presets — 7/14/29 days or "custom" to keep manual date controls.
  const [period, setPeriod] = useState<'7' | '14' | '29' | 'custom'>('29')
  const periodDays = period === '7' ? 7 : period === '14' ? 14 : 29
  const periodFromDefault = (() => {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() - (periodDays - 1))
    return d.toISOString().slice(0, 10)
  })()
  const [from, setFrom] = useState(periodFromDefault)
  const [to, setTo] = useState(today)
  const [metric, setMetric] = useState<RpMetric>('ingresos')

  // Apply preset → recompute from/to. Manual edits flip period to 'custom'.
  const applyPreset = (p: '7' | '14' | '29') => {
    setPeriod(p)
    const n = p === '7' ? 7 : p === '14' ? 14 : 29
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() - (n - 1))
    setFrom(d.toISOString().slice(0, 10))
    setTo(today)
  }

  const [exportType, setExportType] = useState('full')
  const [histFrom, setHistFrom] = useState('2025-01-01')
  const [histTo, setHistTo] = useState(today)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [exportToast, setExportToast] = useState(false)

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
      setExportToast(true)
      setTimeout(() => setExportToast(false), 2200)
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'No se pudo descargar el Excel')
    }
  }

  const periodLabel = period === 'custom'
    ? `${from} → ${to}`
    : period === '29'
      ? `Mes actual · ${periodDays} días`
      : `Últimos ${periodDays} días`

  // Sticky bar sits below the topbar (mobile vs desktop heights ≈ 64).
  return (
    <section className="space-y-4">
      {exportToast && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--ink-900)', color: '#fff',
          padding: '10px 18px', borderRadius: 999,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 12px 28px -10px rgba(15,23,42,0.5)',
        }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: 999, background: 'var(--brand-green)' }}>
            <ICheck size={12} stroke={3} />
          </span>
          Excel ({exportType}) generado · descargando…
        </div>
      )}

      <div className="tl2-page-header">
        <div className="tl2-page-header__left">
          <div className="tl2-page-header__eyebrow">
            <span className="dot" />ANÁLISIS · {from} → {to}
          </div>
          <h1 className="tl2-page-header__title">Reportes</h1>
          <p className="tl2-page-header__subtitle">
            Resumen diario, mensual, varianza de caja e histórico — con exportación a Excel.
          </p>
        </div>
      </div>

      {/* Sticky control bar — period drives chart, KPIs & daily table; one export */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 20,
        borderRadius: 14, border: '1px solid var(--border-soft)',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'var(--shadow-xs)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-400)' }}>
          Periodo
        </span>
        <div style={{ display: 'inline-flex', padding: 3, gap: 2, background: 'var(--ink-100)', borderRadius: 999 }}>
          {(['7', '14', '29'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => applyPreset(k)}
              className="tl2-press"
              style={{
                padding: '6px 14px', borderRadius: 999, border: 0, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                background: period === k ? 'var(--ink-900)' : 'transparent',
                color: period === k ? '#fff' : 'var(--ink-600)',
              }}
            >
              {k === '29' ? 'Mes' : `${k} días`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPeriod('custom')}
            className="tl2-press"
            style={{
              padding: '6px 14px', borderRadius: 999, border: 0, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
              background: period === 'custom' ? 'var(--ink-900)' : 'transparent',
              color: period === 'custom' ? '#fff' : 'var(--ink-600)',
            }}
          >
            Personalizar
          </button>
        </div>
        <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{periodLabel}</span>

        {period === 'custom' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              data-testid="reports-from"
              className="tl-input"
              style={{ height: 32, fontSize: 12, width: 138 }}
            />
            <span style={{ color: 'var(--ink-400)' }}>→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              data-testid="reports-to"
              className="tl-input"
              style={{ height: 32, fontSize: 12, width: 138 }}
            />
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            className="tl-select"
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            style={{ width: 160, height: 34, fontSize: 12.5 }}
          >
            <option value="full">Completo</option>
            <option value="daily">Diario</option>
            <option value="monthly">Mensual</option>
          </select>
          <Button kind="primary" icon={<IReports size={14} />} onClick={downloadExport} testId="reports-export">
            Descargar Excel
          </Button>
        </div>
      </div>
      {downloadError && <ErrorMessage message={downloadError} />}

      {(daily.error || monthly.error || cashVariance.error || performance.error || preview.error) && (
        <ErrorMessage message={(daily.error || monthly.error || cashVariance.error || performance.error || preview.error)!.message} />
      )}

      {/* Kit v3 RpChart — single-series bars with metric toggle */}
      <RpChart days={range?.days ?? []} metric={metric} setMetric={setMetric} />

      {/* 7-col KPI strip — Resultado is the featured dark tile. Collapses to
          2 cols on phones, 4 on tablets so the cards don't squash. */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7" data-testid="reports-range-metrics">
        <RpKpi label="Ingresos"   value={range ? money(range.ticketRevenue, 'MXN') : <span className="tl-metric-skeleton wide" />} tone="good" />
        <RpKpi label="Miscelánea" value={range ? money(range.inventorySalesRevenue, 'MXN') : <span className="tl-metric-skeleton wide" />} tone="gray" />
        <RpKpi label="Paquetes"   value={range ? money(range.prepaidSalesRevenue, 'MXN') : <span className="tl-metric-skeleton wide" />} tone="purple" />
        <RpKpi label="Gastos"     value={range ? money(range.expensesTotal, 'MXN') : <span className="tl-metric-skeleton wide" />} tone="bad" />
        <RpKpi label="Costo inv." value={range ? money(range.inventoryPurchaseCost, 'MXN') : <span className="tl-metric-skeleton wide" />} tone="bad" />
        <RpKpi label="Resultado"  value={range ? money(range.result, 'MXN') : <span className="tl-metric-skeleton wide" />} featured />
        <RpKpi label="Carros"     value={range ? String(range.carsWashed) : <span className="tl-metric-skeleton" />} tone="purple" />
      </div>

      {/* "No afectan el resultado" strip — kit pulls these forward as pills */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 18,
        padding: '10px 16px', borderRadius: 12,
        background: 'var(--ink-50)', border: '1px solid var(--border-soft)',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-400)' }}>
          No afectan el resultado
        </span>
        {[
          ['Retiros', range ? money(range.withdrawalsTotal, 'MXN') : '—', 'retiros'],
          ['Préstamos', range ? money(range.advancesTotal, 'MXN') : '—', 'prestamos'],
          ['Cortesías', range ? String(range.courtesyCount) : '—', 'cortesias'],
          ['Anulados', range ? String(range.voidedCount) : '—', 'anulados'],
        ].map(([k, v, tid]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-600)' }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--ink-300)' }} />
            {k} <b data-testid={`report-pill-${tid}`} className="tl2-mono-display" style={{ color: 'var(--ink-900)' }}>{v}</b>
          </span>
        ))}
      </div>

      {/* 2-col body — daily table + sticky dark period summary sidecar */}
      <div className="grid gap-4 items-start xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Panel title="Resumen por día">
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

        {/* Sticky dark "Resumen del periodo" sidecar — kit v3 */}
        <aside className="xl:sticky xl:top-[130px]">
          <div style={{
            borderRadius: 18, overflow: 'hidden',
            background: 'radial-gradient(120% 120% at 100% 0%, rgba(124,58,237,0.35), transparent 55%), linear-gradient(160deg, #1a0f2e, #0f0820 60%, #16281f)',
            color: '#fff', padding: '20px 22px',
            boxShadow: '0 20px 44px -20px rgba(15,23,42,0.55)',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>
              Resumen del periodo
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
              {[
                ['Periodo', periodLabel.replace(/ · \d+ días?$/, '')],
                ['Carros', range ? String(range.carsWashed) : '—'],
                ['Ingresos', range ? money(range.ticketRevenue, 'MXN') : '—'],
                ['Promedio/día', range && (range.days?.length ?? 0) > 0 ? money(Number(range.ticketRevenue) / range.days.length, 'MXN') : '—'],
                ['Resultado', range ? money(range.result, 'MXN') : '—'],
              ].map(([k, v], i) => (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 0',
                  borderTop: i === 0 ? 0 : '1px dashed rgba(255,255,255,0.12)',
                }}>
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>{k}</span>
                  <span className="tl2-mono-display" style={{
                    fontSize: k === 'Resultado' ? 16 : 14,
                    fontWeight: 800,
                    color: k === 'Resultado' ? (range && Number(range.result) < 0 ? '#fda4af' : '#86efac') : '#fff',
                  }}>{v}</span>
                </div>
              ))}
            </div>
            {monthly.data && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
                  Mes en curso · {monthly.data.year}-{String(monthly.data.month).padStart(2, '0')}
                </div>
                <div className="tl2-mono-display" style={{ marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                  {monthly.data.carsWashed} carros · {money(monthly.data.ticketRevenue, 'MXN')}
                </div>
                <div className="tl2-mono-display" style={{ marginTop: 4, fontSize: 12.5, color: '#86efac' }}>
                  Resultado {money(monthly.data.result, 'MXN')}
                </div>
              </div>
            )}
          </div>
          {preview.data && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-soft)', background: '#fff', fontSize: 11.5, color: 'var(--ink-500)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-400)', marginBottom: 4 }}>
                Excel preview ({exportType})
              </div>
              {preview.data.ticketCount} tickets · {preview.data.shiftCloseCount} cortes · {preview.data.inventoryMovementCount} movimientos · {preview.data.payrollPeriodCount} nómina
            </div>
          )}
        </aside>
      </div>

      {/* Histórico — Card with date inputs + 4 RpStat + monthly table */}
      <Panel title="Histórico · Excel 2025 + 2026">
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <RpStat label="Días"     value={historical.data ? historical.data.totalDays.toLocaleString('es-MX') : <span className="tl-metric-skeleton" />} tone="gray" />
            <RpStat label="Carros"   value={historical.data ? historical.data.totalCars.toLocaleString('es-MX') : <span className="tl-metric-skeleton" />} tone="gray" />
            <RpStat label="Ingresos" value={historical.data ? money(historical.data.totalRevenue, 'MXN') : <span className="tl-metric-skeleton wide" />} tone="good" />
            <RpStat label="Resultado" value={historical.data ? money(historical.data.totalResultado, 'MXN') : <span className="tl-metric-skeleton wide" />} tone="purple" />
          </div>

          <div className="overflow-hidden rounded-xl border border-border-soft">
            <table className="tl-tbl zebra">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="r">Carros</th>
                  <th className="r">Ingresos</th>
                  <th className="r">Gastos</th>
                  <th className="r">Resultado</th>
                  <th>Fuente</th>
                </tr>
              </thead>
              <tbody>
                {groupByMonth(historical.data?.days ?? []).map((row) => (
                  <tr key={row.month}>
                    <td className="font-medium">{row.month}</td>
                    <td className="r tnum">{row.cars}</td>
                    <td className="r tnum">{money(row.revenue, 'MXN')}</td>
                    <td className="r tnum" style={{ color: 'var(--bad-700)' }}>{money(row.expenses, 'MXN')}</td>
                    <td className={`r tnum ${row.resultado >= 0 ? 'tl-money-good' : 'tl-money-bad'}`} style={{ fontWeight: 700 }}>{money(row.resultado, 'MXN')}</td>
                    <td>
                      <Pill tone={Array.from(row.sources).some((s) => s.includes('EXCEL') || s.includes('2025')) ? 'gray' : 'good'}>
                        {Array.from(row.sources).join(', ')}
                      </Pill>
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

// Stock thresholds — backend stores per-product `min_stock` + `crit_stock`
// (V58). Products with NULL values fall back to these globals so the legacy
// behavior (everything at 5/2.5) is preserved until the operator edits them.
const INV_MIN_STOCK_DEFAULT = 5
const INV_CRIT_STOCK_DEFAULT = 2.5

function productThresholds(product: Product): { min: number; crit: number } {
  const min = product.minStock != null ? Number(product.minStock) : INV_MIN_STOCK_DEFAULT
  // Crit defaults to min / 2 when the operator only set a min — feels more
  // useful than falling back to 2.5 when the min was already customized.
  const critRaw = product.critStock != null ? Number(product.critStock) : min / 2
  const crit = Math.min(critRaw, min)
  return { min, crit }
}

function inventoryTone(quantity: number, min: number, crit: number): 'crit' | 'low' | 'ok' {
  if (quantity <= crit) return 'crit'
  if (quantity <= min) return 'low'
  return 'ok'
}

function InventoryStockBar({ quantity, min, crit }: { quantity: number; min: number; crit: number }) {
  const range = Math.max(quantity, min * 3, 1)
  const pct = Math.max(0, Math.min(1, quantity / range))
  const minPct = min / range
  const tone = inventoryTone(quantity, min, crit)
  return (
    <div>
      <div className="tl2-stock">
        <div
          className={`tl2-stock__fill ${tone === 'crit' ? 'crit' : tone === 'low' ? 'low' : ''}`}
          style={{ width: `${pct * 100}%` }}
        >
          {pct > 0.18 && <span>{quantity.toFixed(0)}</span>}
        </div>
        <div className="tl2-stock__min" style={{ left: `calc(${minPct * 100}% - 1px)` }} />
      </div>
      <div className="tl2-stock__legend">
        <span>0</span>
        <span>{Math.round(range)}</span>
      </div>
    </div>
  )
}

function InventoryCardV2({
  row, onEdit, onSale, onPurchase, onAdjustment,
}: {
  row: ProductSnapshot
  onEdit: () => void
  onSale: () => void
  onPurchase: () => void
  onAdjustment: () => void
}) {
  const { min, crit } = productThresholds(row.product)
  const tone = row.product.trackInventory ? inventoryTone(row.quantityOnHand, min, crit) : 'ok'
  const latest = row.recentMovements[0]
  const lastDir = latest && (latest.movementType === 'PURCHASE' || (latest.quantity > 0 && latest.movementType === 'ADJUSTMENT')) ? 'in' : 'out'
  return (
    <div className={`tl2-inv-card ${tone === 'crit' ? 'crit' : tone === 'low' ? 'low' : ''}`}>
      <div className="tl2-inv-card__head">
        <div className="min-w-0 flex-1">
          <div className="nm">{row.product.name}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="sku">{row.product.sku || '—'}</span>
            {tone === 'crit' && <Pill tone="bad">Crítico</Pill>}
            {tone === 'low' && <Pill tone="warn">Bajo</Pill>}
          </div>
        </div>
        <div className="tl2-inv-card__price">
          <span className="cur">$</span>
          <span className="v">{row.product.currentUnitPrice.toFixed(0)}</span>
        </div>
      </div>
      {row.product.trackInventory ? (
        <InventoryStockBar quantity={row.quantityOnHand} min={min} crit={crit} />
      ) : (
        <p className="rounded-md bg-ink-50 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
          Sin seguimiento de stock
        </p>
      )}
      <div className="tl2-inv-card__foot">
        <div className="tl2-inv-card__last">
          {latest ? (
            <>
              <span className={`arrow ${lastDir === 'out' ? 'out' : ''}`}>{lastDir === 'in' ? '↑' : '↓'}</span>
              <span>{Math.abs(latest.quantity).toFixed(0)} · {movementLabel(latest.movementType)}</span>
            </>
          ) : (
            <span>Sin movimientos</span>
          )}
        </div>
        <div className="tl2-inv-card__actions">
          <button type="button" className="tl2-inv-card__btn t-good" title="Compra (+)" onClick={onPurchase}>+</button>
          <button type="button" className="tl2-inv-card__btn t-info" title="Venta (−)" onClick={onSale}>−</button>
          <button type="button" className="tl2-inv-card__btn" title="Ajuste" onClick={onAdjustment}>⋯</button>
          <button type="button" className="tl2-inv-card__btn" title="Editar producto" onClick={onEdit}>✎</button>
        </div>
      </div>
    </div>
  )
}

function InventoryCategoryHeader({
  name, sub, count, mono, gradient,
}: { name: string; sub: string; count: number; mono: string; gradient: string }) {
  return (
    <div className="tl2-inv-cat">
      <div className="tl2-inv-cat__mono" style={{ background: gradient }}>{mono}</div>
      <div>
        <div className="tl2-inv-cat__name">{name}</div>
        <div className="tl2-inv-cat__sub">{sub}</div>
      </div>
      <div className="tl2-inv-cat__sep" />
      <div className="tl2-inv-cat__count">{count} SKU</div>
    </div>
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
  const totalUnits = rows.reduce((sum, row) => sum + row.quantityOnHand, 0)
  const trackedRows = rows.filter((row) => row.product.trackInventory)
  const lowRows = trackedRows.filter((row) => {
    const { min } = productThresholds(row.product)
    return row.quantityOnHand <= min
  })
  const critRows = trackedRows.filter((row) => {
    const { crit } = productThresholds(row.product)
    return row.quantityOnHand <= crit
  })
  const totalProducts = products.data?.length ?? 0

  const recentMovements = rows
    .flatMap((row) =>
      row.recentMovements.map((m) => ({ ...m, productName: m.productName || row.product.name }))
    )
    .sort((a, b) => b.movementDate.localeCompare(a.movementDate))
    .slice(0, 15)

  return (
    <section className="space-y-5">
      <PageHeaderV2
        eyebrow={`STOCK VIVO · ${new Date().toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()}`}
        eyebrowDot
        title="Inventario"
        subtitle={`Misceláneas, snacks y aromas. La línea oscura en cada barra marca el mínimo por producto (por defecto ${INV_MIN_STOCK_DEFAULT} unidades; cámbialo en Editar producto).`}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button kind="primary" icon={<IPlus size={14} />} onClick={() => setModal('product')}>Producto</Button>
            <Button kind="secondary" onClick={() => setModal('sale')}>Venta</Button>
            <Button kind="secondary" onClick={() => setModal('purchase')}>Compra</Button>
            <Button kind="secondary" onClick={() => setModal('adjustment')}>Ajuste</Button>
          </div>
        }
      />

      {(products.error || snapshot.error) && <ErrorMessage message={(products.error || snapshot.error)!.message} />}

      {lowRows.length > 0 && (
        <div className="tl2-inv-alert">
          <div className="tl2-inv-alert__icon">!</div>
          <div style={{ position: 'relative' }}>
            <div className="tl2-inv-alert__title">
              {lowRows.length} producto{lowRows.length === 1 ? '' : 's'} requiere{lowRows.length === 1 ? '' : 'n'} compra
            </div>
            <div className="tl2-inv-alert__sub">
              {critRows.length > 0 ? `${critRows.length} en estado crítico · ` : ''}
              Considera reabastecer antes del próximo turno.
            </div>
            <div className="tl2-inv-alert__items">
              {lowRows.slice(0, 8).map((row) => {
                const { min } = productThresholds(row.product)
                return (
                  <span key={row.product.id} className="tl2-inv-alert__chip">
                    {row.product.name} <span className="v">· {row.quantityOnHand.toFixed(0)}/{min}</span>
                  </span>
                )
              })}
              {lowRows.length > 8 && (
                <span className="tl2-inv-alert__chip">+{lowRows.length - 8} más</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModal('purchase')}
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.30)', color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
          >
            Registrar compra →
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiV2
          label="Productos activos"
          value={String(totalProducts)}
          tone="info"
          sub={`${totalUnits.toFixed(0)} unidades en piso`}
        />
        <KpiV2
          label="Valor estimado"
          value={money(totalValue, 'MXN')}
          tone="good"
          sub="precio × stock"
        />
        <KpiV2
          label="Stock bajo"
          value={String(lowRows.length)}
          tone={lowRows.length > 0 ? 'warn' : 'good'}
          sub={lowRows.length ? 'al o bajo mínimo' : 'todo en orden'}
        />
        <KpiV2
          label="Crítico"
          value={String(critRows.length)}
          tone={critRows.length > 0 ? 'bad' : 'good'}
          sub={critRows.length ? 'requiere compra hoy' : 'sin urgencias'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px] xl:items-start">
        <div className="space-y-3.5">
          {(['AROMA', 'SNACK', 'OTRO'] as ProductCategory[]).map((cat) => {
            const catRows = rows.filter((row) => (row.product.category ?? 'OTRO') === cat)
            if (catRows.length === 0) return null
            const meta = cat === 'AROMA'
              ? { name: 'Aromas', sub: 'Esencias para vehículo', mono: 'A', gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }
              : cat === 'SNACK'
              ? { name: 'Snacks', sub: 'Misceláneos de mostrador', mono: 'S', gradient: 'linear-gradient(135deg, #fbbf24, #d97706)' }
              : { name: 'Otros', sub: 'Equipamiento y consumibles', mono: 'O', gradient: 'linear-gradient(135deg, #34d399, #059669)' }
            return (
              <div key={cat}>
                <InventoryCategoryHeader name={meta.name} sub={meta.sub} count={catRows.length} mono={meta.mono} gradient={meta.gradient} />
                <div className="tl2-inv-grid">
                  {catRows.map((row) => (
                    <InventoryCardV2
                      key={row.product.id}
                      row={row}
                      onEdit={() => {
                        setEditingProduct(row.product)
                        setModal('product')
                      }}
                      onSale={() => setModal('sale')}
                      onPurchase={() => setModal('purchase')}
                      onAdjustment={() => setModal('adjustment')}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <aside className="space-y-3.5 xl:sticky xl:top-4">
          <div className="overflow-hidden rounded-2xl border border-border-soft bg-white shadow-xs">
            <div className="border-b border-border-soft bg-ink-900 px-4 py-3 text-white">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/60">Movimientos recientes</p>
              <p className="mt-0.5 text-[13px] font-semibold">Entradas y salidas</p>
            </div>
            {recentMovements.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-ink-400">Sin movimientos todavía.</p>
            ) : (
              <div className="tl2-mov">
                {recentMovements.map((m) => {
                  const isIn = m.movementType === 'PURCHASE' || (m.movementType === 'ADJUSTMENT' && m.quantity > 0)
                  const time = (() => {
                    try {
                      return new Date(m.movementDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
                    } catch { return '--:--' }
                  })()
                  return (
                    <div key={m.id} className="tl2-mov__row">
                      <div className="tl2-mov__t">{time}</div>
                      <div className="tl2-mov__body">
                        <div className="nm">{m.productName}</div>
                        <div className="sub">{movementLabel(m.movementType)}{m.employeeName ? ` · ${m.employeeName}` : ''}</div>
                      </div>
                      <div className={`tl2-mov__qty ${isIn ? 'in' : 'out'}`}>
                        {isIn ? '+' : '−'}{Math.abs(m.quantity).toFixed(0)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <CardV2 tone="amber" title="Ver inventario hasta" subtitle="Si lo dejas vacío, usa la hora actual.">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-600">Fecha y hora</span>
              <input
                type="datetime-local"
                value={asOf}
                onChange={(event) => setAsOf(event.target.value)}
                className="tl-input w-full"
              />
            </label>
            {asOf && (
              <p className="mt-2 text-[10.5px] text-amber-700/80">
                Mostrando snapshot histórico.
              </p>
            )}
          </CardV2>
        </aside>
      </div>

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
          minStock: product.minStock ?? '',
          critStock: product.critStock ?? '',
        }
      : { name: '', sku: '', currentUnitPrice: 0, trackInventory: true, active: true, category: 'OTRO', minStock: '', critStock: '' },
  })
  const tracking = form.watch('trackInventory')
  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      // Empty string → null on the wire, so the backend stores NULL and the
      // operator's "use default" intent round-trips cleanly. On update, a -1
      // sentinel could explicitly clear — but here empty/null is enough.
      const minStock = values.minStock === '' || values.minStock == null ? null : Number(values.minStock)
      const critStock = values.critStock === '' || values.critStock == null ? null : Number(values.critStock)
      return api<Product>(product ? `/api/v1/products/${product.id}` : '/api/v1/products', {
        method: product ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: values.name.trim(),
          sku: values.sku?.trim() || undefined,
          currentUnitPrice: Number(values.currentUnitPrice),
          trackInventory: values.trackInventory,
          active: values.active,
          category: values.category,
          minStock,
          critStock,
        }),
      })
    },
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

        {/* Niveles de stock — per-product low/critical alert thresholds.
            Only useful when the product tracks inventory; if not tracking, the
            inputs are disabled with a hint. */}
        <fieldset
          className="rounded-xl border border-border-soft px-3 py-3"
          style={{ background: 'linear-gradient(180deg, rgba(254,243,199,0.18), #fff 70%)' }}
        >
          <legend className="px-1 text-[10.5px] font-bold uppercase tracking-[0.10em] text-amber-700">
            Niveles de alerta
          </legend>
          <p className="text-[11.5px] text-ink-500 mb-2">
            Cuando el stock baja del nivel <b>mínimo</b> aparece como <b className="text-amber-700">Bajo</b>; si baja del <b>crítico</b> pasa a <b className="text-rose-700">Crítico</b> en el dashboard. Deja en blanco para usar el valor general ({INV_MIN_STOCK_DEFAULT} mín, {INV_CRIT_STOCK_DEFAULT} crít).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Mínimo" error={form.formState.errors.minStock?.message}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                disabled={!tracking}
                placeholder={String(INV_MIN_STOCK_DEFAULT)}
                {...form.register('minStock')}
              />
            </TextField>
            <TextField label="Crítico" error={form.formState.errors.critStock?.message}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                disabled={!tracking}
                placeholder={String(INV_CRIT_STOCK_DEFAULT)}
                {...form.register('critStock')}
              />
            </TextField>
          </div>
          {!tracking && (
            <p className="mt-2 text-[10.5px] text-ink-400 italic">
              Activa "Controlar inventario" para usar niveles personalizados.
            </p>
          )}
        </fieldset>

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

const NM_DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const NM_PALETTE = ['#7c3aed', '#059669', '#dc2626', '#d97706', '#1d4ed8', '#0891b2']
const NM_REASONS_ADD = ['Bono', 'Puntualidad', 'Día extra', 'Propina']
const NM_REASONS_SUB = ['Falta', 'Vale', 'Permiso', 'Material']

function nmTone(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return NM_PALETTE[Math.abs(h) % NM_PALETTE.length]
}
function nmInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}
function nmCars(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}
function nmAddDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
function nmFmtDay(iso: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`))
}

function PayrollScreen() {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [weekIdx, setWeekIdx] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [paidLocal, setPaidLocal] = useState<Set<number>>(() => new Set())
  const [debtTarget, setDebtTarget] = useState<{ employeeId: number; employeeName: string; balance: number } | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(null), 2200) }

  const periodsQuery = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: () => api<PayrollPeriod[]>('/api/v1/payroll/periods'),
  })
  const periods = useMemo(
    () => [...(periodsQuery.data ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [periodsQuery.data],
  )
  const weekCount = periods.length
  const clampedIdx = weekCount ? Math.min(weekIdx, weekCount - 1) : 0
  const periodSummary = periods[clampedIdx] ?? null
  const selectedId = periodSummary?.id ?? null

  const periodQuery = useQuery({
    queryKey: ['payroll-period', selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => api<PayrollPeriod>(`/api/v1/payroll/periods/${selectedId}`),
  })
  const period = periodQuery.data
  const locked = period?.status === 'LOCKED'
  const entries = period?.entries ?? []

  const employeesQuery = useQuery({
    queryKey: ['payroll-employees'],
    queryFn: () => api<Employee[]>('/api/v1/employees?active=true'),
  })
  const employeeById = useMemo(() => {
    const map = new Map<number, Employee>()
    for (const e of employeesQuery.data ?? []) map.set(e.id, e)
    return map
  }, [employeesQuery.data])

  const debtQueries = useQueries({
    queries: entries.map((e) => ({
      queryKey: ['debt-balance', e.employeeId],
      queryFn: () => api<DebtBalance>(`/api/v1/payroll/employees/${e.employeeId}/debt-balance`),
    })),
  })
  const debtByEmployee = new Map<number, number>()
  entries.forEach((e, i) => {
    const bal = debtQueries[i]?.data?.balance
    if (typeof bal === 'number') debtByEmployee.set(e.employeeId, bal)
  })

  // Ephemeral pay check-offs are per-week; reset when the week changes.
  useEffect(() => { setPaidLocal(new Set()) }, [selectedId])

  const compute = useMutation({
    mutationFn: () => api<PayrollPeriod>(`/api/v1/payroll/periods/${selectedId}/compute`, { method: 'POST' }),
    onSuccess: async () => { await invalidatePayroll(queryClient) },
  })
  const lock = useMutation({
    mutationFn: () => api<PayrollPeriod>(`/api/v1/payroll/periods/${selectedId}/lock`, { method: 'POST' }),
    onSuccess: async () => { await invalidatePayroll(queryClient) },
  })
  const unlock = useMutation({
    mutationFn: (reason: string) => api<PayrollPeriod>(`/api/v1/corrections/payroll-periods/${selectedId}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
    onSuccess: async () => { await invalidatePayroll(queryClient); flash('Semana reabierta') },
  })
  const createPeriod = useMutation({
    mutationFn: (startDate: string) => api<PayrollPeriod>('/api/v1/payroll/periods', {
      method: 'POST',
      body: JSON.stringify({ startDate }),
    }),
    onSuccess: async () => {
      setWeekIdx(0)
      await queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
      flash('Semana creada')
    },
  })
  const addAdjustment = useMutation({
    mutationFn: (values: { employeeId: number; type: PayrollAdjustmentType; concept: string; amount: number; note?: string }) =>
      api<PayrollAdjustment>(`/api/v1/payroll/periods/${selectedId}/adjustments`, {
        method: 'POST',
        body: JSON.stringify({ ...values, note: values.note || undefined }),
      }),
    onSuccess: async () => { await invalidatePayroll(queryClient); if (!locked) await compute.mutateAsync(); flash('Ajuste guardado') },
  })
  const deleteAdjustment = useMutation({
    mutationFn: (id: number) => api<void>(`/api/v1/payroll/adjustments/${id}`, { method: 'DELETE' }),
    onSuccess: async () => { await invalidatePayroll(queryClient); if (!locked) await compute.mutateAsync(); flash('Ajuste eliminado') },
  })
  const recordDebtPayment = useMutation({
    mutationFn: () => {
      if (!debtTarget) throw new Error('No employee selected')
      const amount = Number(paymentAmount)
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Monto invalido')
      return api(`/api/v1/payroll/employees/${debtTarget.employeeId}/debt-payments`, {
        method: 'POST',
        body: JSON.stringify({ paymentDate: today, amount, note: paymentNote.trim() || undefined }),
      })
    },
    onSuccess: async () => {
      setDebtTarget(null)
      setPaymentAmount('')
      setPaymentNote('')
      await queryClient.invalidateQueries({ queryKey: ['debt-balance'] })
      await invalidatePayroll(queryClient)
      flash('Pago registrado')
    },
  })

  // Auto-compute an OPEN period so the week's totals appear immediately.
  useEffect(() => {
    if (period?.status === 'OPEN' && !compute.isPending) compute.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period?.id, period?.status])

  const totalNet = entries.reduce((s, e) => s + e.netPay, 0)
  const totalCars = entries.reduce((s, e) => s + e.carsWashed, 0)
  const paidCount = locked ? entries.length : entries.filter((e) => paidLocal.has(e.employeeId)).length
  const paidAmount = locked ? totalNet : entries.filter((e) => paidLocal.has(e.employeeId)).reduce((s, e) => s + e.netPay, 0)
  const allPaid = entries.length > 0 && paidCount === entries.length

  const currentWeekStart = previousSunday(today)
  const hasCurrentWeek = periods.some((p) => p.startDate === currentWeekStart)

  const togglePaid = (employeeId: number) => setPaidLocal((prev) => {
    const next = new Set(prev)
    if (next.has(employeeId)) next.delete(employeeId)
    else next.add(employeeId)
    return next
  })
  const markAllPaid = () => setPaidLocal(new Set(entries.map((e) => e.employeeId)))

  const closeWeek = async () => {
    if (!selectedId) return
    if (!window.confirm('Cerrar la semana y registrar los pagos? Ya no se podrá editar.')) return
    try {
      if (period?.status === 'OPEN') await compute.mutateAsync()
      await lock.mutateAsync()
      markAllPaid()
      flash('Semana cerrada y pagos registrados')
    } catch {
      /* mutation error is surfaced via mutationError below */
    }
  }

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
      link.download = `nomina-${period?.startDate ?? selectedId}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'No se pudo descargar la nomina')
    }
  }

  const mutationError = compute.error || lock.error || unlock.error || addAdjustment.error || deleteAdjustment.error || createPeriod.error

  return (
    <div className="nm-wrap">
      {toast && <Toast message={toast} />}

      <PageHead
        title="Nómina"
        subtitle="Pago semanal de los lavadores · domingo a sábado"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {weekCount > 0 && (
              <div className="nm-week">
                <button onClick={() => setWeekIdx(() => Math.min(weekCount - 1, clampedIdx + 1))} disabled={clampedIdx >= weekCount - 1} title="Semana anterior" aria-label="Semana anterior">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div className="nm-week__label">
                  <div className="r">{periodSummary ? `${nmFmtDay(periodSummary.startDate)} – ${nmFmtDay(periodSummary.endDate)}` : '—'}</div>
                  <div className="s">{locked ? 'Cerrada' : 'En curso'}</div>
                </div>
                <button onClick={() => setWeekIdx(() => Math.max(0, clampedIdx - 1))} disabled={clampedIdx <= 0} title="Semana siguiente" aria-label="Semana siguiente">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            )}
            {!hasCurrentWeek && (
              <Button kind="secondary" icon={<IPlus size={16} />} disabled={createPeriod.isPending} onClick={() => createPeriod.mutate(currentWeekStart)}>
                Crear semana actual
              </Button>
            )}
            <Button kind="secondary" icon={<IReports size={16} />} disabled={!selectedId} testId="payroll-export" onClick={() => void downloadPayrollExport()}>Exportar</Button>
          </div>
        }
      />

      {mutationError && <ErrorMessage message={mutationError.message} />}
      {downloadError && <ErrorMessage message={downloadError} />}

      {weekCount === 0 ? (
        <EmptyState
          icon={<IPayroll size={20} />}
          title="Sin semanas de nómina"
          description="Crea la semana actual para calcular el pago de los lavadores."
          tone="info"
          cta={<Button kind="primary" icon={<IPlus size={16} />} disabled={createPeriod.isPending} onClick={() => createPeriod.mutate(currentWeekStart)}>Crear semana actual</Button>}
        />
      ) : (
        <>
          <div className="nm-summary">
            <div className="nm-summary__main">
              <div className="nm-summary__eyebrow"><ICalendar size={13} /> {locked ? 'Nómina cerrada' : 'Total de la semana'}</div>
              <div className="nm-summary__big">
                <span className="cur">$</span>
                <span className="num">{Math.round(totalNet).toLocaleString('es-MX')}</span>
              </div>
              <div className="nm-summary__sub">
                {locked
                  ? `${entries.length} lavadores pagados${periodSummary ? ` · ${nmFmtDay(periodSummary.startDate)} – ${nmFmtDay(periodSummary.endDate)}` : ''}`
                  : `${entries.length} lavadores · paga cuando cierres la semana`}
              </div>
            </div>
            <div className="nm-summary__stats">
              <div className="nm-summary__stat"><div className="v">{nmCars(totalCars)}</div><div className="k">Carros</div></div>
              <div className="nm-summary__stat"><div className="v">{entries.length}</div><div className="k">Lavadores</div></div>
              <div className="nm-summary__stat"><div className="v">{paidCount}/{entries.length}</div><div className="k">Pagados</div></div>
            </div>
          </div>

          <div className="nm-hint">
            <span className="ic"><IInfo size={17} /></span>
            <span>Los pagos se calculan solos con la <b>comisión y el sueldo</b> de cada lavador. Tú solo capturas faltas, vales y bonos de la semana.</span>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/catalogos') }}><ICatalog size={13} /> Abrir Catálogos</a>
          </div>

          {periodQuery.isLoading ? (
            <p className="text-sm text-ink-400">Cargando semana…</p>
          ) : entries.length === 0 ? (
            <EmptyState icon={<IPayroll size={20} />} title="Sin lavadores en esta semana" description="No hay tickets ni lavadores registrados para calcular." tone="info" />
          ) : (
            <div className="pr-roster">
              <div className="pr-roster__head">
                <div>Lavador</div>
                <div className="c-cars">Carros</div>
                <div>Cálculo de la semana</div>
                <div className="c-neto">Neto</div>
              </div>
              {entries.map((entry) => (
                <PayrollRow
                  key={entry.id}
                  entry={entry}
                  employee={employeeById.get(entry.employeeId)}
                  periodStartDate={period!.startDate}
                  adjustments={(period?.adjustments ?? []).filter((a) => a.employeeId === entry.employeeId)}
                  days={(period?.days ?? []).filter((d) => d.employeeId === entry.employeeId)}
                  debtBalance={debtByEmployee.get(entry.employeeId)}
                  paid={locked || paidLocal.has(entry.employeeId)}
                  locked={locked}
                  busy={addAdjustment.isPending || deleteAdjustment.isPending || compute.isPending}
                  onTogglePaid={() => togglePaid(entry.employeeId)}
                  onAddAdjustment={(a) => addAdjustment.mutate({ employeeId: entry.employeeId, ...a })}
                  onDeleteAdjustment={(id) => deleteAdjustment.mutate(id)}
                  onPayDebt={() => {
                    const bal = debtByEmployee.get(entry.employeeId) ?? 0
                    setDebtTarget({ employeeId: entry.employeeId, employeeName: entry.employeeName, balance: bal })
                    setPaymentAmount(String(bal))
                    setPaymentNote('')
                  }}
                />
              ))}
            </div>
          )}

          {!locked && entries.length > 0 && (
            <div className="nm-paybar">
              <span className="nm-paybar__txt">
                <b>{paidCount}</b> de <b>{entries.length}</b> pagados · faltan <b>{money(totalNet - paidAmount, 'MXN')}</b>
              </span>
              <span className="nm-paybar__prog"><i style={{ width: `${entries.length ? (paidCount / entries.length) * 100 : 0}%` }} /></span>
              <div className="nm-paybar__btns">
                {!allPaid && <button className="nm-paybar__ghost" onClick={markAllPaid}><ICheck size={15} /> Marcar todos</button>}
                <button className="nm-paybar__close" onClick={() => void closeWeek()} disabled={compute.isPending || lock.isPending} data-testid="payroll-close-week">
                  <ILock size={15} /> Cerrar semana
                </button>
              </div>
            </div>
          )}

          {locked && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '6px 0 4px' }}>
              <span className="nm-closed" style={{ fontSize: 13, padding: '8px 16px' }}>
                <ILock size={14} /> Esta semana ya está cerrada y pagada
              </span>
              {hasRole('DUENO') && (
                <ReasonAction
                  kind="ghost"
                  size="sm"
                  pending={unlock.isPending}
                  label="Reabrir"
                  pendingLabel="Reabriendo…"
                  title="Reabrir nómina cerrada"
                  prompt="Vas a reabrir una semana de nómina que ya estaba cerrada y pagada. La acción queda registrada en la bitácora."
                  confirmLabel="Reabrir nómina"
                  onConfirm={(reason) => unlock.mutate(reason)}
                />
              )}
            </div>
          )}
        </>
      )}

      {debtTarget && (
        <Modal title={`Pago de deuda — ${debtTarget.employeeName}`} narrow onClose={() => { if (!recordDebtPayment.isPending) setDebtTarget(null) }}>
          <div className="p-6 space-y-4">
            <p className="text-sm text-ink-600">Saldo actual: <span className="font-semibold">{money(debtTarget.balance, 'MXN')}</span></p>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-700">Monto a pagar ($)</span>
              <input type="number" inputMode="decimal" min="0.01" step="0.01" className="w-full" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder={String(debtTarget.balance)} autoFocus />
              <span className="mt-1 block text-[11px] text-ink-400">Fecha: {today} · El monto se suma al fondo de caja.</span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-700">Nota (opcional)</span>
              <input type="text" className="w-full" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Ej. Devolvió en efectivo el viernes" maxLength={500} />
            </label>
            {recordDebtPayment.error && <p className="text-sm text-red-600">{recordDebtPayment.error.message}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button kind="ghost" onClick={() => setDebtTarget(null)} disabled={recordDebtPayment.isPending}>Cancelar</Button>
              <Button kind="primary" onClick={() => recordDebtPayment.mutate()} disabled={!paymentAmount || Number(paymentAmount) <= 0 || recordDebtPayment.isPending}>
                {recordDebtPayment.isPending ? 'Guardando...' : 'Guardar pago'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/** Inline ledger chip — kit v4 PayrollRow uses these instead of stacked rows. */
function LedgerChip({
  label,
  value,
  tone,
  onDel,
  title,
}: {
  label: ReactNode
  value: ReactNode
  tone?: 'good' | 'bad'
  onDel?: () => void
  title?: string
}) {
  return (
    <span className={`pr-chip${tone ? ` ${tone}` : ''}`} title={title}>
      <span className="lbl">{label}</span>
      <span className="v">{value}</span>
      {onDel && (
        <button type="button" className="pr-chip__del" onClick={onDel} title="Quitar" aria-label="Quitar">
          <IX size={10} />
        </button>
      )}
    </span>
  )
}

/**
 * PayrollRow — kit-faithful tabular row inside the roster Panel.
 *
 * 4-col grid: Lavador / Carros / Cálculo de la semana (inline ledger chips) /
 * Neto + pay toggle. Below the row: optional QuickAdjust panel, debt strip,
 * "VER DÍAS" toggle with compact 7-col day grid.
 */
function PayrollRow({
  entry,
  employee,
  periodStartDate,
  adjustments,
  days,
  debtBalance,
  paid,
  locked,
  busy,
  onTogglePaid,
  onAddAdjustment,
  onDeleteAdjustment,
  onPayDebt,
}: {
  entry: PayrollEntry
  employee?: Employee
  periodStartDate: string
  adjustments: PayrollAdjustment[]
  days: PayrollDay[]
  debtBalance?: number
  paid: boolean
  locked: boolean
  busy: boolean
  onTogglePaid: () => void
  onAddAdjustment: (a: { type: PayrollAdjustmentType; concept: string; amount: number; note?: string }) => void
  onDeleteAdjustment: (id: number) => void
  onPayDebt: () => void
}) {
  const [adjusting, setAdjusting] = useState<PayrollAdjustmentType | null>(null)
  const [showDays, setShowDays] = useState(false)

  const isComm = employee ? employee.payrollType === 'COMMISSION' : entry.commissions > 0 || entry.baseSalary === 0
  const venta = days.reduce((s, d) => s + d.ticketRevenue, 0)
  const baseSalaryNet = entry.baseSalary + entry.restDayPay - entry.absenceDeduction
  const tone = nmTone(entry.employeeName)

  return (
    <div className={`pr-row${paid ? ' paid' : ''}`}>
      <div className="pr-row__grid">
        {/* — Identity */}
        <div className="pr-id">
          <span className="pr-id__av" style={{ background: tone }}>{nmInitials(entry.employeeName)}</span>
          <div className="pr-id__body">
            <div className="pr-id__name">
              <span>{entry.employeeName}</span>
              {paid && (
                <span className="pr-id__paid">
                  <ICheck size={10} stroke={3} />PAGADO
                </span>
              )}
            </div>
            <div className="pr-id__rule">
              <span className="pay">
                <ICash size={11} />
                {isComm
                  ? <>{employee ? `${employee.commissionRate}% ` : ''}comisión</>
                  : <>{money(employee ? employee.baseWeeklySalary : baseSalaryNet, 'MXN')} base</>}
              </span>
              {employee?.primaryShift && (
                <>
                  <span className="sep">·</span>
                  <span>{employee.primaryShift === 'MATUTINO' ? 'Matutino' : 'Vespertino'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* — Carros */}
        <div className="pr-cars">
          <div className="pr-cars__num">
            <ICar size={16} />{nmCars(entry.carsWashed)}
          </div>
          <div className="pr-cars__lbl">carros</div>
        </div>

        {/* — Inline ledger chips */}
        <div className="pr-ledger">
          {isComm ? (
            <LedgerChip
              label="Comisión"
              value={money(entry.commissions, 'MXN')}
              title={`${employee ? `${employee.commissionRate}% ` : ''}de ${money(venta, 'MXN')} en ventas`}
            />
          ) : (
            <LedgerChip
              label="Base"
              value={money(baseSalaryNet, 'MXN')}
              title="Sueldo base semanal"
            />
          )}
          {!isComm && entry.carsBonus > 0 && (
            <LedgerChip
              label="Bono carros"
              value={`+${money(entry.carsBonus, 'MXN')}`}
              tone="good"
              title="Bono por carros lavados"
            />
          )}
          {adjustments.map((a) => (
            <LedgerChip
              key={a.id}
              label={a.concept}
              value={`${a.type === 'EARNING' ? '+' : '−'}${money(a.amount, 'MXN')}`}
              tone={a.type === 'EARNING' ? 'good' : 'bad'}
              title={a.note ? `${a.concept}: ${a.note}` : a.concept}
              onDel={!locked && !busy ? () => onDeleteAdjustment(a.id) : undefined}
            />
          ))}
          {entry.advancesDeducted > 0 && (
            <LedgerChip
              label="Vale"
              value={`−${money(entry.advancesDeducted, 'MXN')}`}
              tone="bad"
              title="Abono al vale del lavador"
            />
          )}
          {!locked && (
            <div className="pr-trigger">
              <button
                type="button"
                className={`add${adjusting === 'EARNING' ? ' on' : ''}`}
                onClick={() => setAdjusting((t) => (t === 'EARNING' ? null : 'EARNING'))}
                title="Extra / bono"
                aria-label="Agregar extra o bono"
              >
                <IPlus size={13} stroke={2.4} />
              </button>
              <button
                type="button"
                className={`sub${adjusting === 'DEDUCTION' ? ' on' : ''}`}
                onClick={() => setAdjusting((t) => (t === 'DEDUCTION' ? null : 'DEDUCTION'))}
                title="Falta / vale"
                aria-label="Agregar falta o vale"
              >
                −
              </button>
            </div>
          )}
        </div>

        {/* — Neto + pay toggle */}
        <div className="pr-neto">
          <div className="pr-neto__amt">{money(entry.netPay, 'MXN')}</div>
          <button
            type="button"
            className={`pr-neto__btn${paid ? ' done' : ''}`}
            onClick={onTogglePaid}
            disabled={locked && !paid}
          >
            {paid ? <><ICheck size={12} stroke={2.6} />Pagado</> : 'Marcar pagado'}
          </button>
        </div>
      </div>

      {adjusting && !locked && (
        <QuickAdjust
          type={adjusting}
          busy={busy}
          onAdd={(a) => { onAddAdjustment(a); setAdjusting(null) }}
          onClose={() => setAdjusting(null)}
        />
      )}

      {(debtBalance ?? 0) > 0 && (
        <div className="pr-debt">
          <span>Debe <span className="amt">{money(debtBalance ?? 0, 'MXN')}</span> de vales</span>
          <button type="button" onClick={onPayDebt}>Registrar pago</button>
        </div>
      )}

      <div className="pr-days">
        <button
          type="button"
          className={`pr-days__toggle${showDays ? ' open' : ''}`}
          onClick={() => setShowDays((v) => !v)}
        >
          {showDays ? 'OCULTAR DÍAS' : 'VER DÍAS'}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {showDays && <PayrollDayStrip periodStartDate={periodStartDate} days={days} entry={entry} />}
      </div>
    </div>
  )
}

/** Compact 7-col day strip (Dom→Sáb) — kit pattern.
 *
 * Faltas live on the AttendanceRecord, not PayrollDay. PayrollDay only knows
 * carros + ticketRevenue, so a zero-sales day can mean either "lavador worked
 * but didn't get any tickets" or "lavador didn't show". We don't have enough
 * info to distinguish here — so show the carros count (with 0 for empty days)
 * and let the Asistencia screen be the source of truth for absences.
 */
function PayrollDayStrip({
  periodStartDate,
  days,
  entry,
}: {
  periodStartDate: string
  days: PayrollDay[]
  entry: PayrollEntry
}) {
  const byDate = new Map<string, PayrollDay>()
  for (const d of days) byDate.set(d.workDate, d)
  void entry
  return (
    <div className="pr-days__grid">
      {NM_DOW.map((dow, i) => {
        const dateStr = nmAddDays(periodStartDate, i)
        const rec = byDate.get(dateStr)
        const isRest = !rec
        return (
          <div
            key={i}
            className={`pr-day${isRest ? ' rest' : ''}`}
            title={dateStr + (rec ? ` · ${rec.carsWashed} carros · ${money(rec.ticketRevenue, 'MXN')}` : ' · sin actividad')}
          >
            <div className="pr-day__dow">{dow}</div>
            <div className="pr-day__num">{isRest ? '·' : rec!.carsWashed}</div>
          </div>
        )
      })}
    </div>
  )
}

function QuickAdjust({ type, busy, onAdd, onClose }: {
  type: PayrollAdjustmentType
  busy: boolean
  onAdd: (a: { type: PayrollAdjustmentType; concept: string; amount: number; note?: string }) => void
  onClose: () => void
}) {
  const isAdd = type === 'EARNING'
  const reasons = isAdd ? NM_REASONS_ADD : NM_REASONS_SUB
  const [reason, setReason] = useState(reasons[0])
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const submit = () => {
    const amt = Number(amount)
    if (!amt || amt <= 0) return
    onAdd({ type, concept: reason, amount: amt, note: note.trim() })
  }
  return (
    <div className={`pr-adjust ${isAdd ? 'add' : 'sub'}`}>
      <div className="pr-adjust__reasons">
        {reasons.map((r) => (
          <button
            key={r}
            type="button"
            className={`pr-adjust__reason${reason === r ? ' on' : ''}`}
            onClick={() => setReason(r)}
          >
            {r}
          </button>
        ))}
        <div className="pr-adjust__money">
          <span className="moneyin">
            <span className="cur">$</span>
            <input
              ref={ref}
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose() }}
            />
          </span>
          <button type="button" className="pr-adjust__add" onClick={submit} disabled={busy}>Agregar</button>
          <button type="button" className="pr-adjust__close" onClick={onClose} aria-label="Cerrar"><IX size={13} /></button>
        </div>
      </div>
      {isAdd && (
        <div className="pr-adjust__note">
          <span className="lbl">¿Por qué?</span>
          <input
            type="text"
            value={note}
            placeholder="Motivo del bono — ej. cubrió turno extra (opcional)"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose() }}
          />
        </div>
      )}
    </div>
  )
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
  washesIncluded: z.coerce.number().int().min(1, 'Mínimo 1'),
  amount: z.coerce.number().min(0.01, 'Mínimo $0.01'),
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

      {/* ─── Page header (v2) ──────────────────────────────────────── */}
      <div className="tl2-page-header">
        <div className="tl2-page-header__left">
          <div className="tl2-page-header__eyebrow"><span className="dot" />PRE-PAGO · {effectiveBusinessDay?.businessDate ?? 'sin día'}</div>
          <h1 className="tl2-page-header__title">Paquetes prepagados</h1>
          <p className="tl2-page-header__subtitle">Vende el paquete una vez. Captura los lavados individuales como cortesía.</p>
        </div>
        <div className="tl2-page-header__right">
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white px-4 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-violet-700">Cobrado hoy</p>
            <p className="font-display mt-1 text-[24px] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">
              {money(totalHoy, 'MXN')}
            </p>
            <p className="mt-1 text-[11px] text-ink-400">{list.length} paquete{list.length === 1 ? '' : 's'}</p>
          </div>
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
  const [editing, setEditing] = useState(false)
  const [voiding, setVoiding] = useState<Ticket | null>(null)
  const closeDetail = () => { setSelected(null); setEditing(false) }

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
  // Sum over non-courtesy only. Legacy comp tickets carry a non-zero
  // price_amount (the would-be charge before the $0 rule was enforced); if we
  // summed those into "cobrado" we'd inflate the day's apparent revenue and
  // skew Importe promedio (paid sum + phantom comp) / (paid count).
  const billableList = activeList.filter((t) => !t.courtesy)
  const totalCobrado = billableList.reduce((sum, t) => sum + t.priceAmount, 0)
  const importePromedio = billableList.length > 0 ? totalCobrado / billableList.length : 0
  const animActiveCount = useCountUp(activeList.length)
  const animVoidedCount = useCountUp(voidedList.length)
  const animTotalCobrado = useCountUp(totalCobrado)
  const animImportePromedio = useCountUp(importePromedio)

  return (
    <section className="space-y-5">
      <PageHeaderV2
        eyebrow={`OPERACIÓN · ${effectiveBusinessDay?.businessDate ?? 'sin día abierto'}`}
        eyebrowDot
        title="Tickets"
        subtitle="Captura, busca y revisa los tickets del día. Toca un renglón para abrir la nota."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 10,
                border: '1px solid var(--border-soft)', background: '#fff',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--brand-green-bright)', boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {openShifts[0]?.shiftType === 'MATUTINO' ? 'Matutino' : openShifts[0]?.shiftType === 'VESPERTINO' ? 'Vespertino' : 'Sin turno'}
              </div>
              <span className="tl2-mono-display" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-900)' }}>{clockStr}</span>
            </div>
            <NavLink to="/tickets/nuevo" className="tl-btn tl-btn-primary">
              <IPlus size={14} stroke={2.4} /> Nuevo ticket
            </NavLink>
          </div>
        }
      />

      {/* Kit feature KPI row — dark "Total cobrado hoy" + 3 toned cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 12 }}>
        <div
          style={{
            position: 'relative', overflow: 'hidden', borderRadius: 14,
            background: 'radial-gradient(120% 100% at 100% 0%, rgba(34,197,94,0.18), transparent 55%), linear-gradient(135deg, #0f0820 0%, #1a0f2e 40%, #1f3a2e 100%)',
            color: '#fff', padding: '16px 18px',
            boxShadow: '0 16px 32px -16px rgba(15,23,42,0.45)',
          }}
        >
          <div
            aria-hidden
            style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'radial-gradient(rgba(255,255,255,0.85) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
          />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.50)' }}>
              TOTAL COBRADO HOY
            </div>
            <div className="tl2-mono-display" style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.035em', color: '#fff', lineHeight: 1 }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 18, marginRight: 4 }}>$</span>
              {Math.round(animTotalCobrado).toLocaleString('es-MX')}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.80)', padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700 }}>
                {billableList.length} con cobro
              </span>
            </div>
          </div>
        </div>
        <KpiV2 label="Activos" value={String(Math.round(animActiveCount))} tone="good" sub="cobrados + cortesía" />
        <KpiV2 label="Cancelados" value={String(Math.round(animVoidedCount))} tone="bad" sub="anulados hoy" />
        <KpiV2
          label="Importe promedio"
          value={billableList.length > 0 ? money(animImportePromedio, 'MXN') : '—'}
          sub={billableList.length > 0 ? `${billableList.length} con cobro` : 'sin tickets cobrados'}
        />
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
              {activeSource.isLoading && filtered.length === 0 && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    <td colSpan={9} className="!py-2.5">
                      <span className="tl-metric-skeleton" style={{ display: 'block', height: 24, width: '100%' }} />
                    </td>
                  </tr>
                ))
              )}
              {filtered.map((ticket) => {
                const occurred = ticket.occurredAt ?? ticket.createdAt
                const timeStr = new Date(occurred).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
                const lavadorNames = ticket.assignments.map((a) => a.employeeName)
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelected(ticket)}
                    className="cursor-pointer"
                  >
                    <td className="font-mono text-[12px] text-ink-500 tabular-nums">{timeStr}</td>
                    <td className="font-semibold">
                      {ticket.internalRef || ticket.notaNumber}
                      {ticket.internalRef && (
                        <p className="mt-0.5 font-mono text-[11px] font-normal text-ink-400">{ticket.notaNumber}</p>
                      )}
                    </td>
                    <td>
                      <span>{ticket.vehicleDescription || '-'}</span>
                      {ticket.notes && <p className="mt-0.5 max-w-[28ch] truncate text-[11px] text-ink-400">{ticket.notes}</p>}
                    </td>
                    <td className="text-[12.5px]">{ticket.serviceTypeName} / {ticket.vehicleSizeName}</td>
                    <td>
                      <div className="inline-flex items-center gap-2">
                        <Avatars names={lavadorNames} max={3} />
                        <span className="text-[11.5px] text-ink-600">
                          {lavadorNames.length === 0
                            ? <em className="italic text-ink-400">—</em>
                            : lavadorNames.length === 1
                              ? lavadorNames[0].split(' ')[0]
                              : `${lavadorNames.length} lavadores`}
                        </span>
                      </div>
                    </td>
                    <td className="r font-semibold tabular-nums">
                      {ticket.courtesy ? <span className="italic text-amber-600">GRATIS</span> : money(ticket.priceAmount, ticket.currency)}
                    </td>
                    <td><PaymentPill ticket={ticket} /></td>
                    <td><TicketStatusPill ticket={ticket} /></td>
                    <td className="r" onClick={(e) => e.stopPropagation()}>
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
              {filtered.length === 0 && !activeSource.isLoading && (
                <tr>
                  <td colSpan={9} className="!p-0">
                    <EmptyState
                      icon={(
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      title="No hay tickets para estos filtros"
                      description={notaLookup.trim()
                        ? 'Revisa el número de nota e intenta de nuevo.'
                        : query
                          ? 'Ajusta la búsqueda o cambia el estado.'
                          : 'Captura el primer ticket del turno.'}
                      cta={!notaLookup.trim() && !query
                        ? <NavLink to="/tickets/nuevo" className="tl-btn tl-btn-primary tl-btn-sm">+ Nuevo ticket</NavLink>
                        : undefined}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal
          title={editing ? `Editar ticket ${selected.notaNumber}` : `Ticket ${selected.notaNumber}`}
          onClose={closeDetail}
        >
          {editing ? (
            <TicketWorkspace
              mode="edit"
              ticket={selected}
              onSaved={closeDetail}
              readOnly={!hasRole('GERENTE')}
            />
          ) : (
            <TicketDetail
              ticket={selected}
              canEdit={hasRole('GERENTE')}
              onEdit={() => setEditing(true)}
              onVoid={() => { setVoiding(selected); setSelected(null); setEditing(false) }}
            />
          )}
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

function ExpenseModal({ data, onClose, editing }: { data: ReturnType<typeof usePhaseData>; onClose: () => void; editing?: Expense }) {
  const queryClient = useQueryClient()
  const openShift = (data.shifts.data ?? []).find((shift) => shift.status === 'OPEN')
  const isEdit = Boolean(editing)
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as Resolver<ExpenseFormValues>,
    defaultValues: editing
      ? { expenseDate: editing.expenseDate, category: editing.category, amount: editing.amount, description: editing.description ?? '' }
      : { expenseDate: today, category: 'MATERIAL', amount: 0, description: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: ExpenseFormValues) => {
      const payload = {
        businessDayId: isEdit ? undefined : data.currentBusinessDay?.id,
        shiftId: isEdit ? undefined : openShift?.id,
        expenseDate: values.expenseDate,
        category: values.category,
        amount: Number(values.amount),
        description: values.description ?? '',
      }
      return isEdit
        ? api<Expense>(`/api/v1/expenses/${editing!.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : api<Expense>('/api/v1/expenses', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: async () => {
      await invalidateMoney(queryClient)
      onClose()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => api(`/api/v1/expenses/${editing!.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await invalidateMoney(queryClient)
      onClose()
    },
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Modal title={isEdit ? 'Editar gasto' : 'Nuevo gasto'} onClose={onClose} narrow>
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
        {deleteMutation.error && <ErrorMessage message={deleteMutation.error.message} />}
        <EditModalActions
          isEdit={isEdit}
          onClose={onClose}
          submitLabel={mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar gasto'}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          onDelete={() => deleteMutation.mutate()}
          deletePending={deleteMutation.isPending}
        />
      </form>
    </Modal>
  )
}

function WithdrawalModal({ data, onClose, editing }: { data: ReturnType<typeof usePhaseData>; onClose: () => void; editing?: Withdrawal }) {
  const queryClient = useQueryClient()
  const openShift = (data.shifts.data ?? []).find((shift) => shift.status === 'OPEN')
  const isEdit = Boolean(editing)
  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema) as Resolver<WithdrawalFormValues>,
    defaultValues: editing
      ? { withdrawalDate: editing.withdrawalDate, amount: editing.amount, reason: editing.reason ?? '' }
      : { withdrawalDate: today, amount: 0, reason: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: WithdrawalFormValues) => {
      const payload = {
        businessDayId: isEdit ? undefined : data.currentBusinessDay?.id,
        shiftId: isEdit ? undefined : openShift?.id,
        withdrawalDate: values.withdrawalDate,
        amount: Number(values.amount),
        reason: values.reason ?? '',
      }
      return isEdit
        ? api<Withdrawal>(`/api/v1/withdrawals/${editing!.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : api<Withdrawal>('/api/v1/withdrawals', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: async () => {
      await invalidateMoney(queryClient)
      onClose()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => api(`/api/v1/withdrawals/${editing!.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await invalidateMoney(queryClient)
      onClose()
    },
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Modal title={isEdit ? 'Editar retiro' : 'Nuevo retiro'} onClose={onClose} narrow>
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
        {deleteMutation.error && <ErrorMessage message={deleteMutation.error.message} />}
        <EditModalActions
          isEdit={isEdit}
          onClose={onClose}
          submitLabel={mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar retiro'}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          onDelete={() => deleteMutation.mutate()}
          deletePending={deleteMutation.isPending}
        />
      </form>
    </Modal>
  )
}

function AdvanceModal({ data, onClose, editing }: { data: ReturnType<typeof usePhaseData>; onClose: () => void; editing?: EmployeeAdvance }) {
  const queryClient = useQueryClient()
  const openShift = (data.shifts.data ?? []).find((shift) => shift.status === 'OPEN')
  const isEdit = Boolean(editing)
  const form = useForm<AdvanceFormValues>({
    resolver: zodResolver(advanceSchema) as Resolver<AdvanceFormValues>,
    defaultValues: editing
      ? { advanceDate: editing.advanceDate, employeeId: editing.employeeId, amount: editing.amount, reason: editing.reason ?? '' }
      : { advanceDate: today, employeeId: 0, amount: 0, reason: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: AdvanceFormValues) => {
      const payload = {
        businessDayId: isEdit ? undefined : data.currentBusinessDay?.id,
        shiftId: isEdit ? undefined : openShift?.id,
        employeeId: Number(values.employeeId),
        advanceDate: values.advanceDate,
        amount: Number(values.amount),
        reason: values.reason ?? '',
      }
      return isEdit
        ? api<EmployeeAdvance>(`/api/v1/employee-advances/${editing!.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : api<EmployeeAdvance>('/api/v1/employee-advances', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: async () => {
      await invalidateMoney(queryClient)
      onClose()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => api(`/api/v1/employee-advances/${editing!.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await invalidateMoney(queryClient)
      onClose()
    },
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Modal title={isEdit ? 'Editar préstamo' : 'Nuevo prestamo'} onClose={onClose} narrow>
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
        {deleteMutation.error && <ErrorMessage message={deleteMutation.error.message} />}
        <EditModalActions
          isEdit={isEdit}
          onClose={onClose}
          submitLabel={mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar préstamo'}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          onDelete={() => deleteMutation.mutate()}
          deletePending={deleteMutation.isPending}
        />
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
  loading = false,
  onRowClick,
}: {
  title: string
  rows: { id: number; date: string; concept: string; detail: string; amount: number }[]
  empty: string
  loading?: boolean
  onRowClick?: (id: number) => void
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
            {loading && rows.length === 0 && (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  <td colSpan={4} className="!py-2.5">
                    <span className="tl-metric-skeleton" style={{ display: 'block', height: 20, width: '100%' }} />
                  </td>
                </tr>
              ))
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.id) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
                title={onRowClick ? 'Editar' : undefined}
              >
                <td>{row.date}</td>
                <td className="font-semibold">{row.concept}</td>
                <td>{row.detail}</td>
                <td className="r">{money(row.amount, 'MXN')}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
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

function EditModalActions({
  isEdit,
  onClose,
  submitLabel,
  confirmDelete,
  setConfirmDelete,
  onDelete,
  deletePending,
}: {
  isEdit: boolean
  onClose: () => void
  submitLabel: string
  confirmDelete: boolean
  setConfirmDelete: (v: boolean) => void
  onDelete: () => void
  deletePending: boolean
}) {
  if (!isEdit) {
    return <ModalActions onClose={onClose} submitLabel={submitLabel} />
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-rose-700">¿Eliminar este registro?</span>
          <button
            type="button"
            className="tl-btn tl-btn-sm tl-btn-danger"
            onClick={onDelete}
            disabled={deletePending}
          >
            {deletePending ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
          <button
            type="button"
            className="tl-btn tl-btn-sm tl-btn-ghost"
            onClick={() => setConfirmDelete(false)}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="tl-btn tl-btn-sm tl-btn-ghost"
          style={{ color: 'var(--bad-600)' }}
          onClick={() => setConfirmDelete(true)}
        >
          Eliminar
        </button>
      )}
      <div className="flex justify-end gap-2">
        <Button kind="ghost" onClick={onClose}>Volver</Button>
        <Button kind="primary" type="submit">{submitLabel}</Button>
      </div>
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
      doNotRehire: employee.doNotRehire ?? false,
      doNotRehireNote: employee.doNotRehireNote ?? '',
    },
  })
  const watchedActive = form.watch('active')
  const watchedPayrollType = form.watch('payrollType')
  const watchedDoNotRehire = form.watch('doNotRehire')
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
          <div className={`rounded-lg border p-3 space-y-3 ${watchedDoNotRehire ? 'border-red-300 bg-red-50/60' : 'border-border-soft'}`}>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" {...form.register('doNotRehire')} className="h-4 w-4 rounded border-border-soft text-red-600" />
              <span className={watchedDoNotRehire ? 'text-red-700' : ''}>No recontratar (mal trabajador)</span>
            </label>
            {watchedDoNotRehire && (
              <>
                <TextField label="Motivo (por qué no recontratar)" error={form.formState.errors.doNotRehireNote?.message}>
                  <input placeholder="Ej. Faltas constantes, problemas con clientes" {...form.register('doNotRehireNote')} />
                </TextField>
                <p className="text-xs text-red-600">
                  Queda marcado de forma permanente. Si regresa a pedir trabajo, lo verás aquí aunque esté dado de baja.
                </p>
              </>
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

function SimpleList({ rows, empty }: { rows: { id: number; title: React.ReactNode; detail: string }[]; empty: string }) {
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
  if (ticket.courtesy) return <Pill tone="warn" dot={false}>Cortesía</Pill>
  if (ticket.paymentMethod === 'CARD') return <Pill tone="info" dot={false}>Tarjeta</Pill>
  if (ticket.paymentMethod === 'TRANSFER') return <Pill tone="purple" dot={false}>Depósito</Pill>
  return <Pill tone="gray" dot={false}>Efectivo</Pill>
}

function Modal({ title, children, onClose, narrow = false }: { title: string; children: React.ReactNode; onClose: () => void; narrow?: boolean }) {
  const slug = testidSlug(title)
  const titleId = `modal-${slug}-title`
  return createPortal(
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
    </div>,
    document.body,
  )
}

// Reusable "reabrir / confirmar con motivo" action. Replaces native window.prompt()
// for sensitive, audited actions — styled modal + required reason, no parent state.
function ReasonAction({
  label, pendingLabel, pending, title, prompt, confirmLabel,
  kind = 'secondary', size, block, onConfirm,
}: {
  label: string
  pendingLabel: string
  pending: boolean
  title: string
  prompt: string
  confirmLabel: string
  kind?: React.ComponentProps<typeof Button>['kind']
  size?: React.ComponentProps<typeof Button>['size']
  block?: boolean
  onConfirm: (reason: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  return (
    <>
      <Button kind={kind} size={size} block={block} disabled={pending} onClick={() => { setReason(''); setOpen(true) }}>
        {pending ? pendingLabel : label}
      </Button>
      {open && (
        <Modal title={title} narrow onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed text-ink-600">{prompt}</p>
            <Field label="Motivo (queda en la bitácora)">
              <textarea
                className="tl-input"
                rows={3}
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Escribe el motivo…"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button kind="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button kind="primary" disabled={!reason.trim()} onClick={() => { onConfirm(reason.trim()); setOpen(false) }}>{confirmLabel}</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

function Toast({ message }: { message: string }) {
  return createPortal(
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
    </div>,
    document.body,
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

/**
 * Reporte de personal — gerente+dueño analytics view of today's attendance.
 * Pulls the same /api/v1/attendance data the operator AttendanceScreen writes
 * and renders the design-kit timeline + roster cards + leaderboard + alerts.
 */
const STAFF_TARGET_HOUR = 7.5
const STAFF_AXIS_START = 6
const STAFF_AXIS_END = 20

function staffToFractionalHours(iso?: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

function staffFormatDuration(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh}h ${String(mm).padStart(2, '0')}m`
}

function staffTrackPct(h: number): number {
  return ((h - STAFF_AXIS_START) / (STAFF_AXIS_END - STAFF_AXIS_START)) * 100
}

function staffHashTone(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0
  const palette = ['#7c3aed', '#059669', '#dc2626', '#d97706', '#1d4ed8', '#0891b2', '#be123c']
  return palette[Math.abs(h) % palette.length]
}

function staffNameInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

function StaffReportScreen() {
  const [date, setDate] = useState(today)
  const records = useQuery({
    queryKey: ['attendance', date],
    queryFn: () => api<AttendanceRecord[]>(`/api/v1/attendance?date=${date}`),
  })

  const rows = records.data ?? []
  const now = new Date()
  const nowFrac = now.toISOString().slice(0, 10) === date
    ? now.getHours() + now.getMinutes() / 60
    : STAFF_AXIS_END

  const enriched = rows.map((r) => {
    const inH = staffToFractionalHours(r.clockIn)
    const outH = staffToFractionalHours(r.clockOut)
    const isAbsent = r.absence
    const isActive = !isAbsent && inH != null && outH == null
    const isComplete = !isAbsent && inH != null && outH != null
    const effectiveOut = outH ?? (isActive ? Math.min(nowFrac, STAFF_AXIS_END) : null)
    const duration = inH != null && effectiveOut != null ? Math.max(0, effectiveOut - inH) : 0
    const late = inH != null && inH - STAFF_TARGET_HOUR > 5 / 60
    const lateMin = late ? Math.round((inH - STAFF_TARGET_HOUR) * 60) : 0
    return { r, inH, outH, effectiveOut, isAbsent, isActive, isComplete, duration, late, lateMin }
  })

  const onShift = enriched.filter((e) => e.isActive).length
  const completed = enriched.filter((e) => e.isComplete).length
  const absent = enriched.filter((e) => e.isAbsent).length
  const lateCount = enriched.filter((e) => e.late).length
  const totalHours = enriched.reduce((s, e) => s + e.duration, 0)
  const avgInH = (() => {
    const ins = enriched.map((e) => e.inH).filter((h): h is number => h != null)
    if (!ins.length) return null
    return ins.reduce((a, b) => a + b, 0) / ins.length
  })()
  const avgInStr = avgInH == null
    ? '—'
    : `${String(Math.floor(avgInH)).padStart(2, '0')}:${String(Math.round((avgInH - Math.floor(avgInH)) * 60)).padStart(2, '0')}`

  const ticks = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20']
  const sortedByDuration = [...enriched].sort((a, b) => b.duration - a.duration)
  const alerts = enriched.filter((e) => e.isAbsent || e.late)

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border-soft pb-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--brand-green-bright)', boxShadow: '0 0 6px rgba(34,197,94,0.55)' }}
            />
            Personal · {date}
          </div>
          <h1 className="mt-1 font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.025em] text-ink-900">
            Reporte de personal
          </h1>
          <p className="mt-1.5 max-w-xl text-[13.5px] text-ink-500">
            Entradas, salidas y faltas del día. Compara entradas contra la hora objetivo de 07:30.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400">Fecha</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="tl-input" style={{ width: 160 }} />
          </label>
          <NavLink to="/asistencia" className="tl-btn">Marcar entrada / salida →</NavLink>
        </div>
      </div>

      <div className="tl-stagger grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric tone="good" label="En turno" value={onShift} sub="con entrada activa" />
        <Metric tone="info" label="Completos" value={completed} sub="entrada y salida" />
        <Metric tone="bad" label="Faltas" value={absent} sub="sin marcar" />
        <Metric tone="warn" label="Llegadas tarde" value={lateCount} sub="vs objetivo 07:30" />
        <Metric label="Horas trabajadas" value={staffFormatDuration(totalHours)} sub={`prom. entrada ${avgInStr}`} />
      </div>

      <Panel title="Línea del día" subtitle="Cada barra es un turno. La línea morada marca la hora objetivo de entrada (07:30).">
        {enriched.length === 0 ? (
          <EmptyState
            icon={<ICalendar size={20} />}
            title="Sin registros para esta fecha"
            description="Los operadores marcan entradas y salidas desde la pantalla Asistencia."
            tone="info"
          />
        ) : (
          <div>
            <div className="grid items-center gap-2" style={{ gridTemplateColumns: '180px 1fr 100px' }}>
              <div />
              <div className="relative flex justify-between font-mono text-[10px] font-bold text-ink-400">
                {ticks.slice(0, -1).map((t) => <span key={t}>{t}</span>)}
              </div>
              <div className="text-right font-mono text-[10px] font-bold text-ink-400">HORAS</div>
            </div>
            {enriched.map((e) => {
              const tone = e.isActive ? 'bg-emerald-500 text-white' : e.isComplete ? 'bg-ink-700 text-white' : 'bg-bad-100 text-bad-700'
              const left = e.inH != null ? staffTrackPct(e.inH) : 8
              const right = e.effectiveOut != null ? staffTrackPct(e.effectiveOut) : (e.isAbsent ? 92 : staffTrackPct(e.inH ?? STAFF_AXIS_START) + 5)
              const width = Math.max(right - left, 6)
              return (
                <div
                  key={e.r.id}
                  className="grid items-center gap-2 border-b border-dashed border-border-soft py-2 last:border-0"
                  style={{ gridTemplateColumns: '180px 1fr 100px' }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[10.5px] font-bold text-white"
                      style={{ background: staffHashTone(e.r.employeeName) }}
                    >{staffNameInitials(e.r.employeeName)}</span>
                    <span className="truncate text-[12.5px] font-semibold text-ink-900">{e.r.employeeName}</span>
                  </div>
                  <div className="relative h-7 rounded-md bg-ink-50">
                    <div
                      className="absolute bottom-0 top-0 w-px bg-violet-500/60"
                      style={{ left: `calc(${staffTrackPct(STAFF_TARGET_HOUR)}% - 0.5px)` }}
                    />
                    {!e.isAbsent && e.inH != null && (
                      <div
                        className={`absolute bottom-0.5 top-0.5 flex items-center justify-between rounded-md px-2 text-[10.5px] font-bold ${tone}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        <span>{e.r.clockIn ? formatLocalTime(e.r.clockIn) : '—'}</span>
                        {e.isActive ? <span className="opacity-75">AHORA</span> : <span>{e.r.clockOut ? formatLocalTime(e.r.clockOut) : ''}</span>}
                      </div>
                    )}
                    {e.isAbsent && (
                      <div className="absolute inset-0.5 flex items-center justify-center rounded-md border border-dashed border-bad-300 bg-bad-50 text-[10.5px] font-bold uppercase tracking-[0.1em] text-bad-700">
                        FALTA
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[12.5px] font-bold tabular-nums text-ink-900">
                      {e.isAbsent ? <span className="text-bad-700">—</span> : staffFormatDuration(e.duration)}
                    </div>
                    <div className="text-[10.5px]">
                      {e.isAbsent
                        ? <span className="text-bad-600">sin marcar</span>
                        : e.late
                          ? <span className="font-semibold text-amber-700">+{e.lateMin} min tarde</span>
                          : <span className="text-emerald-700">a tiempo</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Roster del día" subtitle={`${enriched.length} personas · ${onShift} activas ahora`}>
          {enriched.length === 0 ? (
            <p className="text-[12.5px] text-ink-400">Sin actividad para esta fecha.</p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {enriched.map((e) => {
                const tone: 'good' | 'bad' | 'gray' = e.isActive ? 'good' : e.isAbsent ? 'bad' : 'gray'
                return (
                  <div
                    key={e.r.id}
                    className={`relative rounded-xl border bg-white p-3 ${
                      e.isActive ? 'border-emerald-300/70 bg-gradient-to-b from-emerald-50/60 to-white'
                      : e.isAbsent ? 'border-bad-200 bg-bad-50/30'
                      : 'border-border-soft'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold text-white"
                        style={{ background: staffHashTone(e.r.employeeName) }}
                      >{staffNameInitials(e.r.employeeName)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink-900">{e.r.employeeName}</p>
                        <p className="truncate text-[10.5px] text-ink-500">Lavador</p>
                      </div>
                      <Pill tone={tone}>{e.isActive ? 'En turno' : e.isAbsent ? 'Falta' : 'Completo'}</Pill>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-ink-50/70 px-2.5 py-1.5">
                        <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-500">Entrada</p>
                        <p className="font-mono text-[12.5px] font-bold tabular-nums text-ink-900">{e.r.clockIn ? formatLocalTime(e.r.clockIn) : '—'}</p>
                      </div>
                      <div className="rounded-md bg-ink-50/70 px-2.5 py-1.5">
                        <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-500">Salida</p>
                        <p className="font-mono text-[12.5px] font-bold tabular-nums text-ink-900">
                          {e.r.clockOut ? formatLocalTime(e.r.clockOut) : (e.isActive ? 'activo' : '—')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10.5px] text-ink-500">
                        Duración: <span className="font-mono font-bold tabular-nums text-ink-800">{e.isAbsent ? '—' : staffFormatDuration(e.duration)}</span>
                      </span>
                      {!e.isAbsent && (
                        <span className={`text-[9.5px] font-bold uppercase tracking-[0.06em] ${e.late ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {e.late ? `+${e.lateMin}m tarde` : 'A TIEMPO'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Ranking · horas hoy" subtitle="Ordenado por horas trabajadas en el día seleccionado.">
            {sortedByDuration.filter((e) => !e.isAbsent && e.duration > 0).length === 0 ? (
              <p className="text-[12.5px] text-ink-400">Aún no hay tiempo trabajado.</p>
            ) : (
              <div className="space-y-2">
                {sortedByDuration.filter((e) => !e.isAbsent && e.duration > 0).slice(0, 8).map((e, i) => {
                  const maxH = sortedByDuration[0]?.duration || 1
                  const pct = Math.round((e.duration / maxH) * 100)
                  return (
                    <div key={e.r.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '20px 28px 1fr 60px' }}>
                      <span className="text-center font-display text-[13px] font-bold text-ink-400">{i + 1}</span>
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-md font-display text-[10.5px] font-bold text-white"
                        style={{ background: staffHashTone(e.r.employeeName) }}
                      >{staffNameInitials(e.r.employeeName)}</span>
                      <div className="min-w-0">
                        <div className="flex items-baseline justify-between">
                          <span className="truncate text-[12px] font-semibold text-ink-900">{e.r.employeeName}</span>
                          <span className="font-mono text-[10.5px] font-bold text-ink-500">{pct}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: pct >= 90 ? 'var(--good-500)' : pct >= 60 ? 'var(--warn-500)' : 'var(--bad-500)' }}
                          />
                        </div>
                      </div>
                      <span className="text-right font-mono text-[12px] font-bold tabular-nums text-ink-900">{staffFormatDuration(e.duration)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>

          <Panel title="Por revisar" subtitle="Eventos para confirmar antes del corte.">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2.5 text-[12.5px] text-emerald-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>
                Todo en orden hoy.
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((e) => (
                  <div
                    key={e.r.id}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
                      e.isAbsent ? 'border-bad-100 bg-bad-50' : 'border-warn-100 bg-warn-50'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                        e.isAbsent ? 'bg-bad-500' : 'bg-warn-500'
                      }`}
                    >{e.isAbsent ? '!' : '?'}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold text-ink-900">
                        {e.r.employeeName} · {e.isAbsent ? 'falta sin justificar' : `entrada ${formatLocalTime(e.r.clockIn)}`}
                      </p>
                      <p className="text-[10.5px] text-ink-500">
                        {e.isAbsent ? 'Considerar contacto con el lavador.' : `${e.lateMin} min tarde respecto al objetivo 07:30.`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </section>
  )
}

/**
 * Asistencia (Lab) — ADMIN-only experimental attendance surface. Faithful port
 * of the Claude design handoff (screens-5 AttendanceScreen) using the tl2-*
 * design classes, wired to the real /api/v1/attendance data plus a 7-day window
 * for the weekdots and KPI sparklines. The operator Asistencia and the manager
 * Reporte de personal screens are left untouched.
 */
type LabDayClass = 'complete' | 'late' | 'miss' | 'off'

function labLastDates(end: string, n: number): string[] {
  const out: string[] = []
  const base = new Date(`${end}T00:00:00`)
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function labWeekdayLetter(iso: string): string {
  return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][new Date(`${iso}T00:00:00`).getDay()]
}

function labClassifyDay(rec?: AttendanceRecord): LabDayClass {
  if (!rec) return 'off'
  if (rec.absence) return 'miss'
  const inH = staffToFractionalHours(rec.clockIn)
  if (inH == null) return 'off'
  return inH - STAFF_TARGET_HOUR > 5 / 60 ? 'late' : 'complete'
}

function labShiftLabel(shift?: string | null): string {
  if (shift === 'MATUTINO') return 'Turno matutino'
  if (shift === 'VESPERTINO') return 'Turno vespertino'
  return 'Personal'
}

function AsistenciaLabScreen() {
  const [date, setDate] = useState(today)
  const windowDates = labLastDates(date, 7)

  const week = useQuery({
    queryKey: ['attendance-week', date],
    queryFn: async () => {
      const lists = await Promise.all(
        windowDates.map((d) => api<AttendanceRecord[]>(`/api/v1/attendance?date=${d}`)),
      )
      return windowDates.map((d, i) => ({ date: d, rows: lists[i] }))
    },
  })
  const employees = useQuery({
    queryKey: ['employees', 'lab'],
    queryFn: () => api<Employee[]>('/api/v1/employees'),
  })

  const shiftById = new Map<number, string | null | undefined>(
    (employees.data ?? []).map((e) => [e.id, e.primaryShift]),
  )
  const days = week.data ?? []
  const rows = days.find((d) => d.date === date)?.rows ?? []

  const now = new Date()
  const nowFrac = now.toISOString().slice(0, 10) === date
    ? now.getHours() + now.getMinutes() / 60
    : STAFF_AXIS_END

  const enriched = rows.map((r) => {
    const inH = staffToFractionalHours(r.clockIn)
    const outH = staffToFractionalHours(r.clockOut)
    const isAbsent = r.absence
    const isActive = !isAbsent && inH != null && outH == null
    const isComplete = !isAbsent && inH != null && outH != null
    const effectiveOut = outH ?? (isActive ? Math.min(nowFrac, STAFF_AXIS_END) : null)
    const duration = inH != null && effectiveOut != null ? Math.max(0, effectiveOut - inH) : 0
    const late = inH != null && inH - STAFF_TARGET_HOUR > 5 / 60
    const lateMin = late ? Math.round((inH - STAFF_TARGET_HOUR) * 60) : 0
    const weekdots = windowDates.map((d) => ({
      letter: labWeekdayLetter(d),
      cls: labClassifyDay(days.find((w) => w.date === d)?.rows.find((x) => x.employeeId === r.employeeId)),
    }))
    return { r, inH, outH, effectiveOut, isAbsent, isActive, isComplete, duration, late, lateMin, weekdots }
  })

  const onShift = enriched.filter((e) => e.isActive).length
  const completed = enriched.filter((e) => e.isComplete).length
  const absent = enriched.filter((e) => e.isAbsent).length
  const lateCount = enriched.filter((e) => e.late).length
  const totalHours = enriched.reduce((s, e) => s + e.duration, 0)
  const avgInH = (() => {
    const ins = enriched.map((e) => e.inH).filter((h): h is number => h != null)
    if (!ins.length) return null
    return ins.reduce((a, b) => a + b, 0) / ins.length
  })()
  const avgInStr = avgInH == null
    ? '—'
    : `${String(Math.floor(avgInH)).padStart(2, '0')}:${String(Math.round((avgInH - Math.floor(avgInH)) * 60)).padStart(2, '0')}`

  const perDay = days.map((w) => {
    let present = 0, comp = 0, abs = 0, lt = 0, hrs = 0
    w.rows.forEach((r) => {
      if (r.absence) { abs += 1; return }
      const inH = staffToFractionalHours(r.clockIn)
      const outH = staffToFractionalHours(r.clockOut)
      if (inH == null) return
      present += 1
      if (outH != null) { comp += 1; hrs += Math.max(0, outH - inH) }
      if (inH - STAFF_TARGET_HOUR > 5 / 60) lt += 1
    })
    return { present, comp, abs, lt, hrs }
  })
  const spark = (key: 'present' | 'comp' | 'abs' | 'lt' | 'hrs') => perDay.map((d) => d[key])

  const byEmp = new Map<number, { name: string; hours: number }>()
  days.forEach((w) => w.rows.forEach((r) => {
    if (r.absence) return
    const inH = staffToFractionalHours(r.clockIn)
    const outH = staffToFractionalHours(r.clockOut)
    if (inH == null || outH == null) return
    const cur = byEmp.get(r.employeeId) ?? { name: r.employeeName, hours: 0 }
    cur.hours += Math.max(0, outH - inH)
    byEmp.set(r.employeeId, cur)
  }))
  const ranking = [...byEmp.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.hours - a.hours)
  const maxRankHours = ranking[0]?.hours || 1

  const alerts = enriched.filter((e) => e.isAbsent || e.late)
  const ticks = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20']

  return (
    <section className="space-y-5">
      <PageHead
        title="Asistencia"
        subtitle="Entradas, salidas y faltas del personal. Compara entradas contra la hora objetivo de 07:30."
        tone="hero"
        actions={
          <div className="flex items-end gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="tl-input"
              style={{ width: 160 }}
            />
            <NavLink to="/asistencia" className="tl-btn">Marcar entrada / salida →</NavLink>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="tl2-kpi t-good">
          <div className="tl2-kpi__label"><span className="dot" />En turno</div>
          <div className="tl2-kpi__value">{onShift}</div>
          <div className="tl2-kpi__foot"><span>con entrada activa</span><Sparkline data={spark('present')} color="var(--good-600)" /></div>
        </div>
        <div className="tl2-kpi t-info">
          <div className="tl2-kpi__label"><span className="dot" />Completos</div>
          <div className="tl2-kpi__value">{completed}</div>
          <div className="tl2-kpi__foot"><span>entrada y salida</span><Sparkline data={spark('comp')} color="var(--primary-600)" /></div>
        </div>
        <div className="tl2-kpi t-bad">
          <div className="tl2-kpi__label"><span className="dot" />Faltas</div>
          <div className="tl2-kpi__value">{absent}</div>
          <div className="tl2-kpi__foot"><span>sin marcar</span><Sparkline data={spark('abs')} color="var(--bad-600)" /></div>
        </div>
        <div className="tl2-kpi t-warn">
          <div className="tl2-kpi__label"><span className="dot" />Llegadas tarde</div>
          <div className="tl2-kpi__value">{lateCount}</div>
          <div className="tl2-kpi__foot"><span>vs objetivo 07:30</span><Sparkline data={spark('lt')} color="var(--warn-600)" /></div>
        </div>
        <div className="tl2-kpi">
          <div className="tl2-kpi__label"><span className="dot" />Horas trabajadas</div>
          <div className="tl2-kpi__value">{staffFormatDuration(totalHours)}</div>
          <div className="tl2-kpi__foot"><span>prom. entrada {avgInStr}</span><Sparkline data={spark('hrs')} color="var(--ink-400)" /></div>
        </div>
      </div>

      <div className="tl2-card t-emerald">
        <div className="tl2-card__head">
          <div>
            <h3>Línea del día</h3>
            <p>Cada barra es un turno. La línea marca la hora objetivo de entrada (07:30).</p>
          </div>
          <Pill tone="good">06:00 → 20:00</Pill>
        </div>
        <div className="tl2-card__body flush">
          {week.isLoading ? (
            <div className="p-6 text-[12.5px] text-ink-400">Cargando…</div>
          ) : enriched.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<ICalendar size={20} />}
                title="Sin registros para esta fecha"
                description="Los operadores marcan entradas y salidas desde la pantalla Asistencia."
                tone="info"
              />
            </div>
          ) : (
            <div style={{ padding: '12px 0 8px' }}>
              <div className="tl2-shift-axis">
                <div />
                <div className="tl2-shift-axis__ticks">
                  {ticks.slice(0, -1).map((t) => <span key={t}>{t}</span>)}
                </div>
                <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--ink-400)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>HORAS</div>
              </div>
              {enriched.map((e) => {
                const tone = e.isActive ? 't-en' : e.isComplete ? 't-out' : 't-falta'
                const left = e.inH != null ? staffTrackPct(e.inH) : 8
                const right = e.effectiveOut != null ? staffTrackPct(e.effectiveOut) : (e.isAbsent ? 92 : staffTrackPct(e.inH ?? STAFF_AXIS_START) + 5)
                const width = Math.max(right - left, 6)
                return (
                  <div key={e.r.id} className="tl2-shift">
                    <div className="tl2-shift__who">
                      <div className="av" style={{ background: staffHashTone(e.r.employeeName) }}>{staffNameInitials(e.r.employeeName)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="nm">{e.r.employeeName}</div>
                        <div className="rl">{labShiftLabel(shiftById.get(e.r.employeeId))}</div>
                      </div>
                    </div>
                    <div className="tl2-shift__track">
                      <div className="tl2-shift__target" style={{ left: `calc(${staffTrackPct(STAFF_TARGET_HOUR)}% - 1px)` }} />
                      {e.isAbsent ? (
                        <div className="tl2-shift__bar t-falta" style={{ left: '8%', width: '84%' }}>
                          <span style={{ width: '100%', textAlign: 'center' }}>FALTA</span>
                        </div>
                      ) : e.inH != null ? (
                        <div className={`tl2-shift__bar ${tone}`} style={{ left: `${left}%`, width: `${width}%` }}>
                          <span>{e.r.clockIn ? formatLocalTime(e.r.clockIn) : '—'}</span>
                          <span>{e.isActive ? 'AHORA' : (e.r.clockOut ? formatLocalTime(e.r.clockOut) : '')}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="tl2-shift__hours">
                      {e.isAbsent ? <span style={{ color: 'var(--bad-700)' }}>—</span> : staffFormatDuration(e.duration)}
                      <div className="sub">
                        {e.isAbsent
                          ? <span style={{ color: 'var(--bad-700)' }}>sin marcar</span>
                          : e.late
                            ? <span style={{ color: 'var(--warn-700)' }}>+{e.lateMin} min tarde</span>
                            : <span style={{ color: 'var(--good-700)' }}>a tiempo</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="tl2-card t-purple">
          <div className="tl2-card__head">
            <div>
              <h3>Roster del día</h3>
              <p>{enriched.length} personas · {onShift} activas ahora</p>
            </div>
          </div>
          <div className="tl2-card__body">
            {enriched.length === 0 ? (
              <p className="text-[12.5px] text-ink-400">Sin actividad para esta fecha.</p>
            ) : (
              <div className="tl2-roster">
                {enriched.map((e) => {
                  const cls = e.isActive ? 't-en' : e.isAbsent ? 't-falta' : 't-out'
                  return (
                    <div key={e.r.id} className={`tl2-roster__card ${cls}`}>
                      <div className="tl2-roster__head">
                        <div className="tl2-roster__avatar" style={{ background: staffHashTone(e.r.employeeName) }}>{staffNameInitials(e.r.employeeName)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="tl2-roster__name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.r.employeeName}</div>
                          <div className="tl2-roster__role">{labShiftLabel(shiftById.get(e.r.employeeId))}</div>
                        </div>
                        <Pill tone={e.isActive ? 'good' : e.isAbsent ? 'bad' : 'gray'}>{e.isActive ? 'En turno' : e.isAbsent ? 'Falta' : 'Completo'}</Pill>
                      </div>
                      <div className="tl2-roster__stamps">
                        <div className="tl2-roster__stamp"><span className="lbl">Entrada</span><span className="val">{e.r.clockIn ? formatLocalTime(e.r.clockIn) : '—'}</span></div>
                        <div className="tl2-roster__stamp"><span className="lbl">Salida</span><span className="val">{e.r.clockOut ? formatLocalTime(e.r.clockOut) : (e.isActive ? 'activo' : '—')}</span></div>
                      </div>
                      <div className="tl2-duration">
                        <div>
                          <div className="lbl">Duración</div>
                          <div className="v">{e.isAbsent ? '—' : staffFormatDuration(e.duration)}</div>
                        </div>
                        {!e.isAbsent && (
                          <span className={`tl2-roster__late ${e.late ? 'late' : 'on'}`}>{e.late ? `+${e.lateMin}m tarde` : 'A TIEMPO'}</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.10em', color: 'var(--ink-500)', textTransform: 'uppercase', marginBottom: 6 }}>Últimos 7 días</div>
                        <div className="tl2-weekdots">
                          {e.weekdots.map((d, i) => (
                            <div key={i} className={`tl2-weekdots__d ${d.cls}`} title={d.letter}>{d.letter}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="tl2-card t-amber">
            <div className="tl2-card__head">
              <div>
                <h3>Ranking de puntualidad</h3>
                <p>Últimos 7 días · horas acumuladas</p>
              </div>
            </div>
            <div className="tl2-card__body">
              {ranking.length === 0 ? (
                <p className="text-[12.5px] text-ink-400">Aún no hay tiempo trabajado.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {ranking.slice(0, 8).map((r, i) => {
                    const pct = Math.round((r.hours / maxRankHours) * 100)
                    return (
                      <div key={r.id} className="grid items-center gap-2.5" style={{ gridTemplateColumns: '20px 26px 1fr 60px' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--ink-400)', textAlign: 'center' }}>{i + 1}</div>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: staffHashTone(r.name), color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 10 }}>{staffNameInitials(r.name)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-500)', fontWeight: 700 }}>{pct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: 'var(--ink-100)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? 'var(--good-500)' : pct >= 60 ? 'var(--warn-500)' : 'var(--bad-500)', borderRadius: 999 }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: 'var(--ink-900)' }}>{staffFormatDuration(r.hours)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="tl2-card t-rose">
            <div className="tl2-card__head">
              <div>
                <h3>Por revisar</h3>
                <p>Eventos para confirmar antes del corte</p>
              </div>
            </div>
            <div className="tl2-card__body">
              {alerts.length === 0 ? (
                <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2.5 text-[12.5px] text-emerald-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                  </span>
                  Todo en orden hoy.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {alerts.map((e) => (
                    <div
                      key={e.r.id}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                      style={{
                        background: e.isAbsent ? 'var(--bad-50)' : 'var(--warn-50)',
                        border: `1px solid ${e.isAbsent ? 'var(--bad-100)' : 'var(--warn-100)'}`,
                      }}
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: e.isAbsent ? 'var(--bad-500)' : 'var(--warn-500)' }}
                      >{e.isAbsent ? '!' : '?'}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-bold text-ink-900">
                          {e.r.employeeName} · {e.isAbsent ? 'falta sin justificar' : `entrada ${formatLocalTime(e.r.clockIn)}`}
                        </div>
                        <div className="text-[11px] text-ink-500">
                          {e.isAbsent ? 'Considerar contacto con el lavador.' : `${e.lateMin} min tarde respecto al objetivo 07:30.`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
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
    mutationFn: ({ employeeId, recordId }: { employeeId: number; recordId?: number }) => {
      if (recordId != null) {
        return api<AttendanceRecord>(`/api/v1/attendance/${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'PRESENT' }),
        })
      }
      return api<AttendanceRecord>('/api/v1/attendance', {
        method: 'POST',
        body: JSON.stringify({ employeeId, workDate: date, status: 'PRESENT' }),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance', date] })
      showToast('Entrada registrada')
    },
  })

  const markAbsent = useMutation({
    mutationFn: ({ employeeId, recordId }: { employeeId: number; recordId?: number }) => {
      if (recordId != null) {
        return api<AttendanceRecord>(`/api/v1/attendance/${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ABSENT' }),
        })
      }
      return api<AttendanceRecord>('/api/v1/attendance', {
        method: 'POST',
        body: JSON.stringify({ employeeId, workDate: date, status: 'ABSENT' }),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance', date] })
      showToast('Falta registrada')
    },
  })

  // Unified status mutation — sends an explicit AttendanceStatus per V54.
  // PATCH when the record exists, POST when it doesn't. The backend rejects
  // a POST for a (employee, workDate) pair that already has a row, so without
  // the recordId branch, switching motivos on an already-marked row fails.
  const setAttendanceStatus = useMutation({
    mutationFn: ({ employeeId, status, label, recordId }: { employeeId: number; status: AttendanceStatus; label: string; recordId?: number }) => {
      if (recordId != null) {
        return api<AttendanceRecord>(`/api/v1/attendance/${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        })
      }
      return api<AttendanceRecord>('/api/v1/attendance', {
        method: 'POST',
        body: JSON.stringify({ employeeId, workDate: date, status }),
      })
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['attendance', date] })
      showToast(`${vars.label} registrado`)
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

  const { hasRole } = useAuth()

  // Mark every active lavador Presente in one tap. Skips anyone already marked
  // with a non-Presente status (descanso/enfermo/etc) to avoid clobbering it.
  const markAllPresent = () => {
    const recordByEmployee = new Map<number, AttendanceRecord>()
    for (const r of records.data ?? []) recordByEmployee.set(r.employeeId, r)
    for (const emp of activeEmployees) {
      const cur = recordByEmployee.get(emp.id)
      if (cur && (cur.status === 'PRESENT' || (!cur.absence && !cur.status))) continue
      clockIn.mutate({ employeeId: emp.id, recordId: cur?.id })
    }
  }

  // Derive each active employee's current display state from records.
  const records_ = records.data ?? []
  const recordByEmployee = new Map<number, AttendanceRecord>()
  for (const r of records_) recordByEmployee.set(r.employeeId, r)

  const roster = activeEmployees.map((emp) => {
    const rec = recordByEmployee.get(emp.id)
    let state: 'present-in' | 'present-out' | 'falta' | 'unrecorded'
    let reason: 'falta' | 'descanso' | 'enfermo' | 'clima' | 'permiso' | null = null
    if (!rec) {
      state = 'unrecorded'
    } else if (rec.status === 'PRESENT' || (!rec.absence && !rec.status)) {
      state = rec.clockOut ? 'present-out' : 'present-in'
    } else {
      state = 'falta'
      if (rec.status === 'REST_DAY') reason = 'descanso'
      else if (rec.status === 'SICK') reason = 'enfermo'
      else if (rec.status === 'WEATHER') reason = 'clima'
      else if (rec.status === 'SUSPENDED') reason = 'permiso'
      else reason = 'falta'
    }
    return { emp, rec, state, reason }
  })

  const presentCount = roster.filter((r) => r.state === 'present-in' || r.state === 'present-out').length
  const faltaCount = roster.filter((r) => r.state === 'falta').length

  const REASON_META: Record<NonNullable<typeof roster[number]['reason']>, { label: string; dot: string; bg: string; tx: string; br: string }> = {
    falta:    { label: 'Sin motivo', dot: '#ef4444', bg: 'var(--bad-50)',     tx: 'var(--bad-700)',     br: 'var(--bad-500)' },
    descanso: { label: 'Descanso',   dot: '#64748b', bg: 'var(--ink-100)',    tx: 'var(--ink-700)',     br: 'var(--ink-400)' },
    enfermo:  { label: 'Enfermo',    dot: '#f59e0b', bg: 'var(--warn-50)',    tx: 'var(--warn-700)',    br: 'var(--warn-500)' },
    clima:    { label: 'Clima',      dot: '#3b82f6', bg: '#eff6ff',           tx: '#1d4ed8',            br: '#3b82f6' },
    permiso:  { label: 'Permiso',    dot: '#8b5cf6', bg: 'var(--primary-50)', tx: 'var(--primary-700)', br: 'var(--primary-500)' },
  }
  const REASON_ORDER: Array<'falta' | 'descanso' | 'enfermo' | 'clima' | 'permiso'> = ['falta', 'descanso', 'enfermo', 'clima', 'permiso']
  const reasonBreakdown = REASON_ORDER
    .filter((id) => id !== 'falta')
    .map((id) => ({ id, ...REASON_META[id], n: roster.filter((r) => r.state === 'falta' && r.reason === id).length }))
    .filter((r) => r.n > 0)

  const setStateForEmployee = (emp: Employee, recordId: number | undefined, kind: 'present' | 'falta', reason: 'falta' | 'descanso' | 'enfermo' | 'clima' | 'permiso' = 'falta') => {
    if (kind === 'present') {
      clockIn.mutate({ employeeId: emp.id, recordId })
    } else if (reason === 'falta') {
      markAbsent.mutate({ employeeId: emp.id, recordId })
    } else {
      const status: AttendanceStatus =
        reason === 'descanso' ? 'REST_DAY'
        : reason === 'enfermo' ? 'SICK'
        : reason === 'clima' ? 'WEATHER'
        : 'SUSPENDED'
      setAttendanceStatus.mutate({ employeeId: emp.id, recordId, status, label: REASON_META[reason].label })
    }
  }

  return (
    <section className="space-y-5">
      <PageHeaderV2
        eyebrow={`PERSONAL · ${date}`}
        eyebrowDot
        title="Asistencia"
        subtitle={
          <>
            Marca quién vino hoy · Presente o Falta. Si quieres, ponle motivo a la falta.{' '}
            {hasRole('GERENTE') && (
              <NavLink to="/reporte-personal" className="font-semibold text-violet-600 no-underline hover:text-violet-700">
                Reporte de personal →
              </NavLink>
            )}
          </>
        }
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="tl-input"
              style={{ width: 160 }}
            />
            <Button
              kind="secondary"
              icon={<ICheck size={16} />}
              onClick={markAllPresent}
              disabled={clockIn.isPending || markAbsent.isPending || setAttendanceStatus.isPending}
            >
              Todos Presente
            </Button>
          </div>
        }
      />

      {records.error && <ErrorMessage message={records.error.message} />}
      {clockIn.error && <ErrorMessage message={clockIn.error.message} />}
      {markAbsent.error && <ErrorMessage message={markAbsent.error.message} />}
      {setAttendanceStatus.error && <ErrorMessage message={setAttendanceStatus.error.message} />}

      {/* Two big counts + reason breakdown — kit pattern */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '10px 18px', borderRadius: 14,
            background: 'var(--good-50)', border: '1px solid var(--good-500)',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#22c55e' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--good-700)' }}>Presente</span>
          <span className="tl2-mono-display" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--good-700)' }}>
            {presentCount}
          </span>
        </div>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '10px 18px', borderRadius: 14,
            background: faltaCount ? 'var(--bad-50)' : '#fff',
            border: `1px solid ${faltaCount ? 'var(--bad-500)' : 'var(--border-soft)'}`,
            opacity: faltaCount ? 1 : 0.6,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#ef4444' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: faltaCount ? 'var(--bad-700)' : 'var(--ink-500)' }}>Falta</span>
          <span className="tl2-mono-display" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: faltaCount ? 'var(--bad-700)' : 'var(--ink-400)' }}>
            {faltaCount}
          </span>
        </div>
        {reasonBreakdown.length > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginLeft: 2 }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>incluye</span>
            {reasonBreakdown.map((r) => (
              <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: r.tx, fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: r.dot }} />{r.n} {r.label.toLowerCase()}
              </span>
            ))}
          </div>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--ink-500)' }}>
          <b style={{ color: 'var(--good-700)' }}>{presentCount}</b> de <b style={{ color: 'var(--ink-900)' }}>{activeEmployees.length}</b> presentes
        </div>
      </div>

      {/* Unified roster */}
      <Panel flush>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 18px', background: 'var(--ink-50)', borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-500)' }}>
            Lavador
          </span>
          <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-500)' }}>
            Estado de hoy
          </span>
        </div>

        {roster.length === 0 && (
          <EmptyState
            icon={<ICalendar size={20} />}
            title="Sin lavadores activos"
            description="Da de alta lavadores en Catálogos para empezar a marcar asistencia."
            tone="info"
          />
        )}
        {roster.map(({ emp, rec, state, reason }, idx) => (
          <AttendanceRow
            key={emp.id}
            idx={idx}
            emp={emp}
            state={state}
            reason={reason}
            inTime={rec?.clockIn}
            outTime={rec?.clockOut}
            recordId={rec?.id}
            reasonMeta={REASON_META}
            reasonOrder={REASON_ORDER}
            busy={clockIn.isPending || markAbsent.isPending || setAttendanceStatus.isPending}
            onSet={(kind, r) => setStateForEmployee(emp, rec?.id, kind, r)}
            onClockOut={handleClockOut}
          />
        ))}
      </Panel>

      {clockOutId != null && (
        <Modal
          title="Registrar salida"
          narrow
          onClose={() => { setClockOutId(null); setClockOutTime('') }}
        >
          <div className="p-6">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink-700">Hora de salida</span>
              <input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="w-full"
                autoFocus
              />
            </label>
            {clockOut.error && <p className="mt-2 text-sm text-red-600">{clockOut.error.message}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button kind="ghost" onClick={() => { setClockOutId(null); setClockOutTime('') }}>Cancelar</Button>
              <Button kind="primary" disabled={!clockOutTime || clockOut.isPending} onClick={submitClockOut}>
                {clockOut.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} />}
    </section>
  )
}

/**
 * Roster row — kit AttendanceRow ported to real data. Visual primary is the
 * 2-way Presente / Falta segmented control. When Falta is on, an optional
 * Motivo dropdown surfaces (Sin motivo / Descanso / Enfermo / Clima / Permiso).
 * Clock-out icon-button appears on present-in rows.
 */
function AttendanceRow({
  idx,
  emp,
  state,
  reason,
  inTime,
  outTime,
  recordId,
  reasonMeta,
  reasonOrder,
  busy,
  onSet,
  onClockOut,
}: {
  idx: number
  emp: Employee
  state: 'present-in' | 'present-out' | 'falta' | 'unrecorded'
  reason: 'falta' | 'descanso' | 'enfermo' | 'clima' | 'permiso' | null
  inTime?: string | null
  outTime?: string | null
  recordId?: number
  reasonMeta: Record<'falta' | 'descanso' | 'enfermo' | 'clima' | 'permiso', { label: string; dot: string; bg: string; tx: string; br: string }>
  reasonOrder: Array<'falta' | 'descanso' | 'enfermo' | 'clima' | 'permiso'>
  busy: boolean
  onSet: (kind: 'present' | 'falta', reason?: 'falta' | 'descanso' | 'enfermo' | 'clima' | 'permiso') => void
  onClockOut: (recordId: number) => void
}) {
  const [pickMotivo, setPickMotivo] = useState(false)
  const present = state === 'present-in' || state === 'present-out'
  const falta = state === 'falta'
  const r = reason ?? 'falta'
  const rm = reasonMeta[r]
  const tone = nmTone(emp.fullName)
  const tint = present
    ? '#fff'
    : falta && r === 'falta'
      ? 'rgba(254,226,226,0.30)'
      : falta
        ? rm.bg + '88'
        : '#fff'

  const shiftLabel = emp.primaryShift
    ? emp.primaryShift === 'MATUTINO' ? 'Matutino' : 'Vespertino'
    : null

  return (
    <div
      style={{
        borderTop: idx === 0 ? 0 : '1px solid var(--ink-100)',
        background: tint,
        transition: 'background .2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', flexWrap: 'wrap' }}>
        <span
          style={{
            width: 40, height: 40, borderRadius: 11,
            background: tone, color: '#fff',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
            flex: '0 0 auto',
          }}
        >
          {nmInitials(emp.fullName)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.01em' }}>
            {emp.fullName}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>
            Lavador{shiftLabel ? ` · ${shiftLabel}` : ''}
            {state === 'present-in' && inTime && <> · entrada {formatLocalTime(inTime)}</>}
            {state === 'present-out' && inTime && outTime && <> · {formatLocalTime(inTime)} → {formatLocalTime(outTime)}</>}
          </div>
        </div>

        {/* Motivo dropdown — only when Falta */}
        {falta && (
          pickMotivo ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'flex-end', maxWidth: 360 }}>
              {reasonOrder.map((id) => {
                const meta = reasonMeta[id]
                const on = id === r
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { onSet('falta', id); setPickMotivo(false) }}
                    disabled={busy}
                    className="tl2-press"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px', borderRadius: 999,
                      cursor: busy ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                      background: on ? meta.dot : meta.bg,
                      color: on ? '#fff' : meta.tx,
                      border: `1px solid ${on ? meta.dot : meta.br}`,
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: on ? '#fff' : meta.dot }} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPickMotivo(true)}
              className="tl2-press"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 11px', borderRadius: 999,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                background: '#fff', color: rm.tx, border: `1px dashed ${rm.br}`,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: rm.dot }} />
              {r === 'falta' ? 'Motivo' : rm.label}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )
        )}

        {/* Clock-out icon — only when present-in (still on shift) */}
        {state === 'present-in' && recordId != null && (
          <button
            type="button"
            onClick={() => onClockOut(recordId)}
            className="tl2-press"
            title="Registrar salida"
            aria-label="Registrar salida"
            style={{
              width: 32, height: 32, borderRadius: 999,
              border: '1px solid var(--border-strong)', background: '#fff',
              color: 'var(--ink-700)', cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}
          >
            <ILock size={14} />
          </button>
        )}

        {/* Primary 2-way segmented */}
        <div
          style={{
            display: 'inline-flex', padding: 3, gap: 3,
            background: 'var(--ink-100)', borderRadius: 999, flex: '0 0 auto',
          }}
        >
          <button
            type="button"
            onClick={() => { onSet('present'); setPickMotivo(false) }}
            disabled={busy}
            className="tl2-press"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999, border: 0,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              background: present ? '#22c55e' : 'transparent',
              color: present ? '#fff' : 'var(--ink-500)',
              boxShadow: present ? '0 2px 6px -2px rgba(34,197,94,0.5)' : 'none',
              transition: 'all .15s',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {present && <ICheck size={13} stroke={2.8} />}Presente
          </button>
          <button
            type="button"
            onClick={() => onSet('falta', r)}
            disabled={busy}
            className="tl2-press"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999, border: 0,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              background: falta ? '#ef4444' : 'transparent',
              color: falta ? '#fff' : 'var(--ink-500)',
              boxShadow: falta ? '0 2px 6px -2px rgba(239,68,68,0.5)' : 'none',
              transition: 'all .15s',
              opacity: busy ? 0.6 : 1,
            }}
          >
            Falta
          </button>
        </div>
      </div>
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
