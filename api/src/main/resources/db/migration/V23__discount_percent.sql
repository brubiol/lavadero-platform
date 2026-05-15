ALTER TABLE tickets
    ADD COLUMN discount_percent       NUMERIC(5,2)  NOT NULL DEFAULT 0.00,
    ADD COLUMN original_price_amount  NUMERIC(12,2);
