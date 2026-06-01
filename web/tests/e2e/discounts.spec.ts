import { test, expect, APIRequestContext, Page } from '@playwright/test'
import { BASE_URL, loginAsDueno, loginAsDuenoApi } from './helpers/auth'
import { Catalog, openDayAndShift, seedPricedCatalog, todayIso } from './helpers/setup'

async function seedDiscountFixture(request: APIRequestContext) {
  const { headers } = await loginAsDuenoApi(request)
  const catalog = await seedPricedCatalog(request, headers, 'DISC', '200.00')
  const dayShift = await openDayAndShift(request, headers, todayIso())
  return { headers, catalog, ...dayShift }
}

async function fillBaseTicket(page: Page, catalog: Catalog, description: string) {
  await expect(page.getByLabel('Turno')).not.toHaveValue('0', { timeout: 15_000 })
  await page.getByLabel('Servicio').selectOption({ label: catalog.serviceName })
  await page.locator('select[name="vehicleSizeId"]').selectOption({ label: catalog.sizeName })
  await page.getByPlaceholder('Ej. Tsuru rojo, Tacoma blanca').fill(description)
  await page.getByTestId('ticket-lavador-search').fill(catalog.employeeName)
  await expect(page.locator('button').filter({ hasText: catalog.employeeName }).first()).toBeVisible({ timeout: 10_000 })
  await page.locator('button').filter({ hasText: catalog.employeeName }).first().click()
}

test('discount field reduces price preview and saved ticket price', async ({ page, request }) => {
  const fixture = await seedDiscountFixture(request)
  const vehicle = `Discount E2E ${Date.now()}`

  await loginAsDueno(page)
  await page.goto('/tickets/nuevo')
  await fillBaseTicket(page, fixture.catalog, vehicle)
  await page.getByLabel('Descuento (%)').fill('25')
  await page.getByLabel('Motivo del descuento').fill('Cliente frecuente')

  await expect(page.getByTestId('summary-precio-preview-value')).toContainText('-25%')

  await page.getByTestId('ticket-submit').click()
  await page.waitForURL('**/tickets', { timeout: 10_000 })
  const row = page.locator('tr').filter({ hasText: vehicle }).first()
  await expect(row).toBeVisible({ timeout: 8_000 })
  await expect(row.getByText(/\$150/)).toBeVisible()
})

test('invalid discount values are rejected by the API contract', async ({ request }) => {
  const fixture = await seedDiscountFixture(request)
  const basePayload = {
    businessDayId: fixture.dayId,
    shiftId: fixture.shiftId,
    serviceTypeId: fixture.catalog.serviceTypeId,
    vehicleSizeId: fixture.catalog.vehicleSizeId,
    currency: 'MXN',
    vehicleDescription: 'Invalid discount',
    courtesy: false,
    employeeIds: [fixture.catalog.employeeId],
  }

  for (const discountPercent of [-1, 101, 'not-a-number']) {
    const res = await request.post(`${BASE_URL}/api/v1/tickets`, {
      headers: fixture.headers,
      data: { ...basePayload, discountPercent },
    })
    expect(res.status(), `discount ${discountPercent} should be rejected`).toBe(400)
  }
})

test('courtesy ticket is free and submits without a reason', async ({ page, request }) => {
  const fixture = await seedDiscountFixture(request)

  await loginAsDueno(page)
  await page.goto('/tickets/nuevo')
  await fillBaseTicket(page, fixture.catalog, `Courtesy E2E ${Date.now()}`)
  // Promo modes live behind a "Promos" selector; open it, then pick Cortesía.
  await page.getByRole('button', { name: 'Promos' }).click()
  await page.getByRole('button', { name: 'Cortesía' }).click()

  await expect(page.getByTestId('summary-precio-preview-value')).toContainText('$0.00')
  await page.getByTestId('ticket-submit').click()
  await page.waitForURL('**/tickets', { timeout: 10_000 })
})
