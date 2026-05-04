create table products (
  id bigserial primary key,
  tenant_id bigint not null default 1,
  name varchar(120) not null,
  sku varchar(60) not null,
  current_unit_price numeric(10, 2) not null default 0,
  track_inventory boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_products_sku unique (tenant_id, sku),
  constraint chk_products_price_non_negative check (current_unit_price >= 0)
);

create index idx_products_active on products (tenant_id, active);

create table product_movements (
  id bigserial primary key,
  tenant_id bigint not null default 1,
  product_id bigint not null references products(id),
  movement_type varchar(30) not null,
  movement_date timestamptz not null default now(),
  quantity numeric(10, 2) not null,
  unit_price numeric(10, 2),
  total_amount numeric(10, 2),
  reason varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_product_movements_type check (movement_type in (
    'SALE',
    'FIADO',
    'PURCHASE',
    'ADJUSTMENT',
    'OPENING_COUNT',
    'CLOSING_COUNT'
  )),
  constraint chk_product_movements_quantity_non_zero check (quantity <> 0),
  constraint chk_product_movements_reason_for_adjustment check (movement_type <> 'ADJUSTMENT' or reason is not null)
);

create index idx_product_movements_product_date
  on product_movements (tenant_id, product_id, movement_date);
