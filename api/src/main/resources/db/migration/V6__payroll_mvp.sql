alter table employees
  add column base_weekly_salary numeric(10, 2) not null default 0,
  add constraint chk_employees_base_weekly_salary_non_negative check (base_weekly_salary >= 0);

create table payroll_periods (
  id bigserial primary key,
  tenant_id bigint not null default 1,
  start_date date not null,
  end_date date not null,
  status varchar(20) not null default 'OPEN',
  computed_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_payroll_periods_status check (status in ('OPEN', 'COMPUTED', 'LOCKED')),
  constraint chk_payroll_periods_week check (end_date = start_date + 6),
  constraint uq_payroll_periods_dates unique (tenant_id, start_date, end_date)
);

create table payroll_entries (
  id bigserial primary key,
  tenant_id bigint not null default 1,
  payroll_period_id bigint not null references payroll_periods(id),
  employee_id bigint not null references employees(id),
  cars_washed numeric(10, 2) not null default 0,
  base_salary numeric(10, 2) not null default 0,
  cars_bonus_rate numeric(10, 2) not null default 0,
  cars_bonus numeric(10, 2) not null default 0,
  commissions numeric(10, 2) not null default 0,
  tips_pool_share numeric(10, 2) not null default 0,
  advances_deducted numeric(10, 2) not null default 0,
  net_pay numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_payroll_entries_period_employee unique (tenant_id, payroll_period_id, employee_id)
);

create index idx_payroll_entries_employee on payroll_entries (tenant_id, employee_id);

create table payroll_days (
  id bigserial primary key,
  tenant_id bigint not null default 1,
  payroll_period_id bigint not null references payroll_periods(id),
  employee_id bigint not null references employees(id),
  work_date date not null,
  cars_washed numeric(10, 2) not null default 0,
  ticket_revenue numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_payroll_days_period_employee_date unique (tenant_id, payroll_period_id, employee_id, work_date)
);

create index idx_payroll_days_period on payroll_days (tenant_id, payroll_period_id);

create table debt_ledger (
  id bigserial primary key,
  tenant_id bigint not null default 1,
  employee_id bigint not null references employees(id),
  entry_date date not null,
  type varchar(30) not null,
  amount numeric(10, 2) not null,
  employee_advance_id bigint references employee_advances(id),
  payroll_period_id bigint references payroll_periods(id),
  note varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_debt_ledger_type check (type in ('ADVANCE', 'PAYMENT', 'PAYROLL_DEDUCTION', 'WRITEOFF')),
  constraint chk_debt_ledger_amount_positive check (amount > 0)
);

create index idx_debt_ledger_employee on debt_ledger (tenant_id, employee_id, entry_date);
create unique index uq_debt_ledger_employee_advance
  on debt_ledger (employee_advance_id, type)
  where employee_advance_id is not null;
create unique index uq_debt_ledger_payroll_deduction
  on debt_ledger (payroll_period_id, employee_id, type)
  where payroll_period_id is not null and type = 'PAYROLL_DEDUCTION';
