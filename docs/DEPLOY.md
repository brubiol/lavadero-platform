# Production deploy — Oracle Cloud Always Free

Everything runs on one free Oracle Cloud ARM VM: a shared Caddy (HTTPS) plus one
self-contained copy of the app (postgres + api + web) per business. Cost: $0
hosting; only the domain and optional OpenAI usage are paid.

```
                 ┌──────────── Oracle VM (Ubuntu 24.04 ARM) ─────────────┐
 turbolavado.org │  lavadero-caddy ──► lavadero-web ─► lavadero-api ─► lavadero-postgres
 otro.example ──►│        :443     └─► otro-web     ─► otro-api     ─► otro-postgres
                 └────────────────────────────────────────────────────────┘
```

Each business has its own database, so data is fully isolated without any
multi-tenant code. Host layout:

```
/opt/lavadero/edge/                 docker-compose.edge.yml, Caddyfile, sites/<instance>.caddy
/opt/lavadero/instances/<instance>/ docker-compose.prod.yml, .env (mode 600)
/opt/lavadero/release/              files CI copies on every deploy
/opt/lavadero/backups/<instance>/   local nightly dumps (7 days)
```

## 1. Oracle account and VM (one time, web console)

1. Sign up at cloud.oracle.com. Pick a US home region (Ashburn / Phoenix) — it cannot be changed.
2. Billing → **Upgrade to Pay As You Go**. Always Free resources stay $0, and upgraded
   accounts are exempt from idle-instance reclamation. Billing → Budgets → **$1 alert**.
3. Compute → Instances → Create:
   - Image: Canonical Ubuntu 24.04 (not Minimal)
   - Shape: Ampere `VM.Standard.A1.Flex`, 2 OCPU / 12 GB (free limit is 4 / 24)
   - Public IPv4: yes. SSH key: generate and download the private key.
   - Boot volume: 100 GB
   - "Out of capacity" is common; retry later or try another availability domain.
4. Instance → Subnet → Default Security List → Add Ingress Rules:
   source `0.0.0.0/0`, TCP, destination port `80`; repeat for `443`.

## 2. DNS

At the domain registrar, set an **A record** for the domain (`@`) to the VM's public IP.
Check with `dig +short turbolavado.org`.

## 3. Prepare the VM (one time)

```bash
ssh -i ~/path/to/oracle-key ubuntu@<VM_IP>
curl -fsSLO https://raw.githubusercontent.com/brubiol/lavadero-platform/main/scripts/setup-host.sh
curl -fsSLO https://raw.githubusercontent.com/brubiol/lavadero-platform/main/scripts/setup-secrets.sh
sudo bash setup-host.sh
exit                                   # log back in so docker works without sudo
ssh -i ~/path/to/oracle-key ubuntu@<VM_IP>
bash setup-secrets.sh                  # first business: instance "lavadero", turbolavado.org
```

## 4. GitHub secrets (one time)

Repo → Settings → Environments → `production`:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | VM public IP |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | full contents of the private key file |

The old `EC2_HOST` / `EC2_SSH_KEY` secrets can be deleted.

## 5. Deploy

Push to `main` (or re-run the workflow). CI tests, builds arm64 + amd64 images,
copies release files to the VM, and runs `scripts/deploy-host.sh`, which starts
Caddy and every instance and fails the job if any API is unhealthy. On first start
Flyway creates the schema and seed data; Caddy issues the HTTPS certificate.

Verify: `curl https://turbolavado.org/actuator/health` → `{"status":"UP"}`.

Manual redeploy on the VM: `bash /opt/lavadero/release/scripts/deploy-host.sh`.

## 6. Backups

Create a bucket `lavadero-backups` in Object Storage (20 GB free) and a
**Customer Secret Key** (Profile → Customer secret keys). The S3 endpoint is
`https://<namespace>.compat.objectstorage.<region>.oraclecloud.com` (namespace is on
the Tenancy details page). Put the endpoint and keys in each instance's `.env`
(`BACKUP_S3_*`), then on the VM:

```bash
crontab -e
# add:
CRON_TZ=America/Monterrey
0 3 * * * /opt/lavadero/release/scripts/backup-offsite.sh >> /opt/lavadero/backups/backup.log 2>&1
```

Restore drill (do this once after setup):

```bash
cd /opt/lavadero/release
bash scripts/backup-offsite.sh
bash scripts/restore-db.sh /opt/lavadero/backups/lavadero/<file>.dump   # instance "lavadero" only
```

## Adding another business (no code changes)

```bash
ssh ubuntu@<VM_IP>
bash /opt/lavadero/release/scripts/setup-secrets.sh otro otro.example.com
bash /opt/lavadero/release/scripts/deploy-host.sh
```

Point `otro.example.com` (or a subdomain like `otro.turbolavado.org`) at the same IP.
Each instance uses about 1 GB RAM; the 12 GB VM fits several.
