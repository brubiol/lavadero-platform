-- Per-product low/critical stock thresholds. Previously hardcoded on the
-- frontend (INV_MIN_STOCK = 5, crit = 2.5). Now the operator can set them
-- in the edit-product form so high-turnover SKUs like aromas can flag at a
-- different level than slow-moving items like tapetes.
--
-- min_stock NULL/NOT NULL is intentional: NULL = use the global default
-- (still 5) so existing rows behave the same until edited. crit_stock
-- defaults to min_stock / 2 when NULL.
ALTER TABLE products
  ADD COLUMN min_stock NUMERIC(10, 2),
  ADD COLUMN crit_stock NUMERIC(10, 2);

-- Backfill the legacy 5 / 2.5 defaults so the existing seeded products
-- still show the same low/critical thresholds operators are used to.
UPDATE products
  SET min_stock  = 5,
      crit_stock = 2.5
WHERE min_stock IS NULL;
