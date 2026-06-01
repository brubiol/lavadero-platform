import { test, expect } from '@playwright/test'
import { loginAsDueno, loginAsDuenoApi } from './helpers/auth'
import {
  createTicket,
  openDayAndShift,
  seedPricedCatalog,
  todayIso,
} from './helpers/setup'

// The v2 Nómina screen is a single "current week" flow: create the current
// week, the roster auto-computes, capture per-row adjustments inline, export to
// Excel, then close the week (which locks it and records the pay). The ticket is
// seeded for TODAY so the lavador lands in the current payroll week.
test('payroll current week: roster, inline adjustment, export, and close', async ({ page, request }) => {
  const businessDate = todayIso()
  const { headers } = await loginAsDuenoApi(request)
  const catalog = await seedPricedCatalog(request, headers, 'PAYROLL', '100.00')
  const dayShift = await openDayAndShift(request, headers, businessDate)
  const fixture = { headers, catalog, businessDate, ...dayShift }
  await createTicket(request, headers, fixture, { vehicleDescription: 'Payroll ticket' })

  await loginAsDueno(page)
  await page.getByTestId('nav-nomina').click()
  await expect(page.getByRole('heading', { name: 'Nómina', exact: true })).toBeVisible({ timeout: 8_000 })

  // Create the current week if it doesn't exist yet (fresh DB in CI).
  const crear = page.getByRole('button', { name: 'Crear semana actual' })
  if (await crear.first().isVisible().catch(() => false)) {
    await crear.first().click()
  }

  const row = page.locator('.pr-row').filter({ hasText: catalog.employeeName })
  await expect(row).toBeVisible({ timeout: 8_000 })

  // Inline EARNING adjustment via the row "+" trigger. Manual adjustments are
  // the only ledger chips with a delete control, so the count is a clean signal.
  await row.getByRole('button', { name: 'Agregar extra o bono' }).click()
  const adjust = row.locator('.pr-adjust')
  await adjust.getByPlaceholder('0').fill('37')
  await adjust.getByRole('button', { name: 'Agregar' }).click()
  await expect(row.locator('.pr-chip__del')).toHaveCount(1, { timeout: 8_000 })

  // Export the week to Excel.
  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('payroll-export').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/nomina-.*\.xlsx/)

  // Close the week — accept the confirm dialog, then the locked banner appears.
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByTestId('payroll-close-week').click()
  await expect(page.getByText('Esta semana ya está cerrada')).toBeVisible({ timeout: 8_000 })
})
