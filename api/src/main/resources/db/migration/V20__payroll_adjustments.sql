create table payroll_adjustments (
  id bigserial primary key,
  tenant_id bigint not null default 1,
  payroll_period_id bigint not null references payroll_periods(id),
  employee_id bigint not null references employees(id),
  type varchar(20) not null,
  amount numeric(10, 2) not null,
  concept varchar(120) not null,
  note varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_payroll_adjustments_type check (type in ('EARNING', 'DEDUCTION')),
  constraint chk_payroll_adjustments_amount_positive check (amount > 0)
);

create index idx_payroll_adjustments_period
  on payroll_adjustments (tenant_id, payroll_period_id, employee_id);
