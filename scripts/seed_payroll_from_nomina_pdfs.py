#!/usr/bin/env python3
"""
Generate the historical payroll seed migration from nomina PDFs.

Requires pypdf:
  python3 -m venv /tmp/lavado-pdf-venv
  /tmp/lavado-pdf-venv/bin/pip install pypdf
  /tmp/lavado-pdf-venv/bin/python scripts/seed_payroll_from_nomina_pdfs.py
"""

import datetime as dt
import re
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from pypdf import PdfReader


SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
HISTORICAL_DIR = REPO_ROOT.parent / "historical-data"
OUTPUT_SQL = REPO_ROOT / "api/src/main/resources/db/migration/V18__seed_historical_payroll_nominas.sql"

PERIODS = [
    ("ABRIL NOMINA/Nomina 05 al 11 Abril.pdf", dt.date(2026, 4, 5)),
    ("ABRIL NOMINA/Nomina 12 al 18 Abril.pdf", dt.date(2026, 4, 12)),
    ("ABRIL NOMINA/Nomina 19 al 25 Abril.pdf", dt.date(2026, 4, 19)),
    ("ABRIL NOMINA/Nomina 26 Abril al 02 Mayo.pdf", dt.date(2026, 4, 26)),
    ("MAYO NOMINA/Nomina 03 al 09 Mayo.pdf", dt.date(2026, 5, 3)),
]

EMPLOYEE_ALIASES = [
    ("Jose Yurem Cervin", "YUREM", "sueldo"),
    ("Wendy", "WENDY", "sueldo"),
    ("Guadalupe", "LUPE", "sueldo"),
    ("Veronica Cristal Raya Garcia", "CRISTAL", "comision"),
    ("Erasmo Hernandez Olmedo", "ERASMO", "comision"),
    ("Arturo Levir Lopez Huesca", "ARTURO", "comision"),
    ("Valeriano Bautista Martinez", "VALE", "comision"),
    ("Hector Reyes Martinez", "CHORE", "comision"),
    ("Francisco Hernandez Lanto", "PANCHO", "comision"),
    ("Luis Manuel Hernandez Lanto", "MANUEL", "comision"),
    ("Wicho", "WICHO", "comision"),
    ("Gustavo", "TAVO", "comision"),
    ("David", "DAVID", "comision"),
    ("Christian", "CRISTIAN", "comision"),
    ("Ricardo", "RICARDO", "comision"),
    ("Carlos R.", "CARLOS R.", "encargado"),
    ("Reina Gabino Maza", "REINA", "sueldo"),
    ("Reina Gabiño Maza", "REINA", "sueldo"),
]

TAIL_WITH_CARS_RE = re.compile(
    r"(?P<weekly>\d{1,3}(?:\.\d{3})*,\d{2})\$\s+"
    r"(?P<cars_a>\d+,\d)\s+(?P<cars_b>\d+,\d)\s+"
    r"(?P<tail>.*)$"
)
MONEY_RE = re.compile(r"(?:-|\d{1,3}(?:\.\d{3})*,\d{2})\$")


@dataclass(frozen=True)
class PayrollEntrySeed:
    start_date: dt.date
    end_date: dt.date
    employee_name: str
    cars_washed: Decimal
    base_salary: Decimal
    cars_bonus_rate: Decimal
    cars_bonus: Decimal
    commissions: Decimal
    tips_pool_share: Decimal
    advances_deducted: Decimal
    net_pay: Decimal


def money(raw: str) -> Decimal:
    if raw == "-$":
        return Decimal("0.00")
    return Decimal(raw.replace("$", "").replace(".", "").replace(",", ".")).quantize(Decimal("0.01"))


def number(raw: str) -> Decimal:
    return Decimal(raw.replace(",", ".")).quantize(Decimal("0.01"))


def q(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def esc(value: str) -> str:
    return value.replace("'", "''")


def extract_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def find_alias(line: str) -> tuple[str, str] | None:
    normalized = line.replace("ñ", "n")
    for label, alias, pay_type in EMPLOYEE_ALIASES:
        if label.replace("ñ", "n") in normalized:
            return alias, pay_type
    return None


def parse_with_cars(line: str, start_date: dt.date, alias: str, pay_type: str) -> PayrollEntrySeed | None:
    match = TAIL_WITH_CARS_RE.search(line)
    if not match:
        return None

    weekly_total = money(match.group("weekly") + "$")
    cars_washed = q(number(match.group("cars_a")) + number(match.group("cars_b")))
    tail = [money(value) for value in MONEY_RE.findall(match.group("tail"))]
    if len(tail) < 5:
        return None

    gross_pay = tail[-5]
    net_pay = tail[-2]
    advances_deducted = q(max(gross_pay - net_pay, Decimal("0.00")))

    if pay_type == "comision":
        base_salary = Decimal("0.00")
        cars_bonus = Decimal("0.00")
        cars_bonus_rate = tail[-1] if cars_washed > 0 else Decimal("0.00")
        commissions = gross_pay
    else:
        base_salary = weekly_total
        cars_bonus = q(max(gross_pay - weekly_total, Decimal("0.00")))
        cars_bonus_rate = tail[-1] if cars_washed > 0 else Decimal("0.00")
        commissions = Decimal("0.00")

    return PayrollEntrySeed(
        start_date=start_date,
        end_date=start_date + dt.timedelta(days=6),
        employee_name=alias,
        cars_washed=cars_washed,
        base_salary=q(base_salary),
        cars_bonus_rate=q(cars_bonus_rate),
        cars_bonus=q(cars_bonus),
        commissions=q(commissions),
        tips_pool_share=Decimal("0.00"),
        advances_deducted=advances_deducted,
        net_pay=q(net_pay),
    )


def parse_encargado_without_cars(line: str, start_date: dt.date, alias: str) -> PayrollEntrySeed | None:
    amounts = [money(value) for value in MONEY_RE.findall(line)]
    if len(amounts) < 6:
        return None

    weekly_total = amounts[-6]
    gross_pay = amounts[-4]
    net_pay = amounts[-1]
    commissions = q(max(gross_pay - weekly_total, Decimal("0.00")))

    return PayrollEntrySeed(
        start_date=start_date,
        end_date=start_date + dt.timedelta(days=6),
        employee_name=alias,
        cars_washed=Decimal("0.00"),
        base_salary=q(weekly_total),
        cars_bonus_rate=Decimal("0.00"),
        cars_bonus=Decimal("0.00"),
        commissions=commissions,
        tips_pool_share=Decimal("0.00"),
        advances_deducted=q(max(gross_pay - net_pay, Decimal("0.00"))),
        net_pay=q(net_pay),
    )


def extract_entries() -> list[PayrollEntrySeed]:
    entries: list[PayrollEntrySeed] = []
    seen: set[tuple[dt.date, str]] = set()

    for relative_path, start_date in PERIODS:
        text = extract_text(HISTORICAL_DIR / relative_path)
        for line in text.splitlines():
            alias_match = find_alias(line)
            if alias_match is None:
                continue
            alias, pay_type = alias_match
            key = (start_date, alias)
            if key in seen:
                continue

            entry = parse_with_cars(line, start_date, alias, pay_type)
            if entry is None and pay_type == "encargado":
                entry = parse_encargado_without_cars(line, start_date, alias)
            if entry is None:
                continue
            entries.append(entry)
            seen.add(key)

    return entries


def sql_decimal(value: Decimal) -> str:
    return f"{value:.2f}"


def generate_sql(entries: list[PayrollEntrySeed]) -> str:
    lines: list[str] = []
    employees = sorted({entry.employee_name for entry in entries})
    periods = sorted({(entry.start_date, entry.end_date) for entry in entries})

    lines.append("-- V18: Seed locked historical payroll periods from nomina PDFs.")
    lines.append("-- Generated by scripts/seed_payroll_from_nomina_pdfs.py")
    lines.append(f"-- Periods: {len(periods)} | Entries: {len(entries)}")
    lines.append("")

    lines.append("INSERT INTO employees (tenant_id, full_name, active)")
    lines.append("SELECT 1, seed.full_name, true")
    lines.append("FROM (VALUES")
    for idx, employee in enumerate(employees):
        comma = "," if idx < len(employees) - 1 else ""
        lines.append(f"  ('{esc(employee)}'){comma}")
    lines.append(") AS seed(full_name)")
    lines.append("WHERE NOT EXISTS (")
    lines.append("  SELECT 1 FROM employees e")
    lines.append("  WHERE e.tenant_id = 1 AND e.full_name = seed.full_name")
    lines.append(");")
    lines.append("")

    for start_date, end_date in periods:
        lines.append(f"-- Payroll period {start_date.isoformat()} to {end_date.isoformat()}")
        lines.append("INSERT INTO payroll_periods (tenant_id, start_date, end_date, status, computed_at, locked_at)")
        lines.append(
            f"VALUES (1, '{start_date.isoformat()}', '{end_date.isoformat()}', 'LOCKED', now(), now())"
        )
        lines.append("ON CONFLICT (tenant_id, start_date, end_date) DO UPDATE")
        lines.append("SET status = 'LOCKED',")
        lines.append("    computed_at = COALESCE(payroll_periods.computed_at, excluded.computed_at),")
        lines.append("    locked_at = COALESCE(payroll_periods.locked_at, excluded.locked_at),")
        lines.append("    updated_at = now();")
        lines.append("")

    lines.append("WITH seed AS (")
    lines.append("  SELECT * FROM (VALUES")
    for idx, entry in enumerate(entries):
        comma = "," if idx < len(entries) - 1 else ""
        lines.append(
            "    ("
            f"'{entry.start_date.isoformat()}'::date, '{entry.end_date.isoformat()}'::date, "
            f"'{esc(entry.employee_name)}', {sql_decimal(entry.cars_washed)}, "
            f"{sql_decimal(entry.base_salary)}, {sql_decimal(entry.cars_bonus_rate)}, "
            f"{sql_decimal(entry.cars_bonus)}, {sql_decimal(entry.commissions)}, "
            f"{sql_decimal(entry.tips_pool_share)}, {sql_decimal(entry.advances_deducted)}, "
            f"{sql_decimal(entry.net_pay)}"
            f"){comma}"
        )
    lines.append("  ) AS v(start_date, end_date, employee_name, cars_washed, base_salary,")
    lines.append("       cars_bonus_rate, cars_bonus, commissions, tips_pool_share, advances_deducted, net_pay)")
    lines.append(")")
    lines.append("INSERT INTO payroll_entries (")
    lines.append("  tenant_id, payroll_period_id, employee_id, cars_washed, base_salary, cars_bonus_rate,")
    lines.append("  cars_bonus, commissions, tips_pool_share, advances_deducted, net_pay")
    lines.append(")")
    lines.append("SELECT")
    lines.append("  1, pp.id, e.id, seed.cars_washed, seed.base_salary, seed.cars_bonus_rate,")
    lines.append("  seed.cars_bonus, seed.commissions, seed.tips_pool_share, seed.advances_deducted, seed.net_pay")
    lines.append("FROM seed")
    lines.append("JOIN payroll_periods pp")
    lines.append("  ON pp.tenant_id = 1 AND pp.start_date = seed.start_date AND pp.end_date = seed.end_date")
    lines.append("JOIN employees e")
    lines.append("  ON e.tenant_id = 1 AND e.full_name = seed.employee_name")
    lines.append("ON CONFLICT (tenant_id, payroll_period_id, employee_id) DO UPDATE")
    lines.append("SET cars_washed = excluded.cars_washed,")
    lines.append("    base_salary = excluded.base_salary,")
    lines.append("    cars_bonus_rate = excluded.cars_bonus_rate,")
    lines.append("    cars_bonus = excluded.cars_bonus,")
    lines.append("    commissions = excluded.commissions,")
    lines.append("    tips_pool_share = excluded.tips_pool_share,")
    lines.append("    advances_deducted = excluded.advances_deducted,")
    lines.append("    net_pay = excluded.net_pay,")
    lines.append("    updated_at = now();")
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    entries = extract_entries()
    sql = generate_sql(entries)
    OUTPUT_SQL.write_text(sql, encoding="utf-8")

    total_net = sum((entry.net_pay for entry in entries), Decimal("0.00"))
    print(f"Entries: {len(entries)}")
    print(f"Total net pay: {total_net:.2f}")
    print(f"Wrote: {OUTPUT_SQL}")


if __name__ == "__main__":
    main()
