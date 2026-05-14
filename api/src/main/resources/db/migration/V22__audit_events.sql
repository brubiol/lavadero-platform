create table audit_events (
  id bigserial primary key,
  tenant_id bigint not null default 1,
  occurred_at timestamptz not null default now(),
  actor_username varchar(120),
  action varchar(80) not null,
  entity_type varchar(80) not null,
  entity_id bigint,
  reason varchar(500),
  details varchar(1000)
);

create index idx_audit_events_occurred_at
  on audit_events (tenant_id, occurred_at desc);

create index idx_audit_events_entity
  on audit_events (tenant_id, entity_type, entity_id, occurred_at desc);
