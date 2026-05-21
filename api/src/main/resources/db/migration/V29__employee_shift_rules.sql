ALTER TABLE employees
    ADD COLUMN primary_shift              VARCHAR(20),
    ADD COLUMN out_of_shift_commission_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
