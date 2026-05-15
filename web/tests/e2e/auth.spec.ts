import { test, expect } from '@playwright/test'

test('login with valid DUENO credentials lands on dashboard', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Usuario').fill('dueno')
  await page.getByLabel('Contrasena').fill('cambia-esto-123')
  await page.getByRole('button', { name: 'Iniciar sesion' }).click()
  await expect(page.getByText('Carros lavados')).toBeVisible({ timeout: 10_000 })
})

test('login with wrong password shows error and stays on login', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Usuario').fill('dueno')
  await page.getByLabel('Contrasena').fill('wrong-password')
  await page.getByRole('button', { name: 'Iniciar sesion' }).click()
  await expect(page.getByRole('button', { name: 'Iniciar sesion' })).toBeVisible({ timeout: 5_000 })
  await expect(page.getByText('Carros lavados')).not.toBeVisible()
})

test('logout redirects to login screen', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Usuario').fill('dueno')
  await page.getByLabel('Contrasena').fill('cambia-esto-123')
  await page.getByRole('button', { name: 'Iniciar sesion' }).click()
  await expect(page.getByText('Carros lavados')).toBeVisible({ timeout: 10_000 })
  await page.getByTitle('Cerrar sesion').click()
  await expect(page.getByRole('button', { name: 'Iniciar sesion' })).toBeVisible({ timeout: 5_000 })
})
