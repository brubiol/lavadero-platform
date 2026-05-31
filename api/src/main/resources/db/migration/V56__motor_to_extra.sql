-- Reclassify "Lavado de Motor" from a standalone service into an add-on extra.
-- Extras (category = 'EXTRA') render as chips in the ticket form and sum their
-- per-size price onto the base wash; the service drops out of the main grid.
-- Its existing per-size service_prices rows are left untouched.
UPDATE service_types
SET category = 'EXTRA',
    updated_at = now()
WHERE code = 'LAV_MOTOR';
