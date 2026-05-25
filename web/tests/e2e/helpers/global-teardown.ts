import { execSync } from 'node:child_process'

/**
 * E2E suite cleanup. Without this, every run leaves prefixed rows in
 * whatever DB the API points at. Two weeks of runs filled the Catálogos
 * screen with 100+ E2E_DASH/E2E_PAY/E2E_PRICE/E2E_VOID Lavador rows and
 * ballooned the Servicio dropdown to 155 options.
 *
 * Hard-delete strategy (changed from earlier deactivate-only):
 *   • Employees show up in the Catálogos screen regardless of active flag.
 *     Deactivating wasn't enough — purge the row and the FK chain.
 *   • Service_types / vehicle_sizes also referenced from tickets;
 *     ticket_assignments → tickets → catalog cascade must clear first.
 *   • Ledger tables (expenses / withdrawals / employee_advances) have no
 *     soft-delete flag and DO render until removed.
 *
 * FK order matters. Each block deletes children before parents.
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
const PREFIX_RE = "^(E2E|DISC|GASTOS|PAYROLL|REPORT|CORTE|SMOKE|T2|T4|P5|P8|P9|P13|D14|A15|T14)"
const INFIX_RE = "(E2E|GASTOS_SVC|DISC_|REPORT_|PAYROLL_|CORTE_|SMOKE_|T2_|T4_|P5_|P8_|P9_|P13_|D14_|A15_|T14)"
const EMP_RE = PREFIX_RE  // employees.full_name like "E2E_DASH Lavador 12345"

// Reusable test-employee subquery
const TE = `(SELECT id FROM employees WHERE full_name ~ '${EMP_RE}')`
const TS = `(SELECT id FROM service_types WHERE code ~ '${PREFIX_RE}')`
const TZ = `(SELECT id FROM vehicle_sizes WHERE code ~ '${PREFIX_RE}')`

const SQL = `
-- Ledger / one-off rows first (no FK chain to worry about)
DELETE FROM debt_ledger WHERE employee_advance_id IN (SELECT id FROM employee_advances WHERE reason ~ '${INFIX_RE}');
DELETE FROM employee_advances WHERE reason ~ '${INFIX_RE}';
DELETE FROM withdrawals WHERE reason ~ '${INFIX_RE}';
DELETE FROM expenses WHERE description ~ '${INFIX_RE}';

-- Catalog cascade — drop tickets that referenced test catalog rows, then
-- their service_prices, then the catalog rows themselves.
DELETE FROM ticket_assignments WHERE ticket_id IN (SELECT id FROM tickets WHERE service_type_id IN ${TS} OR vehicle_size_id IN ${TZ});
DELETE FROM tickets WHERE service_type_id IN ${TS} OR vehicle_size_id IN ${TZ};
DELETE FROM service_prices WHERE service_type_id IN ${TS} OR vehicle_size_id IN ${TZ};
DELETE FROM service_types WHERE id IN ${TS};
DELETE FROM vehicle_sizes WHERE id IN ${TZ};

-- Employee cascade — every child table referencing employees
DELETE FROM ticket_assignments WHERE employee_id IN ${TE};
DELETE FROM debt_payments WHERE employee_id IN ${TE};
DELETE FROM debt_ledger WHERE employee_id IN ${TE};
DELETE FROM employee_advances WHERE employee_id IN ${TE};
DELETE FROM payroll_adjustments WHERE employee_id IN ${TE};
DELETE FROM payroll_days WHERE employee_id IN ${TE};
DELETE FROM payroll_entries WHERE employee_id IN ${TE};
DELETE FROM attendance_records WHERE employee_id IN ${TE};
DELETE FROM product_movements WHERE employee_id IN ${TE};
DELETE FROM employees WHERE id IN ${TE};
`.trim().replace(/\s+/g, ' ')

export default async function globalTeardown() {
  if (process.env.CI) return

  try {
    const cmd = `docker exec -i ${CONTAINER} psql -U lavadero -d lavadero -v ON_ERROR_STOP=1 -c "${SQL}"`
    const out = execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' })
    const deletes = [...out.matchAll(/DELETE (\d+)/g)].map((m) => Number(m[1]))
    const total = deletes.reduce((a, b) => a + b, 0)
    if (total > 0) {
      console.log(`[e2e-teardown] deleted ${total} residue rows`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[e2e-teardown] cleanup skipped: ${msg.split('\n')[0]}`)
  }
}
