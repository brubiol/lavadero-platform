-- Drop USD as a supported currency. The business does not sell in USD anymore;
-- the only remaining USD rows are LAV_ASPIRADO border-customer prices seeded
-- in V13. Tickets and cash_counts already only carry MXN values in production.

DELETE FROM service_prices WHERE currency = 'USD';

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_tickets_currency;
ALTER TABLE tickets ADD CONSTRAINT chk_tickets_currency CHECK (currency = 'MXN');

ALTER TABLE cash_counts DROP CONSTRAINT IF EXISTS chk_cash_counts_currency;
ALTER TABLE cash_counts ADD CONSTRAINT chk_cash_counts_currency CHECK (currency = 'MXN');

ALTER TABLE prepaid_packages DROP CONSTRAINT IF EXISTS chk_prepaid_packages_currency;
ALTER TABLE prepaid_packages ADD CONSTRAINT chk_prepaid_packages_currency CHECK (currency = 'MXN');
