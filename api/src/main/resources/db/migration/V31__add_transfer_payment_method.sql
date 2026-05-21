ALTER TABLE tickets DROP CONSTRAINT chk_tickets_payment_method;
ALTER TABLE tickets ADD CONSTRAINT chk_tickets_payment_method
    CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER'));
