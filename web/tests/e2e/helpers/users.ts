import { expect, APIRequestContext } from '@playwright/test'
import { BASE_URL } from './auth'

export type SeededUser = {
  username: string
  password: string
  role: 'OPERADOR' | 'GERENTE' | 'DUENO'
}

/**
 * Idempotently create OPERADOR + GERENTE test users via POST /api/v1/admin/users.
 * Re-runs return the same credentials (admin endpoint returns 400 on duplicates;
 * we treat that as "user already exists" and continue).
 */
export async function seedRoleUsers(
  ctx: APIRequestContext,
  duenoHeaders: Record<string, string>,
): Promise<{ operador: SeededUser; gerente: SeededUser }> {
  const operador: SeededUser = {
    username: 'e2e_operador',
    password: 'e2eoperador123',
    role: 'OPERADOR',
  }
  const gerente: SeededUser = {
    username: 'e2e_gerente',
    password: 'e2egerente123',
    role: 'GERENTE',
  }

  await ensureUser(ctx, duenoHeaders, operador, 'E2E Operador')
  await ensureUser(ctx, duenoHeaders, gerente, 'E2E Gerente')

  return { operador, gerente }
}

async function ensureUser(
  ctx: APIRequestContext,
  headers: Record<string, string>,
  user: SeededUser,
  fullName: string,
) {
  const res = await ctx.post(`${BASE_URL}/api/v1/admin/users`, {
    headers,
    data: {
      username: user.username,
      password: user.password,
      fullName,
      role: user.role,
    },
  })
  // 201 = created fresh; 400 = "Username already exists" (idempotent re-run is fine)
  expect(
    [201, 400].includes(res.status()),
    `create user ${user.username} returned unexpected status ${res.status()}`,
  ).toBeTruthy()
}
