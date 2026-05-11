-- V14: Handoff-ready catalog defaults.
-- Keep historical ticket references intact, but hide import placeholders from daily use.

UPDATE service_types
SET active = false
WHERE tenant_id = 1
  AND code = 'HISTORICO';

UPDATE vehicle_sizes
SET active = false
WHERE tenant_id = 1
  AND code = 'HISTORICO';

-- Starter inventory catalog from recurring Excel expense items.
-- Prices are intentionally 0.00 where sale price must be confirmed by the owner.
INSERT INTO products (tenant_id, name, sku, current_unit_price, track_inventory, active)
VALUES
  (1, 'Aroma',               'AROMA',             0.00, true, true),
  (1, 'Aroma de piel',       'AROMA_PIEL',        0.00, true, true),
  (1, 'Chocolate',           'CHOCOLATE',         0.00, true, true),
  (1, 'Suero',               'SUERO',             0.00, true, true),
  (1, 'Carbon arpilla',      'CARBON_ARPILLA',    0.00, true, true),
  (1, 'Carbon chico',        'CARBON_CHICO',      0.00, true, true),
  (1, 'Tapete',              'TAPETE',            0.00, true, true),
  (1, 'Cuero',               'CUERO',             0.00, true, true),
  (1, 'Shampoo',             'SHAMPOO',           0.00, true, true),
  (1, 'Glicerina',           'GLICERINA',         0.00, true, true),
  (1, 'Pasta',               'PASTA',             0.00, true, true),
  (1, 'Filtro aspiradora',   'FILTRO_ASPIRADORA', 0.00, true, true)
ON CONFLICT (tenant_id, sku) DO NOTHING;
