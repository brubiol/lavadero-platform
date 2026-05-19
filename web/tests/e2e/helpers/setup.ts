import { expect, APIRequestContext } from '@playwright/test'
import { BASE_URL } from './auth'

export type Catalog = {
  employeeId: number
  serviceTypeId: number
  vehicleSizeId: number
  employeeName: string
  serviceName: string
  sizeName: string
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

export function runId(): string {
  return Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0')
}

export function uniqueFutureDate(offsetDays = 0): string {
  const numericId = Number(runId())
  const date = new Date(Date.UTC(2040, 0, 1 + (numericId % 2000) + offsetDays))
  return date.toISOString().slice(0, 10)
}

export function previousSunday(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - date.getUTCDay())
  return date.toISOString().slice(0, 10)
}

export async function seedCatalog(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  prefix: string,
): Promise<Catalog> {
  const id = runId()
  const employeeName = `${prefix} Lavador ${id}`
  const serviceCode = `${prefix}_SVC_${id}`
  const serviceName = `${prefix} Servicio ${id}`
  const sizeCode = `${prefix}_SIZE_${id}`
  const sizeName = `${prefix} Tamano ${id}`

  const empRes = await ctx.post(`${BASE_URL}/api/v1/employees`, {
    headers,
    data: { fullName: employeeName, phone: '899-555-0100' },
  })
  expect(empRes.status(), `create employee ${employeeName}`).toBe(201)
  const employeeId = (await empRes.json()).id as number

  const svcRes = await ctx.post(`${BASE_URL}/api/v1/service-types`, {
    headers,
    data: { code: serviceCode, name: serviceName },
  })
  expect(svcRes.status(), `create service ${serviceCode}`).toBe(201)
  const serviceTypeId = (await svcRes.json()).id as number

  const sizeRes = await ctx.post(`${BASE_URL}/api/v1/vehicle-sizes`, {
    headers,
    data: { code: sizeCode, name: sizeName, sortOrder: 50 },
  })
  expect(sizeRes.status(), `create size ${sizeCode}`).toBe(201)
  const vehicleSizeId = (await sizeRes.json()).id as number

  return { employeeId, serviceTypeId, vehicleSizeId, employeeName, serviceName, sizeName }
}

export async function setServicePrice(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  catalog: Pick<Catalog, 'serviceTypeId' | 'vehicleSizeId'>,
  amount: string,
  effectiveFrom = '2020-01-01',
) {
  const res = await ctx.post(`${BASE_URL}/api/v1/service-prices`, {
    headers,
    data: {
      serviceTypeId: catalog.serviceTypeId,
      vehicleSizeId: catalog.vehicleSizeId,
      amount,
      currency: 'MXN',
      effectiveFrom,
    },
  })
  expect(res.status(), 'create service price').toBe(201)
}

export async function seedPricedCatalog(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  prefix: string,
  amount = '100.00',
  effectiveFrom = '2020-01-01',
): Promise<Catalog> {
  const catalog = await seedCatalog(ctx, headers, prefix)
  await setServicePrice(ctx, headers, catalog, amount, effectiveFrom)
  return catalog
}

export type OpenDayShift = { dayId: number; shiftId: number }

export async function openDayAndShift(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  businessDate: string = todayIso(),
  shiftType: 'MATUTINO' | 'VESPERTINO' = 'MATUTINO',
): Promise<OpenDayShift> {
  // Open day (idempotent)
  const dayRes = await ctx.post(`${BASE_URL}/api/v1/business-days/open`, {
    headers,
    data: { businessDate },
  })
  let dayId: number
  if (dayRes.status() === 201) {
    dayId = (await dayRes.json()).id
  } else {
    // Already open — fetch it
    const listRes = await ctx.get(`${BASE_URL}/api/v1/business-days?from=${businessDate}&to=${businessDate}`, { headers })
    expect(listRes.status(), 'list business days').toBe(200)
    const days = await listRes.json()
    expect(days.length, `business day for ${businessDate} should exist`).toBeGreaterThan(0)
    dayId = days[0].id
  }

  // Open shift (idempotent — if already open, find it via summary endpoint)
  const shiftRes = await ctx.post(`${BASE_URL}/api/v1/shifts/open`, {
    headers,
    data: { businessDayId: dayId, shiftType },
  })
  let shiftId: number
  if (shiftRes.status() === 201) {
    shiftId = (await shiftRes.json()).id
  } else {
    // Already open — get from day shifts list
    const shiftsRes = await ctx.get(`${BASE_URL}/api/v1/shifts?business_day_id=${dayId}`, { headers })
    expect(shiftsRes.status(), 'list shifts').toBe(200)
    const shifts = await shiftsRes.json()
    const found = shifts.find((s: { shiftType: string; status: string }) => s.shiftType === shiftType && s.status === 'OPEN')
    expect(found, `${shiftType} shift should already be open`).toBeTruthy()
    shiftId = found.id
  }

  return { dayId, shiftId }
}

export type TicketOpts = {
  vehicleDescription?: string
  paymentMethod?: 'CASH' | 'CARD'
  courtesy?: boolean
  courtesyReason?: string
  discountPercent?: number
}

export async function createTicket(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  fixture: { dayId: number; shiftId: number; catalog: Catalog },
  opts: TicketOpts = {},
): Promise<{ id: number; notaNumber: string; priceAmount: number }> {
  const res = await ctx.post(`${BASE_URL}/api/v1/tickets`, {
    headers,
    data: {
      businessDayId: fixture.dayId,
      shiftId: fixture.shiftId,
      serviceTypeId: fixture.catalog.serviceTypeId,
      vehicleSizeId: fixture.catalog.vehicleSizeId,
      currency: 'MXN',
      vehicleDescription: opts.vehicleDescription ?? 'Tsuru E2E',
      paymentMethod: opts.paymentMethod ?? 'CASH',
      courtesy: opts.courtesy ?? false,
      courtesyReason: opts.courtesyReason,
      discountPercent: opts.discountPercent ?? 0,
      employeeIds: [fixture.catalog.employeeId],
    },
  })
  expect(res.status(), `create ticket (${opts.vehicleDescription ?? 'default'})`).toBe(201)
  const body = await res.json()
  return { id: body.id, notaNumber: body.notaNumber, priceAmount: body.priceAmount }
}

export async function createExpense(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  fixture: { dayId: number; shiftId: number; businessDate: string },
  opts: { amount: string; description: string; category?: string },
): Promise<{ id: number; amount: number }> {
  const res = await ctx.post(`${BASE_URL}/api/v1/expenses`, {
    headers,
    data: {
      businessDayId: fixture.dayId,
      shiftId: fixture.shiftId,
      expenseDate: fixture.businessDate,
      category: opts.category ?? 'MATERIAL',
      description: opts.description,
      amount: opts.amount,
      currency: 'MXN',
    },
  })
  expect(res.status(), `create expense ${opts.description}`).toBe(201)
  return res.json()
}

export async function createWithdrawal(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  fixture: { dayId: number; shiftId: number; businessDate: string },
  opts: { amount: string; reason: string },
): Promise<{ id: number; amount: number }> {
  const res = await ctx.post(`${BASE_URL}/api/v1/withdrawals`, {
    headers,
    data: {
      businessDayId: fixture.dayId,
      shiftId: fixture.shiftId,
      withdrawalDate: fixture.businessDate,
      amount: opts.amount,
      reason: opts.reason,
    },
  })
  expect(res.status(), `create withdrawal ${opts.reason}`).toBe(201)
  return res.json()
}

export async function createAdvance(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  fixture: { dayId: number; shiftId: number; businessDate: string; employeeId: number },
  opts: { amount: string; reason: string },
): Promise<{ id: number; amount: number }> {
  const res = await ctx.post(`${BASE_URL}/api/v1/employee-advances`, {
    headers,
    data: {
      businessDayId: fixture.dayId,
      shiftId: fixture.shiftId,
      employeeId: fixture.employeeId,
      advanceDate: fixture.businessDate,
      amount: opts.amount,
      reason: opts.reason,
    },
  })
  expect(res.status(), `create advance ${opts.reason}`).toBe(201)
  return res.json()
}

export async function createCashCount(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  shiftId: number,
  counts: Partial<Record<'bills1000' | 'bills500' | 'bills200' | 'bills100' | 'bills50' | 'bills20' | 'coins10' | 'coins5' | 'coins2' | 'coins1' | 'coins05', number>> & { morrallaTotal?: string } = {},
): Promise<{ id: number; totalCounted: number }> {
  const res = await ctx.post(`${BASE_URL}/api/v1/cash-counts`, {
    headers,
    data: {
      shiftId,
      currency: 'MXN',
      bills1000: counts.bills1000 ?? 0,
      bills500: counts.bills500 ?? 0,
      bills200: counts.bills200 ?? 0,
      bills100: counts.bills100 ?? 0,
      bills50: counts.bills50 ?? 0,
      bills20: counts.bills20 ?? 0,
      coins10: counts.coins10 ?? 0,
      coins5: counts.coins5 ?? 0,
      coins2: counts.coins2 ?? 0,
      coins1: counts.coins1 ?? 0,
      coins05: counts.coins05 ?? 0,
      morrallaTotal: counts.morrallaTotal ?? '0.00',
    },
  })
  expect(res.status(), `create cash count for shift ${shiftId}`).toBe(201)
  return res.json()
}

export async function closeShift(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  shiftId: number,
  cashCountId: number,
  closingReason?: string,
) {
  const res = await ctx.post(`${BASE_URL}/api/v1/shifts/${shiftId}/close`, {
    headers,
    data: { cashCountId, closingReason },
  })
  expect(res.status(), `close shift ${shiftId}`).toBe(200)
  return res.json()
}

export async function voidTicket(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  ticketId: number,
  reason: string,
) {
  const res = await ctx.post(`${BASE_URL}/api/v1/tickets/${ticketId}/void`, {
    headers,
    data: { reason },
  })
  expect(res.status(), `void ticket ${ticketId}`).toBe(200)
}
