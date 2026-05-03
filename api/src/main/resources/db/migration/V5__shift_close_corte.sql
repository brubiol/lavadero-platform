create table cash_counts (
    id bigserial primary key,
    tenant_id bigint not null default 1,
    shift_id bigint not null references shifts(id),
    currency varchar(3) not null,
    bills_1000 integer not null default 0,
    bills_500 integer not null default 0,
    bills_200 integer not null default 0,
    bills_100 integer not null default 0,
    bills_50 integer not null default 0,
    bills_20 integer not null default 0,
    coins_10 integer not null default 0,
    coins_5 integer not null default 0,
    coins_2 integer not null default 0,
    coins_1 integer not null default 0,
    coins_0_5 integer not null default 0,
    morralla_total numeric(10, 2) not null default 0,
    total_counted numeric(10, 2) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint chk_cash_counts_currency check (currency in ('MXN', 'USD')),
    constraint chk_cash_counts_non_negative check (
        bills_1000 >= 0 and bills_500 >= 0 and bills_200 >= 0 and bills_100 >= 0
        and bills_50 >= 0 and bills_20 >= 0 and coins_10 >= 0 and coins_5 >= 0
        and coins_2 >= 0 and coins_1 >= 0 and coins_0_5 >= 0 and morralla_total >= 0
    )
);

create index idx_cash_counts_shift_id on cash_counts(shift_id);

create table shift_close_summaries (
    id bigserial primary key,
    tenant_id bigint not null default 1,
    shift_id bigint not null unique references shifts(id),
    cash_count_id bigint not null references cash_counts(id),
    ticket_revenue numeric(10, 2) not null,
    expenses_total numeric(10, 2) not null,
    withdrawals_total numeric(10, 2) not null,
    expected_cash numeric(10, 2) not null,
    total_counted numeric(10, 2) not null,
    variance numeric(10, 2) not null,
    closing_reason varchar(500),
    closed_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint chk_shift_close_reason_for_short check (variance >= 0 or closing_reason is not null)
);

create index idx_shift_close_summaries_closed_at on shift_close_summaries(closed_at);
