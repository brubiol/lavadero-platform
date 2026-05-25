import { execSync } from 'node:child_process'

/**
 * E2E suite cleanup. Without this, every run leaves ~10-20 prefixed catalog
 * rows (service_types, vehicle_sizes, employees) in whatever DB the API points
 * at. After a few weeks of runs the dropdowns in the real dev UI become
 * unusable — happened in May 2026, ~150 rows of residue. Deactivate instead
 * of delete so foreign-key references from any tickets the suite created
 * stay valid; the frontend filters active=false out of its pickers.
 *
 * Runs after ALL specs complete (configured via globalTeardown in
 * playwright.config.ts). Targets local Docker postgres by default; override
 * via E2E_CLEANUP_CONTAINER if you point Playwright at a different stack.
 *
 * Failure is non-fatal — we log and exit 0. A failed cleanup shouldn't fail
 * the suite, and CI cleanup is irrelevant because CI uses a fresh container.
 */
const CONTAINER = process.env.E2E_CLEANUP_CONTAINER ?? 'lavadero-postgres'
const PREFIX_RE = "^(E2E|DISC|GASTOS|PAYROLL|REPORT|CORTE|T2|T4|P5|P8|P9|P13|D14|A15|T14)"

const SQL = `
UPDATE service_types SET active = false
 WHERE code ~ '${PREFIX_RE}' AND active = true;
UPDATE vehicle_sizes SET active = false
 WHERE code ~ '${PREFIX_RE}' AND active = true;
UPDATE employees SET active = false
 WHERE full_name ~ '${PREFIX_RE} ' AND active = true;
`.trim().replace(/\s+/g, ' ')

export default async function globalTeardown() {
  // Skip in CI — CI uses a fresh container per run, so cleanup is a no-op
  // and `docker exec` may not even be available depending on the runner.
  if (process.env.CI) return

  try {
    const cmd = `docker exec -i ${CONTAINER} psql -U lavadero -d lavadero -v ON_ERROR_STOP=1 -c "${SQL}"`
    const out = execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' })
    // Parse the UPDATE N rows from psql output
    const counts = [...out.matchAll(/UPDATE (\d+)/g)].map((m) => Number(m[1]))
    const total = counts.reduce((a, b) => a + b, 0)
    if (total > 0) {
      console.log(`[e2e-teardown] deactivated ${total} residue rows (svc/size/emp = ${counts.join('/')})`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[e2e-teardown] cleanup skipped: ${msg.split('\n')[0]}`)
  }
}
