import { test, expect, request as playwrightRequest } from '@playwright/test'

// Use today's date so the frontend (which only loads today's business day) can find it
const TEST_DATE = new Date().toISOString().split('T')[0]

// Unique suffix per run so re-running locally doesn't hit uniqueness constraints
const RUN_ID = Date.now().toString().slice(-6)
const EMPLOYEE_NAME = `E2E Lavador ${RUN_ID}`
const SERVICE_CODE = `E2E_SVC_${RUN_ID}`
const SERVICE_NAME = `E2E Servicio ${RUN_ID}`
const SIZE_CODE = `E2E_SIZE_${RUN_ID}`
const SIZE_NAME = `E2E Tamano ${RUN_ID}`

let createdNotaNumber = ''

test.beforeAll(async () => {
  const ctx = await playwrightRequest.newContext({ baseURL: 'http://localhost:5173' })

  // Authenticate
  const loginRes = await ctx.post('/api/v1/auth/login', {
    data: { username: 'dueno', password: 'cambia-esto-123' },
  })
  const loginBody = await loginRes.json()
  const headers = { Authorization: `Bearer ${loginBody.accessToken}` }

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
      amount: '100.00',
      currency: 'MXN',
      effectiveFrom: '2020-01-01',
    },
  })

  // Open business day for today (may already exist — ignore conflict)
  const dayRes = await ctx.post('/api/v1/business-days/open', {
    headers,
    data: { businessDate: TEST_DATE },
  })

  let dayId: number
  if (dayRes.status() === 201) {
    dayId = (await dayRes.json()).id
  } else {
    // Business day already open for today — fetch it
    const listRes = await ctx.get(`/api/v1/business-days?from=${TEST_DATE}&to=${TEST_DATE}`, { headers })
    const days = await listRes.json()
    dayId = days[0].id
  }

  // Open a shift (ignore conflict if one is already open)
  await ctx.post('/api/v1/shifts/open', {
    headers,
    data: { businessDayId: dayId, shiftType: 'MATUTINO' },
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

async function fillTicketForm(page: import('@playwright/test').Page) {
  // Wait for the shift to auto-select — proves usePhaseData() has finished loading
  // and the form values have stabilized. Without this, a mid-load form reset
  // wipes out any selections we made before the data arrived.
  await expect(page.getByLabel('Turno')).not.toHaveValue('0', { timeout: 15_000 })

  await page.getByLabel('Servicio').selectOption({ label: SERVICE_NAME })
  await page.getByLabel('Tamano de vehiculo').selectOption({ label: SIZE_NAME })
}

test('new ticket form shows resolved price on service selection', async ({ page }) => {
  await loginAsDueno(page)
  await page.goto('/tickets/nuevo')

  await fillTicketForm(page)

  // "Precio preview" row in the Resumen panel should show a peso amount
  await expect(page.getByText('Sin precio')).not.toBeVisible({ timeout: 8_000 })
  await expect(page.locator('text=Precio preview').locator('..').getByText(/\$/)).toBeVisible({ timeout: 8_000 })
})

test('can create a ticket and see it in ticket browser', async ({ page }) => {
  await loginAsDueno(page)
  await page.goto('/tickets/nuevo')

  await fillTicketForm(page)
  await page.getByLabel('Descripcion del vehiculo').fill('Tsuru rojo E2E')

  // Click the label wrapping the employee checkbox
  await page.locator('label').filter({ hasText: EMPLOYEE_NAME }).first().click()

  await page.getByRole('button', { name: 'Guardar ticket' }).click()

  // Should redirect to /tickets after save
  await page.waitForURL('**/tickets', { timeout: 10_000 })
  await expect(page.getByText(/Tsuru rojo E2E/).first()).toBeVisible({ timeout: 8_000 })

  // Save nota number for the void test
  const row = page.locator('tr').filter({ hasText: 'Tsuru rojo E2E' }).first()
  createdNotaNumber = (await row.locator('td').first().textContent())?.trim() ?? ''
})

test('can void a ticket', async ({ page }) => {
  test.skip(!createdNotaNumber, 'Depends on previous test creating a ticket')

  await loginAsDueno(page)
  await page.goto('/tickets')

  const row = page.locator('tr').filter({ hasText: createdNotaNumber })
  await row.getByRole('button', { name: 'Cancelar' }).click()

  await page.getByLabel('Motivo').fill('Test E2E void reason')
  await page.getByRole('button', { name: 'Confirmar cancelacion' }).click()

  await expect(row).not.toBeVisible({ timeout: 8_000 })
})
