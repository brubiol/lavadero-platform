import { test, expect, APIRequestContext, Page } from '@playwright/test'
import { loginAsDueno, loginAsDuenoApi } from './helpers/auth'
import {
  Catalog,
  createTicket,
  openDayAndShift,
  seedPricedCatalog,
  todayIso,
  uniqueFutureDate,
} from './helpers/setup'

async function seedTicketFixture(
  request: APIRequestContext,
  prefix: string,
  businessDate = todayIso(),
  price = '100.00',
) {
  const { headers } = await loginAsDuenoApi(request)
  const catalog = await seedPricedCatalog(request, headers, prefix, price)
  const dayShift = await openDayAndShift(request, headers, businessDate)
  return { headers, catalog, businessDate, ...dayShift }
}

async function fillTicketForm(page: Page, catalog: Catalog) {
  await expect(page.getByLabel('Turno')).not.toHaveValue('0', { timeout: 15_000 })
  await page.getByLabel('Servicio').selectOption({ label: catalog.serviceName })
  await page.getByLabel('Vehículo').selectOption({ label: catalog.sizeName })
  await page.getByPlaceholder('Buscar lavador...').fill(catalog.employeeName)
  await expect(page.locator('button').filter({ hasText: catalog.employeeName }).first()).toBeVisible({ timeout: 10_000 })
  await page.locator('button').filter({ hasText: catalog.employeeName }).first().click()
}

test('new ticket form shows resolved price on service selection', async ({ page, request }) => {
  const fixture = await seedTicketFixture(request, 'E2E_PRICE')

  await loginAsDueno(page)
  await page.goto('/tickets/nuevo')
  await fillTicketForm(page, fixture.catalog)

  await expect(page.getByTestId('summary-precio-preview-value')).toContainText('$')
})

test('can create cash and card tickets and see payment labels in ticket browser', async ({ page, request }) => {
  const fixture = await seedTicketFixture(request, 'E2E_PAY')
  const cashVehicle = `Cash E2E ${Date.now()}`
  const cardVehicle = `Card E2E ${Date.now()}`

  await loginAsDueno(page)
  await page.goto('/tickets/nuevo')
  await fillTicketForm(page, fixture.catalog)
  await page.getByPlaceholder('Ej. Tsuru rojo, Tacoma blanca').fill(cashVehicle)
  await page.getByLabel('Forma de pago').selectOption('CASH')
  await page.getByTestId('ticket-submit').click()
  await page.waitForURL('**/tickets', { timeout: 10_000 })

  await page.goto('/tickets/nuevo')
  await fillTicketForm(page, fixture.catalog)
  await page.getByPlaceholder('Ej. Tsuru rojo, Tacoma blanca').fill(cardVehicle)
  await page.getByLabel('Forma de pago').selectOption('CARD')
  await page.getByTestId('ticket-submit').click()
  await page.waitForURL('**/tickets', { timeout: 10_000 })

  const cashRow = page.locator('tr').filter({ hasText: cashVehicle }).first()
  const cardRow = page.locator('tr').filter({ hasText: cardVehicle }).first()
  await expect(cashRow).toBeVisible({ timeout: 8_000 })
  await expect(cashRow.getByText('Efectivo')).toBeVisible()
  await expect(cardRow).toBeVisible({ timeout: 8_000 })
  await expect(cardRow.getByText('Tarjeta')).toBeVisible()
})

test('dashboard counters match seeded ticket totals for selected date', async ({ page, request }) => {
  const businessDate = uniqueFutureDate()
  const fixture = await seedTicketFixture(request, 'E2E_DASH', businessDate, '125.00')

  // Read the baseline count before seeding (the DB persists across tests in a run).
  // Wait for the metric to settle on a numeric value — it shows "..." while loading.
  await loginAsDueno(page)
  await page.goto('/')
  await page.getByLabel('Fecha').fill(businessDate)
  await expect(page.getByTestId('metric-carros-lavados-value')).toHaveText(/^\d+$/, { timeout: 8_000 })
  const baseCount = parseInt((await page.getByTestId('metric-carros-lavados-value').textContent()) ?? '0', 10)

  await createTicket(request, fixture.headers, fixture, { vehicleDescription: 'Dashboard cash', paymentMethod: 'CASH' })
  await createTicket(request, fixture.headers, fixture, { vehicleDescription: 'Dashboard card', paymentMethod: 'CARD' })

  await page.goto('/')
  await page.getByLabel('Fecha').fill(businessDate)

  await expect(page.getByTestId('metric-carros-lavados-value')).toHaveText(String(baseCount + 2), { timeout: 8_000 })
  await expect(page.getByTestId('metric-ingresos-autos-value')).toContainText(String((baseCount + 2) * 125), { timeout: 8_000 })
})

test('can void a freshly seeded ticket without depending on another test', async ({ page, request }) => {
  const fixture = await seedTicketFixture(request, 'E2E_VOID')
  const ticket = await createTicket(request, fixture.headers, fixture, {
    vehicleDescription: `Void E2E ${Date.now()}`,
  })

  await loginAsDueno(page)
  await page.goto('/tickets')

  const row = page.locator('tr').filter({ hasText: ticket.notaNumber }).first()
  await expect(row).toBeVisible({ timeout: 8_000 })
  await row.getByRole('button', { name: 'Cancelar' }).click()
  await page.getByLabel('Motivo').fill('Test E2E void reason')
  await page.getByRole('button', { name: 'Confirmar cancelacion' }).click()

  await expect(row).not.toBeVisible({ timeout: 8_000 })
})
