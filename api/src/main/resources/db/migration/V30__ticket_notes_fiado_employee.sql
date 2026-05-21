-- V30: Ticket internal notes + washer-linked fiado
--
-- 1. tickets.notes — internal notes visible only to staff; Carlos uses this to
--    annotate a ticket after the fact (e.g. "llanta pinchada, auto espero 20 min")
-- 2. product_movements.employee_id — optional FK to employees; populated when a
--    fiado (credit) inventory sale is linked to a specific washer so it can be
--    auto-deducted from their weekly payroll.

ALTER TABLE tickets
    ADD COLUMN notes VARCHAR(500);

ALTER TABLE product_movements
    ADD COLUMN employee_id BIGINT REFERENCES employees(id);
