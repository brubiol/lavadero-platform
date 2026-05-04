create table app_users (
  id bigserial primary key,
  tenant_id bigint not null default 1,
  username varchar(80) not null,
  password_hash varchar(255) not null,
  full_name varchar(120) not null,
  role varchar(30) not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_app_users_username unique (tenant_id, username),
  constraint chk_app_users_role check (role in ('OPERADOR', 'GERENTE', 'DUENO'))
);

create table refresh_tokens (
  id bigserial primary key,
  user_id bigint not null references app_users(id),
  token_hash varchar(128) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_refresh_tokens_user on refresh_tokens (user_id);
create index idx_refresh_tokens_expires on refresh_tokens (expires_at);
