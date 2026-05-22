CREATE TABLE prepaid_packages (
    id                BIGSERIAL PRIMARY KEY,
    tenant_id         BIGINT        NOT NULL DEFAULT 1,
    business_day_id   BIGINT        NOT NULL REFERENCES business_days(id),
    shift_id          BIGINT        NOT NULL REFERENCES shifts(id),
    washes_included   INT           NOT NULL DEFAULT 10,
    amount            NUMERIC(12,2) NOT NULL,
    currency          VARCHAR(3)    NOT NULL DEFAULT 'MXN',
    payment_method    VARCHAR(20)   NOT NULL DEFAULT 'CASH',
    notes             VARCHAR(500),
    occurred_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);
