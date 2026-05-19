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
  await page.getByLabel('Tamano de vehiculo').selectOption({ label: catalog.sizeName })
  await page.locator('label').filter({ hasText: catalog.employeeName }).first().click()
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
  await page.getByLabel('Descripcion del vehiculo').fill(cashVehicle)
  await page.getByLabel('Forma de pago').selectOption('CASH')
  await page.getByTestId('ticket-submit').click()
  await page.waitForURL('**/tickets', { timeout: 10_000 })

  await page.goto('/tickets/nuevo')
  await fillTicketForm(page, fixture.catalog)
  await page.getByLabel('Descripcion del vehiculo').fill(cardVehicle)
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
  await createTicket(request, fixture.headers, fixture, { vehicleDescription: 'Dashboard cash', paymentMethod: 'CASH' })
  await createTicket(request, fixture.headers, fixture, { vehicleDescription: 'Dashboard card', paymentMethod: 'CARD' })

  await loginAsDueno(page)
  await page.goto('/')
  await page.getByLabel('Fecha').fill(businessDate)

  await expect(page.getByTestId('metric-carros-lavados-value')).toHaveText('2')
  await expect(page.getByTestId('metric-ingresos-autos-value')).toContainText('250')
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
