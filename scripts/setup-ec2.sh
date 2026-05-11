#!/usr/bin/env bash
# setup-ec2.sh
# Runs automatically as EC2 user-data on first boot (Amazon Linux 2023).
# Also safe to re-run manually after SSH-ing in.

set -euo pipefail

# ── Docker ────────────────────────────────────────────────────────────────
dnf update -y
dnf install -y docker git

systemctl enable docker
systemctl start docker

# Allow ec2-user to run Docker without sudo
usermod -aG docker ec2-user

# Docker Compose v2 plugin
COMPOSE_VERSION="v2.27.1"
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# ── App directory ─────────────────────────────────────────────────────────
mkdir -p /opt/lavadero
chown ec2-user:ec2-user /opt/lavadero

# ── Log rotation for Docker ───────────────────────────────────────────────
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

echo "==> EC2 bootstrap complete. Docker $(docker --version) ready."
