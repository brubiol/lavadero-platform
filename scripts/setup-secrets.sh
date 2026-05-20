#!/usr/bin/env bash
# setup-secrets.sh
# Run this ONCE on the EC2 host after provisioning to create the .env file.
# ssh -i lavadero-key.pem ec2-user@<EC2_IP>
# Then: bash setup-secrets.sh

set -euo pipefail

ENV_FILE="/opt/lavadero/.env"

if [[ -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE already exists. Edit it directly."
  exit 1
fi

echo "Enter the values below. They will be written to $ENV_FILE"
echo ""

read -rp "RDS endpoint (e.g. lavadero-db.xxxx.us-east-1.rds.amazonaws.com): " RDS_HOST
read -rp "RDS password: " -s RDS_PASSWORD; echo ""
read -rp "JWT secret (leave blank to generate): " JWT_SECRET
[[ -z "$JWT_SECRET" ]] && JWT_SECRET=$(openssl rand -hex 32)
read -rp "Bootstrap owner password: " -s BOOTSTRAP_PASSWORD; echo ""
read -rp "OpenAI API key (leave blank to use local deterministic AI): " -s OPENAI_API_KEY; echo ""

cat > "$ENV_FILE" <<EOF
RDS_HOST=$RDS_HOST
RDS_DB=lavadero
RDS_USERNAME=lavadero
RDS_PASSWORD=$RDS_PASSWORD

LAVADERO_JWT_SECRET=$JWT_SECRET

LAVADERO_BOOTSTRAP_USERNAME=dueno
LAVADERO_BOOTSTRAP_PASSWORD=$BOOTSTRAP_PASSWORD
LAVADERO_BOOTSTRAP_FULL_NAME=Brandon Rubio

LAVADERO_AI_ENABLED=true
LAVADERO_AI_PROVIDER=$([[ -n "$OPENAI_API_KEY" ]] && echo openai-compatible || echo deterministic-local)
LAVADERO_AI_BASE_URL=$([[ -n "$OPENAI_API_KEY" ]] && echo https://api.openai.com/v1 || echo "")
LAVADERO_AI_API_KEY=$OPENAI_API_KEY
LAVADERO_AI_MODEL=$([[ -n "$OPENAI_API_KEY" ]] && echo gpt-5.5 || echo local)
LAVADERO_AI_TIMEOUT_SECONDS=20
EOF

chmod 600 "$ENV_FILE"
echo ""
echo "==> Written to $ENV_FILE (mode 600)"
echo "==> Run: docker compose -f /opt/lavadero/docker-compose.prod.yml up -d"
