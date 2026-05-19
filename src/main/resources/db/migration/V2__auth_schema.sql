CREATE TABLE app_users (
    id            BIGSERIAL    PRIMARY KEY,
    tenant_id     BIGINT       NOT NULL DEFAULT 1,
    username      VARCHAR(80)  NOT NULL,
    full_name     VARCHAR(120) NOT NULL,
    password_hash TEXT         NOT NULL,
    role          VARCHAR(30)  NOT NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_app_users_tenant_username UNIQUE (tenant_id, username)
);

CREATE TABLE refresh_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES app_users(id),
    token_hash  VARCHAR(128) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
