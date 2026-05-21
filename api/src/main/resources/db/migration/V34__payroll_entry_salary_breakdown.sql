-- V34: Make salaried pay transparent on the nomina.
--
-- base_salary now holds the contractual weekly salary. The rest-day pay and
-- absence deduction are stored separately so the owner can see exactly how
-- each employee's pay adds up.

ALTER TABLE payroll_entries
    ADD COLUMN rest_day_pay      NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN absence_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
