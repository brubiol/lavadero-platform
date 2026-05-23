import { test, expect } from '@playwright/test'
import { loginAs, loginAsDuenoApi } from './helpers/auth'
import { seedRoleUsers } from './helpers/users'

test.beforeAll(async ({ request }) => {
  const { headers } = await loginAsDuenoApi(request)
  await seedRoleUsers(request, headers)
})

test('OPERADOR only sees daily operation navigation and is blocked from owner screens', async ({ page }) => {
  await loginAs(page, 'e2e_operador', 'e2eoperador123')

  await expect(page.getByTestId('nav-tickets')).toBeVisible()
  await expect(page.getByTestId('nav-gastos')).toBeVisible()
  await expect(page.getByTestId('nav-nomina')).not.toBeVisible()
  await expect(page.getByTestId('nav-reportes')).not.toBeVisible()
  await expect(page.getByTestId('nav-auditoria')).not.toBeVisible()

  await page.goto('/reportes')
  await expect(page.getByText('Sin permiso')).toBeVisible()
})

test('GERENTE can access payroll but not DUENO-only reports and audit', async ({ page }) => {
  await loginAs(page, 'e2e_gerente', 'e2egerente123')

  await expect(page.getByTestId('nav-nomina')).toBeVisible()
  await expect(page.getByTestId('nav-catalogos')).toBeVisible()
  await expect(page.getByTestId('nav-reportes')).not.toBeVisible()

  await page.getByTestId('nav-nomina').click()
  await expect(page.getByRole('heading', { name: 'Nomina' })).toBeVisible({ timeout: 8_000 })

  await page.goto('/auditoria')
  await expect(page.getByText('Sin permiso')).toBeVisible()
})

test('DUENO can access owner screens', async ({ page }) => {
  await loginAs(page, 'dueno', 'cambia-esto-123')

  await expect(page.getByTestId('nav-reportes')).toBeVisible()
  await expect(page.getByTestId('nav-auditoria')).toBeVisible()
  await page.getByTestId('nav-reportes').click()
  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible({ timeout: 8_000 })
})
