-- Cash repayments of employee debt (prestamos).
-- Symmetric to employee_advances: an advance writes cash OUT, a payment writes cash IN.
-- Each payment also generates a debt_ledger row with type=PAYMENT to reduce the running balance.
CREATE TABLE debt_payments (
    id                BIGSERIAL PRIMARY KEY,
    tenant_id         BIGINT        NOT NULL DEFAULT 1,
    business_day_id   BIGINT        REFERENCES business_days(id),
    shift_id          BIGINT        REFERENCES shifts(id),
    employee_id       BIGINT        NOT NULL REFERENCES employees(id),
    payment_date      DATE          NOT NULL,
    amount            NUMERIC(10,2) NOT NULL,
    note              VARCHAR(500),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_debt_payments_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_debt_payments_employee_date
    ON debt_payments (tenant_id, employee_id, payment_date);
CREATE INDEX idx_debt_payments_shift
    ON debt_payments (shift_id) WHERE shift_id IS NOT NULL;

-- shift_close_summaries needs a new total column so the cash variance formula
-- (cash + prepaid + inventory + debt_payments − expenses − withdrawals − advances)
-- still reconciles after a repayment.
ALTER TABLE shift_close_summaries
    ADD COLUMN debt_payments_total NUMERIC(10,2) NOT NULL DEFAULT 0;
