import { execSync } from 'node:child_process'

/**
 * E2E suite cleanup. Without this, every run leaves prefixed rows in
 * whatever DB the API points at, and after a few weeks of runs the dev
 * UI fills with garbage — the Gastos table showed "Esponjas E2E
 * 1779719863878" rows, the Servicio dropdown ballooned to 155 options.
 *
 * Two tiers:
 *   • Catalog tables (service_types / vehicle_sizes / employees) — these
 *     have an `active` column and may be FK targets, so we deactivate
 *     rather than delete. The frontend hides active=false.
 *   • Ledger tables (expenses / withdrawals / employee_advances) — these
 *     have NO soft-delete flag and DO render in the UI as long as they
 *     exist, so they must be DELETEd. employee_advances is FK'd by
 *     debt_ledger, so that gets purged first.
 *
 * Runs after ALL specs complete (configured via globalTeardown in
 * playwright.config.ts). Targets local Docker postgres by default; override
 * via E2E_CLEANUP_CONTAINER if you point Playwright at a different stack.
 *
 * Failure is non-fatal — we log and exit 0. A failed cleanup shouldn't
 * fail the suite, and CI cleanup is irrelevant because CI uses a fresh
 * container per run.
 */
const CONTAINER = process.env.E2E_CLEANUP_CONTAINER ?? 'lavadero-postgres'
const PREFIX_RE = "^(E2E|DISC|GASTOS|PAYROLL|REPORT|CORTE|T2|T4|P5|P8|P9|P13|D14|A15|T14)"
// expenses.description and advances.reason can have the prefix anywhere
// in the text (e.g. "Esponjas E2E 1779..."), not just at start.
const INFIX_RE = "(E2E|GASTOS_SVC|DISC_|REPORT_|PAYROLL_|CORTE_|T2_|T4_|P5_|P8_|P9_|P13_|D14_|A15_|T14)"

const SQL = `
UPDATE service_types SET active = false
 WHERE code ~ '${PREFIX_RE}' AND active = true;
UPDATE vehicle_sizes SET active = false
 WHERE code ~ '${PREFIX_RE}' AND active = true;
UPDATE employees SET active = false
 WHERE full_name ~ '${PREFIX_RE} ' AND active = true;
DELETE FROM debt_ledger
 WHERE employee_advance_id IN (SELECT id FROM employee_advances WHERE reason ~ '${INFIX_RE}');
DELETE FROM employee_advances WHERE reason ~ '${INFIX_RE}';
DELETE FROM withdrawals WHERE reason ~ '${INFIX_RE}';
DELETE FROM expenses WHERE description ~ '${INFIX_RE}';
`.trim().replace(/\s+/g, ' ')

export default async function globalTeardown() {
  if (process.env.CI) return

  try {
    const cmd = `docker exec -i ${CONTAINER} psql -U lavadero -d lavadero -v ON_ERROR_STOP=1 -c "${SQL}"`
    const out = execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' })
    const updates = [...out.matchAll(/UPDATE (\d+)/g)].map((m) => Number(m[1]))
    const deletes = [...out.matchAll(/DELETE (\d+)/g)].map((m) => Number(m[1]))
    const total = [...updates, ...deletes].reduce((a, b) => a + b, 0)
    if (total > 0) {
      console.log(
        `[e2e-teardown] cleaned ${total} residue rows ` +
        `(deactivated svc/size/emp=${updates.join('/')}, deleted ledger=${deletes.join('/')})`
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[e2e-teardown] cleanup skipped: ${msg.split('\n')[0]}`)
  }
}
