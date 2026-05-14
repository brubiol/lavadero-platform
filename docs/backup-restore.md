# Backup and Restore

## Local Docker backup

```bash
cd lavadero-api
scripts/backup-db.sh
```

Backups are written to `backups/lavadero-YYYYmmdd-HHMMSS.dump`.

## Local Docker restore

```bash
cd lavadero-api
scripts/restore-db.sh backups/lavadero-YYYYmmdd-HHMMSS.dump
```

This replaces the current local database contents.

## Production-style backup

Use either `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB" scripts/backup-db.sh
```

Or standard PostgreSQL variables:

```bash
export PGHOST="HOST"
export PGDATABASE="DB"
export PGUSER="USER"
export PGPASSWORD="PASSWORD"
scripts/backup-db.sh
```

## Production-style restore

```bash
export PGHOST="HOST"
export PGDATABASE="DB"
export PGUSER="USER"
export PGPASSWORD="PASSWORD"
scripts/restore-db.sh backups/lavadero-YYYYmmdd-HHMMSS.dump
```

## Verify after restore

```bash
docker exec lavadero-postgres psql -U lavadero -d lavadero -c "select count(*) from tickets;"
docker exec lavadero-postgres psql -U lavadero -d lavadero -c "select count(*) from payroll_periods;"
```
