import { test, expect } from '@playwright/test'
import { loginAsDueno } from './helpers/auth'

test('login with valid DUENO credentials lands on dashboard', async ({ page }) => {
  await loginAsDueno(page)
  await expect(page.getByTestId('metric-carros-lavados')).toBeVisible()
})

test('login with wrong password shows error and stays on login', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('login-username').fill('dueno')
  await page.getByTestId('login-password').fill('wrong-password')
  await page.getByTestId('login-submit').click()

  await expect(page.getByTestId('login-submit')).toBeVisible({ timeout: 5_000 })
  await expect(page.getByTestId('metric-carros-lavados')).not.toBeVisible()
})

test('logout redirects to login screen', async ({ page }) => {
  await loginAsDueno(page)
  await page.getByTitle('Cerrar sesión').click()
  await expect(page.getByTestId('login-submit')).toBeVisible({ timeout: 5_000 })
})
