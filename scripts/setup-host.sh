#!/usr/bin/env bash
# setup-host.sh
# One-time bootstrap for the production VM (Oracle Cloud Always Free, Ubuntu 24.04 ARM).
# Safe to re-run. Usage, from the VM:  sudo bash setup-host.sh

set -euo pipefail

DEPLOY_USER="${SUDO_USER:-ubuntu}"

# ── Docker + Compose plugin (official repo; works on arm64 and amd64) ─────
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
usermod -aG docker "$DEPLOY_USER"

cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl enable docker
systemctl restart docker

# ── Firewall ──────────────────────────────────────────────────────────────
# Oracle's Ubuntu images ship iptables rules that REJECT everything except SSH,
# even when the VCN security list allows 80/443.
if ! iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null; then
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
fi
if ! iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null; then
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
fi
DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
netfilter-persistent save

# ── Swap (safety net for JVM spikes during deploys) ───────────────────────
if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── Directory layout ──────────────────────────────────────────────────────
#   /opt/lavadero/edge/                 shared Caddy (ports 80/443)
#   /opt/lavadero/instances/<name>/     one app copy per business
#   /opt/lavadero/backups/              local copies of nightly dumps
mkdir -p /opt/lavadero/edge/sites /opt/lavadero/instances /opt/lavadero/backups
chown -R "$DEPLOY_USER:$DEPLOY_USER" /opt/lavadero

docker network inspect lavadero-edge >/dev/null 2>&1 || docker network create lavadero-edge

echo "==> Host ready. Docker $(docker --version)"
echo "==> Log out and back in so '$DEPLOY_USER' can run docker without sudo."
