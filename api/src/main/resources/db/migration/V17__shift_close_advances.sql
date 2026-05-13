-- Employee advances are cash paid out of the drawer during a shift and must
-- reduce expectedCash at shift close, just like withdrawals.
-- This column stores the snapshot at close time so variance doesn't drift.
alter table shift_close_summaries
    add column advances_total numeric(10, 2) not null default 0;
