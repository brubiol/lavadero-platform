import { expect, Page, APIRequestContext } from '@playwright/test'

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5174'

export async function loginAsDueno(page: Page) {
  await loginAs(page, 'dueno', 'cambia-esto-123')
}

export async function loginAs(page: Page, username: string, password: string) {
  // Authenticate via the API and seed the token into localStorage before the
  // app boots. Driving the UI login form costs ~10s per test on the cold CI
  // stack and is a recurring source of timeout flakiness; a direct token
  // write is fast and deterministic. The init script re-applies on every
  // navigation, so the session survives later page.goto calls.
  const res = await page.request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { username, password },
  })
  expect(res.status(), `login failed for ${username}`).toBe(200)
  const authJson = await res.text()
  await page.addInitScript((value) => {
    window.localStorage.setItem('lavadero.auth', value)
  }, authJson)
  await page.goto('/')
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
