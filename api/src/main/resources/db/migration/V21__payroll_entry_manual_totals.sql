alter table payroll_entries
  add column manual_earnings numeric(10, 2) not null default 0,
  add column manual_deductions numeric(10, 2) not null default 0,
  add column gross_pay numeric(10, 2) not null default 0;

update payroll_entries
set gross_pay = base_salary + cars_bonus + commissions + tips_pool_share + manual_earnings
where gross_pay = 0;
