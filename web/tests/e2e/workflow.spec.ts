import { test, expect } from '@playwright/test'

async function loginAsDueno(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByLabel('Usuario').fill('dueno')
  await page.getByLabel('Contrasena').fill('cambia-esto-123')
  await page.getByRole('button', { name: 'Iniciar sesion' }).click()
  await expect(page.getByText('Carros lavados')).toBeVisible({ timeout: 10_000 })
}

test('dashboard loads with day status card', async ({ page }) => {
  await loginAsDueno(page)
  // Either the open-day button or the shift badge is visible
  const hasOpenButton = await page.getByRole('button', { name: /Abrir dia de hoy/i }).isVisible().catch(() => false)
  const hasShiftBadge = await page.getByText('Carros lavados').isVisible()
  expect(hasOpenButton || hasShiftBadge).toBe(true)
})

test('DUENO can navigate to AI screen', async ({ page }) => {
  await loginAsDueno(page)
  await page.getByRole('link', { name: 'AI' }).click()
  await expect(page.getByText('AI Command Center')).toBeVisible({ timeout: 8_000 })
})

test('DUENO can navigate to Reports screen', async ({ page }) => {
  await loginAsDueno(page)
  await page.getByRole('link', { name: 'Reportes' }).click()
  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible({ timeout: 8_000 })
})

test('new ticket form renders for DUENO', async ({ page }) => {
  await loginAsDueno(page)
  await page.goto('/tickets/nuevo')
  await expect(page.getByText('Sin permiso')).not.toBeVisible({ timeout: 5_000 })
  await expect(page.getByLabel('Descripcion del vehiculo')).toBeVisible()
})

test('auditoria screen renders audit filter for DUENO', async ({ page }) => {
  await loginAsDueno(page)
  await page.getByRole('link', { name: 'Auditoria' }).click()
  await expect(page.getByRole('heading', { name: 'Auditoria' })).toBeVisible({ timeout: 8_000 })
  await expect(page.getByRole('heading', { name: 'Filtros' })).toBeVisible()
})
