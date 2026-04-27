# IT Handoff — Method Hub / eu_climate Postgres

This folder is a one-stop kit for ESABCC IT to stand up the in-house Postgres
that will replace the Supabase-hosted database. Every file here is either a
script IT runs as-is, or a config they drop in place. We wrote them; IT just
reviews, approves, and runs.

> **What IT is being asked for**
> Provision a Postgres 15+ instance on the ESABCC network, run the five
> commands below, hand us back one connection string, and wire the usual
> backup/monitoring. All application-side work is already done.

---

## 0 · What IT provides (one-time, before running anything)

| Thing | Why | Typical default |
|---|---|---|
| A VM / managed Postgres **15 or 16** on the ESABCC network | The engine | 4 vCPU / 8 GB RAM / 50 GB SSD is plenty |
| A private subnet, no public internet exposure | Security | Same pattern as every other internal ESABCC app |
| TLS cert for the DB host (internal CA is fine) | Encryption in transit | Issued by the ESABCC CA |
| A superuser role for install (e.g. `admin`) | Needed to create the DB + extensions | Rotated/disabled after go-live |
| Filesystem-level encryption at rest | GDPR / standard policy | SAN default |
| SIEM ingest endpoint (syslog / filebeat) | Audit | Point at `/var/log/postgresql/` |
| Backup share (nightly + 30-day WAL) | RPO 24h / PITR 30d | `/var/backups/eu_climate` |

That is all. Everything below is **scripted**.

---

## 1 · The five commands

Run these as the admin role IT provisioned. The whole sequence takes ~5 minutes
and is idempotent (safe to re-run).

```bash
# 0) Prereqs — creates DB, extensions, auth-schema shim, app role
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 \
  -f scripts/it-handoff/00-prereqs.sql

# 1) Apply schema — base + all numbered migrations
DATABASE_URL="postgresql://admin@<db-host>:5432/eu_climate" \
  ./scripts/it-handoff/01-apply-schema.sh

# 2) Create the four module service accounts + grants
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/it-handoff/02-service-accounts.sql

# 3) Verify — OK/FAIL per check, exits non-zero on any failure
./scripts/it-handoff/03-verify.sh

# 4) Rotate the five placeholder passwords to values from the ESABCC vault
psql "$DATABASE_URL" <<'SQL'
  alter role eu_climate_app    with password :'app_pw';
  alter role svc_ref_manager   with password :'ref_pw';
  alter role svc_policy_nav    with password :'pol_pw';
  alter role svc_data_explorer with password :'dat_pw';
  alter role svc_news          with password :'news_pw';
SQL
```

Hand us back the five connection strings (one per role, via PgBouncer) and
we wire them into the app's `DATABASE_URL` env. Done.

---

## 2 · The configs to drop in

| File | Destination | Reload |
|---|---|---|
| `postgresql.conf.recommended` | merge into `/etc/postgresql/15/main/postgresql.conf` (or a `conf.d/` file) | `systemctl restart postgresql` |
| `pg_hba.conf.recommended` | merge into `/etc/postgresql/15/main/pg_hba.conf` | `systemctl reload postgresql` |
| `pgbouncer.ini` | `/etc/pgbouncer/pgbouncer.ini` | `systemctl reload pgbouncer` |
| `pgbouncer.userlist.txt.template` | fill in SCRAM hashes → `/etc/pgbouncer/userlist.txt` | reloaded with pgbouncer |
| `backup.sh` | `/opt/method-hub/backup.sh`, cron nightly at 02:15 | — |
| `monitoring-queries.sql` | copy queries into Prometheus / SIEM / nagios checks | — |

---

## 3 · What IT has to decide (three questions, short)

1. **File storage**: Supabase currently hosts ~5 GB of PDFs / templates. Put them in the DB as `bytea` (simpler backups, bigger dumps) or on an SMB share next to the DB (separate backup policy)? Either works — we'll point `STORAGE_PROVIDER` at whichever.
2. **Auth provider**: the DB ships with a thin `auth.users` shim so the app keeps working after cutover. When IT is ready, we plug EU Login / OIDC into `AUTH_PROVIDER=oidc` — that's a separate mini-project, not blocking.
3. **HA**: single instance OK for v1, RTO 4h / RPO 24h. If IT wants a hot standby anyway (streaming replica), say so and we'll document the failover step.

---

## 4 · What IT is NOT being asked to do

To make the boundary crystal clear:

- ✗ Design schema — done, in `supabase-schema.sql` + `supabase/migrations/`
- ✗ Write grant/role scripts — done, in `02-service-accounts.sql`
- ✗ Write the migration / dump / restore pipeline — done, in `scripts/migrate-to-postgres/`
- ✗ Touch application code — all provider switches are flags in `.env.local`
- ✗ Decide table-level access rules — Row-Level Security is already in every migration and carries over unchanged
- ✗ Figure out which extensions — `uuid-ossp`, `pgcrypto`, `pg_trgm`, all enabled by `00-prereqs.sql`

---

## 5 · Cutover day

App-side team runs this. IT's only job is to keep the new DB reachable and witness the `verify-parity.mjs` output. See `scripts/migrate-to-postgres/` for the scripted sequence.
