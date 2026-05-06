ALTER TABLE tickets
    ADD COLUMN payment_method VARCHAR(10) NOT NULL DEFAULT 'CASH',
    ADD CONSTRAINT chk_tickets_payment_method CHECK (payment_method IN ('CASH', 'CARD'));
