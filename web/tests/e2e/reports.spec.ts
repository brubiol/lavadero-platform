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

test('daily reports show seeded totals for an isolated business date', async ({ page, request }) => {
  const businessDate = uniqueFutureDate()
  const { headers } = await loginAsDuenoApi(request)
  const catalog = await seedPricedCatalog(request, headers, 'REPORT', '100.00', '2020-01-01')
  const dayShift = await openDayAndShift(request, headers, businessDate)
  const fixture = { headers, catalog, businessDate, ...dayShift }

  await createTicket(request, headers, fixture, { vehicleDescription: 'Reports cash', paymentMethod: 'CASH' })
  await createTicket(request, headers, fixture, { vehicleDescription: 'Reports card', paymentMethod: 'CARD' })
  await createExpense(request, headers, { ...fixture, businessDate }, { amount: '30.00', description: 'Reports gasto' })
  await createWithdrawal(request, headers, { ...fixture, businessDate }, { amount: '20.00', reason: 'Reports retiro' })
  await createAdvance(request, headers, { ...fixture, businessDate, employeeId: catalog.employeeId }, { amount: '10.00', reason: 'Reports prestamo' })
  const count = await createCashCount(request, headers, dayShift.shiftId, { bills20: 2 })
  await closeShift(request, headers, dayShift.shiftId, count.id)

  await loginAsDueno(page)
  await page.getByTestId('nav-reportes').click()
  await page.getByTestId('reports-from').fill(businessDate)
  await page.getByTestId('reports-to').fill(businessDate)

  const rangeMetrics = page.getByTestId('reports-range-metrics')
  await expect(rangeMetrics.getByTestId('metric-carros-value')).toHaveText('2')
  await expect(rangeMetrics.getByTestId('metric-ingresos-value')).toContainText('200')
  await expect(rangeMetrics.getByTestId('metric-salidas-value')).toContainText('60')
  await expect(rangeMetrics.getByTestId('metric-resultado-value')).toContainText('140')

  const preview = page.getByTestId('panel-export-preview')
  await expect(preview.getByTestId('summary-retiros-value')).toContainText('20')
  await expect(preview.getByTestId('summary-prestamos-value')).toContainText('10')

  await expect(page.getByTestId('reports-cash-variance').getByTestId('metric-diferencia-value')).toContainText('0')
})
