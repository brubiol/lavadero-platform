import { test, expect } from '@playwright/test'
import { loginAsDueno } from './helpers/auth'

test('dashboard loads with day status and daily metrics', async ({ page }) => {
  await loginAsDueno(page)
  await expect(page.getByTestId('metric-carros-lavados')).toBeVisible()
  await expect(page.getByTestId('panel-tickets-recientes')).toBeVisible()
})

test('DUENO can navigate to owner screens', async ({ page }) => {
  await loginAsDueno(page)

  await page.getByTestId('nav-ai').click()
  await expect(page.getByText('AI Command Center')).toBeVisible({ timeout: 8_000 })

  await page.getByTestId('nav-reportes').click()
  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible({ timeout: 8_000 })

  await page.getByTestId('nav-auditoria').click()
  await expect(page.getByRole('heading', { name: 'Auditoria' })).toBeVisible({ timeout: 8_000 })
  await expect(page.getByTestId('panel-filtros')).toBeVisible()
})

test('new ticket form renders for DUENO', async ({ page }) => {
  await loginAsDueno(page)
  await page.goto('/tickets/nuevo')
  await expect(page.getByText('Sin permiso')).not.toBeVisible({ timeout: 5_000 })
  await expect(page.getByTestId('ticket-form')).toBeVisible()
})
