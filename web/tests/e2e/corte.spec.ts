import { test, expect } from '@playwright/test'
import { loginAsDueno, loginAsDuenoApi } from './helpers/auth'
import {
  closeShift,
  createAdvance,
  createCashCount,
  createExpense,
  createTicket,
  createWithdrawal,
  openDayAndShift,
  seedPricedCatalog,
  uniqueFutureDate,
} from './helpers/setup'

test('shift close cash count computes expected cash and variance', async ({ request }) => {
  const businessDate = uniqueFutureDate()
  const { headers } = await loginAsDuenoApi(request)
  const catalog = await seedPricedCatalog(request, headers, 'CORTE', '100.00')
  const dayShift = await openDayAndShift(request, headers, businessDate)
  const fixture = { headers, catalog, businessDate, ...dayShift }

  await createTicket(request, headers, fixture, { paymentMethod: 'CASH', vehicleDescription: 'Corte cash' })
  await createTicket(request, headers, fixture, { paymentMethod: 'CARD', vehicleDescription: 'Corte card' })
  await createExpense(request, headers, fixture, { amount: '30.00', description: 'Corte gasto' })
  await createWithdrawal(request, headers, fixture, { amount: '20.00', reason: 'Corte retiro' })
  await createAdvance(request, headers, { ...fixture, employeeId: catalog.employeeId }, { amount: '10.00', reason: 'Corte prestamo' })

  const cashCount = await createCashCount(request, headers, dayShift.shiftId, { bills20: 2 })
  const summary = await closeShift(request, headers, dayShift.shiftId, cashCount.id)

  expect(summary.closed).toBe(true)
  expect(Number(summary.ticketRevenue)).toBe(200)
  expect(Number(summary.cashRevenue)).toBe(100)
  expect(Number(summary.cardRevenue)).toBe(100)
  expect(Number(summary.expensesTotal)).toBe(30)
  expect(Number(summary.withdrawalsTotal)).toBe(20)
  expect(Number(summary.advancesTotal)).toBe(10)
  expect(Number(summary.expectedCash)).toBe(40)
  expect(Number(summary.totalCounted)).toBe(40)
  expect(Number(summary.variance)).toBe(0)
})

test('corte screen exposes cash count and close controls', async ({ page }) => {
  await loginAsDueno(page)
  await page.getByTestId('nav-corte').click()

  await expect(page.getByRole('heading', { name: 'Corte de turno' })).toBeVisible({ timeout: 8_000 })
  await expect(page.getByTestId('corte-shift-select')).toBeVisible()
  await expect(page.getByTestId('cash-input-bills100')).toBeVisible()
  await expect(page.getByTestId('corte-save-count')).toBeVisible()
  await expect(page.getByTestId('corte-close-shift')).toBeVisible()
})
