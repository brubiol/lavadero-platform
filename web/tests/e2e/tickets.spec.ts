import { test, expect, request as playwrightRequest } from '@playwright/test'

// Shared state set up once before all tests in this file
let authToken = ''
let createdNotaNumber = ''
const EMPLOYEE_NAME = 'E2E Lavador Prueba'
const SERVICE_CODE = 'E2E_SVC'
const SERVICE_NAME = 'E2E Servicio'
const SIZE_CODE = 'E2E_SIZE'
const SIZE_NAME = 'E2E Tamano'
const PRICE = '100.00'

// Use a fixed date far in the future to avoid conflicts with seed data
const TEST_DATE = '2029-07-15'

test.beforeAll(async () => {
  const ctx = await playwrightRequest.newContext({ baseURL: 'http://localhost:5173' })

  // Authenticate
  const loginRes = await ctx.post('/api/v1/auth/login', {
    data: { username: 'dueno', password: 'cambia-esto-123' },
  })
  const loginBody = await loginRes.json()
  authToken = loginBody.accessToken

  const headers = { Authorization: `Bearer ${authToken}` }

  // Create catalog entities
  const empRes = await ctx.post('/api/v1/employees', {
    headers,
    data: { fullName: EMPLOYEE_NAME, phone: '899-555-0199' },
  })
  const employee = await empRes.json()

  const svcRes = await ctx.post('/api/v1/service-types', {
    headers,
    data: { code: SERVICE_CODE, name: SERVICE_NAME },
  })
  const svc = await svcRes.json()

  const sizeRes = await ctx.post('/api/v1/vehicle-sizes', {
    headers,
    data: { code: SIZE_CODE, name: SIZE_NAME, sortOrder: 99 },
  })
  const size = await sizeRes.json()

  await ctx.post('/api/v1/service-prices', {
    headers,
    data: {
      serviceTypeId: svc.id,
      vehicleSizeId: size.id,
      amount: PRICE,
      currency: 'MXN',
      effectiveFrom: '2029-01-01',
    },
  })

  // Open business day and shift
  const dayRes = await ctx.post('/api/v1/business-days/open', {
    headers,
    data: { businessDate: TEST_DATE },
  })
  const day = await dayRes.json()

  await ctx.post('/api/v1/shifts/open', {
    headers,
    data: { businessDayId: day.id, shiftType: 'MATUTINO' },
  })

  await ctx.dispose()
})

async function loginAsDueno(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByLabel('Usuario').fill('dueno')
  await page.getByLabel('Contrasena').fill('cambia-esto-123')
  await page.getByRole('button', { name: 'Iniciar sesion' }).click()
  await expect(page.getByText('Carros lavados')).toBeVisible({ timeout: 10_000 })
}

test('new ticket form shows resolved price on service selection', async ({ page }) => {
  await loginAsDueno(page)
  await page.goto('/tickets/nuevo')

  await page.getByLabel('Servicio').selectOption({ label: SERVICE_NAME })
  await page.getByLabel('Tamano de vehiculo').selectOption({ label: SIZE_NAME })

  // Price preview panel should show a non-zero amount
  await expect(page.getByText(/\$\s*100/)).toBeVisible({ timeout: 5_000 })
})

test('can create a ticket and see it in ticket browser', async ({ page }) => {
  await loginAsDueno(page)
  await page.goto('/tickets/nuevo')

  await page.getByLabel('Servicio').selectOption({ label: SERVICE_NAME })
  await page.getByLabel('Tamano de vehiculo').selectOption({ label: SIZE_NAME })
  await page.getByLabel('Descripcion del vehiculo').fill('Tsuru rojo E2E')

  // Select the E2E employee checkbox
  await page.getByText(EMPLOYEE_NAME).click()

  await page.getByRole('button', { name: 'Guardar ticket' }).click()

  // Should redirect to /tickets after save
  await page.waitForURL('**/tickets', { timeout: 10_000 })
  const nota = page.getByText(/Tsuru rojo E2E/).first()
  await expect(nota).toBeVisible({ timeout: 8_000 })

  // Save nota number for the void test
  const row = await page.locator('tr').filter({ hasText: 'Tsuru rojo E2E' }).first()
  const notaCell = await row.locator('td').first().textContent()
  createdNotaNumber = notaCell?.trim() ?? ''
})

test('can void a ticket', async ({ page }) => {
  test.skip(!createdNotaNumber, 'Depends on previous test creating a ticket')

  await loginAsDueno(page)
  await page.goto('/tickets')

  // Find the row with our ticket and click Cancelar
  const row = page.locator('tr').filter({ hasText: createdNotaNumber })
  await row.getByRole('button', { name: 'Cancelar' }).click()

  // VoidDialog opens — fill reason and confirm
  await page.getByLabel('Motivo').fill('Test E2E void reason')
  await page.getByRole('button', { name: 'Confirmar cancelacion' }).click()

  // Ticket should disappear from ACTIVE list
  await expect(row).not.toBeVisible({ timeout: 8_000 })
})
