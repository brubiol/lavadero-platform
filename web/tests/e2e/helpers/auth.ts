import { expect, Page, APIRequestContext } from '@playwright/test'

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5174'

export async function loginAsDueno(page: Page) {
  await loginAs(page, 'dueno', 'cambia-esto-123')
}

export async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByTestId('login-username').fill(username)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
  // Dashboard renders the "Carros lavados" metric once auth succeeds
  await expect(page.getByTestId('metric-carros-lavados')).toBeVisible({ timeout: 10_000 })
}

export async function loginViaApi(ctx: APIRequestContext, username: string, password: string) {
  const res = await ctx.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { username, password },
  })
  expect(res.status(), `login failed for ${username}`).toBe(200)
  const body = await res.json()
  return {
    accessToken: body.accessToken as string,
    refreshToken: body.refreshToken as string,
    headers: { Authorization: `Bearer ${body.accessToken}` },
  }
}

export async function loginAsDuenoApi(ctx: APIRequestContext) {
  return loginViaApi(ctx, 'dueno', 'cambia-esto-123')
}
