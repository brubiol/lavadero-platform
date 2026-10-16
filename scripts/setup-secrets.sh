#!/usr/bin/env bash
# setup-secrets.sh
# Creates one business instance on the VM: its .env and its Caddy site file.
# Run once per business, on the VM:
#   bash setup-secrets.sh                      # first business (instance "lavadero")
#   bash setup-secrets.sh otro otro.example.com
# The next CI deploy (or scripts/deploy-host.sh) starts it.

set -euo pipefail

INSTANCE="${1:-lavadero}"
DEFAULT_DOMAIN="${2:-turbolavado.org}"

if [[ ! "$INSTANCE" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "ERROR: instance name must be lowercase letters, digits, dashes." >&2
  exit 1
fi

ROOT="/opt/lavadero"
INSTANCE_DIR="$ROOT/instances/$INSTANCE"
ENV_FILE="$INSTANCE_DIR/.env"
SITE_FILE="$ROOT/edge/sites/$INSTANCE.caddy"

if [[ -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE already exists. Edit it directly." >&2
  exit 1
fi

mkdir -p "$INSTANCE_DIR"

echo "Creating instance '$INSTANCE'. Values go to $ENV_FILE"
echo ""

read -rp "Domain [$DEFAULT_DOMAIN]: " DOMAIN
DOMAIN="${DOMAIN:-$DEFAULT_DOMAIN}"
read -rp "Owner (DUENO) full name [Eric Rubio]: " OWNER_NAME
OWNER_NAME="${OWNER_NAME:-Eric Rubio}"
read -rp "Owner (DUENO) password: " -s BOOTSTRAP_PASSWORD; echo ""
read -rp "Admin (ADMIN / Brandon) password: " -s ADMIN_PASSWORD; echo ""
read -rp "OpenAI API key (blank = free deterministic fallback): " -s OPENAI_API_KEY; echo ""
read -rp "Backup S3 endpoint (blank = skip off-site backups): " BACKUP_S3_ENDPOINT
BACKUP_S3_ACCESS_KEY=""
BACKUP_S3_SECRET_KEY=""
if [[ -n "$BACKUP_S3_ENDPOINT" ]]; then
  read -rp "Backup access key: " BACKUP_S3_ACCESS_KEY
  read -rp "Backup secret key: " -s BACKUP_S3_SECRET_KEY; echo ""
fi

# Non-secret AI config (provider, base URL, model, timeout) is pinned in
# docker-compose.prod.yml. Only the API key belongs in .env.
cat > "$ENV_FILE" <<EOF
LAVADERO_INSTANCE=$INSTANCE
LAVADERO_DOMAIN=$DOMAIN

POSTGRES_DB=lavadero
POSTGRES_USER=lavadero
POSTGRES_PASSWORD=$(openssl rand -hex 24)

LAVADERO_JWT_SECRET=$(openssl rand -hex 32)

LAVADERO_BOOTSTRAP_USERNAME=dueno
LAVADERO_BOOTSTRAP_PASSWORD=$BOOTSTRAP_PASSWORD
LAVADERO_BOOTSTRAP_FULL_NAME=$OWNER_NAME

LAVADERO_ADMIN_USERNAME=brandon
LAVADERO_ADMIN_PASSWORD=$ADMIN_PASSWORD
LAVADERO_ADMIN_FULL_NAME=Brandon Rubio

LAVADERO_AI_API_KEY=$OPENAI_API_KEY

BACKUP_S3_ENDPOINT=$BACKUP_S3_ENDPOINT
BACKUP_S3_BUCKET=lavadero-backups
BACKUP_S3_ACCESS_KEY=$BACKUP_S3_ACCESS_KEY
BACKUP_S3_SECRET_KEY=$BACKUP_S3_SECRET_KEY
BACKUP_RETENTION_DAYS=30
EOF
chmod 600 "$ENV_FILE"

cat > "$SITE_FILE" <<EOF
$DOMAIN {
	encode gzip
	reverse_proxy $INSTANCE-web:80
}
EOF

echo ""
echo "==> Instance '$INSTANCE' configured for https://$DOMAIN"
echo "==> Point the DNS A record for $DOMAIN at this VM, then deploy."
