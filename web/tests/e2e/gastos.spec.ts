import { test, expect } from '@playwright/test'
import { loginAsDueno, loginAsDuenoApi } from './helpers/auth'
import { openDayAndShift, seedCatalog, todayIso } from './helpers/setup'

test.beforeEach(async ({ request }) => {
  const { headers } = await loginAsDuenoApi(request)
  await seedCatalog(request, headers, 'GASTOS')
  await openDayAndShift(request, headers, todayIso())
})

test('gastos screen renders filters, action buttons, and totals', async ({ page }) => {
  await loginAsDueno(page)
  await page.getByTestId('nav-gastos').click()

  await expect(page.locator('h2').filter({ hasText: 'Gastos' })).toBeVisible({ timeout: 8_000 })
  await expect(page.getByTestId('panel-filtros')).toBeVisible()
  await expect(page.getByTestId('gastos-new-expense')).toBeVisible()
  await expect(page.getByTestId('gastos-new-withdrawal')).toBeVisible()
  await expect(page.getByTestId('gastos-new-advance')).toBeVisible()
  await expect(page.getByTestId('metric-total-salida')).toBeVisible()
})

test('can create gasto, retiro, and prestamo from the UI', async ({ page }) => {
  const suffix = Date.now()
  const expenseText = `Esponjas E2E ${suffix}`
  const withdrawalText = `Retiro E2E ${suffix}`
  const advanceText = `Prestamo E2E ${suffix}`

  await loginAsDueno(page)
  await page.getByTestId('nav-gastos').click()

  await page.getByTestId('gastos-new-expense').click()
  let modal = page.getByTestId('modal-nuevo-gasto')
  await modal.getByLabel('Fecha').fill(todayIso())
  await modal.locator('select[name="category"]').selectOption('MATERIAL')
  await modal.getByLabel('Monto').fill('150')
  await modal.getByLabel('Descripción').fill(expenseText)
  await modal.getByRole('button', { name: 'Guardar gasto' }).click()
  await expect(page.locator('tr').filter({ hasText: expenseText })).toBeVisible({ timeout: 8_000 })

  await page.getByTestId('gastos-new-withdrawal').click()
  modal = page.getByTestId('modal-nuevo-retiro')
  await modal.getByLabel('Fecha').fill(todayIso())
  await modal.getByLabel('Monto').fill('75')
  await modal.getByLabel('Motivo').fill(withdrawalText)
  await modal.getByRole('button', { name: 'Guardar retiro' }).click()
  await expect(page.locator('tr').filter({ hasText: withdrawalText })).toBeVisible({ timeout: 8_000 })

  await page.getByTestId('gastos-new-advance').click()
  modal = page.getByTestId('modal-nuevo-prestamo')
  await modal.getByLabel('Fecha').fill(todayIso())
  await modal.getByLabel('Lavador').selectOption({ index: 1 })
  await modal.getByLabel('Monto').fill('60')
  await modal.getByLabel('Motivo').fill(advanceText)
  await modal.getByRole('button', { name: 'Guardar prestamo' }).click()
  await expect(page.locator('tr').filter({ hasText: advanceText })).toBeVisible({ timeout: 8_000 })

  await expect(page.getByTestId('metric-gastos-value')).toBeVisible()
  await expect(page.getByTestId('metric-retiros-value')).toBeVisible()
  await expect(page.getByTestId('metric-prestamos-value')).toBeVisible()
})

test('category filter narrows the gastos table', async ({ page }) => {
  await loginAsDueno(page)
  await page.getByTestId('nav-gastos').click()
  await expect(page.locator('h2').filter({ hasText: 'Gastos' })).toBeVisible({ timeout: 8_000 })

  await page.getByLabel('Categoría').selectOption('CFE')
  await expect(page.locator('td').filter({ hasText: 'Material' })).toHaveCount(0, { timeout: 5_000 })
})
