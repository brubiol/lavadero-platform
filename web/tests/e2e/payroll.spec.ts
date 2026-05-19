import { test, expect } from '@playwright/test'
import { loginAsDueno, loginAsDuenoApi } from './helpers/auth'
import {
  createTicket,
  openDayAndShift,
  previousSunday,
  seedPricedCatalog,
  uniqueFutureDate,
} from './helpers/setup'

test('payroll period lifecycle supports compute, adjustment, lock, and export', async ({ page, request }) => {
  const businessDate = uniqueFutureDate()
  const startDate = previousSunday(businessDate)
  const { headers } = await loginAsDuenoApi(request)
  const catalog = await seedPricedCatalog(request, headers, 'PAYROLL', '100.00')
  const dayShift = await openDayAndShift(request, headers, businessDate)
  const fixture = { headers, catalog, businessDate, ...dayShift }
  await createTicket(request, headers, fixture, { vehicleDescription: 'Payroll ticket' })

  await loginAsDueno(page)
  await page.getByTestId('nav-nomina').click()
  await expect(page.getByRole('heading', { name: 'Nomina' })).toBeVisible({ timeout: 8_000 })

  await page.getByTestId('payroll-start-date').fill(startDate)
  await page.getByTestId('payroll-create-period').click()
  await expect(page.getByText('Periodo creado')).toBeVisible({ timeout: 8_000 })

  await page.getByTestId('payroll-compute').click()
  await expect(page.getByText('Nomina calculada')).toBeVisible({ timeout: 8_000 })
  await expect(page.locator('tr').filter({ hasText: catalog.employeeName })).toBeVisible({ timeout: 8_000 })

  await page.getByLabel('Lavador').selectOption({ label: catalog.employeeName })
  await page.getByLabel('Tipo').selectOption('EARNING')
  await page.getByLabel('Concepto').selectOption('extra')
  await page.getByLabel('Monto').fill('25')
  await page.getByLabel('Nota').fill('Extra E2E')
  await page.getByTestId('payroll-add-adjustment').click()
  await expect(page.getByText('Ajuste guardado')).toBeVisible({ timeout: 8_000 })

  await page.getByTestId('payroll-compute').click()
  await expect(page.getByText('Nomina calculada')).toBeVisible({ timeout: 8_000 })
  await expect(page.getByText('Extra E2E')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('payroll-export').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/nomina-.*\.xlsx/)

  page.on('dialog', (dialog) => dialog.accept())
  await page.getByTestId('payroll-lock').click()
  await expect(page.getByText('Nomina bloqueada')).toBeVisible({ timeout: 8_000 })
  await expect(page.getByTestId('payroll-add-adjustment')).toBeDisabled()
  await expect(page.getByTestId('payroll-compute')).toBeDisabled()
})
