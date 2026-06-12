-- ─────────────────────────────────────────────────────────────────────────────
-- Policy Coherence 2.0 (beta) — durable block-level analysis store.
--
-- The PC 2.0 engine splits every shipped policy text into sentence-level
-- units, extracts typed claims (targets, obligations, instruments, MRV,
-- flexibility markers, cross-references) and derives within- and cross-policy
-- inconsistency findings from declared rules. These tables persist whole runs
-- so the text blocks become a stable, referenceable substrate: unit ids are
-- deterministic over the corpus, every finding cites the unit ids it rests
-- on, and the JSONB claim/evidence payloads are ML-ready as stored.
--
-- Access model mirrors the content-analysis tables: public read, writes go
-- through the service role in /api/policy-coherence-2/analyze. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pc2_runs (
  id             uuid primary key default gen_random_uuid(),
  engine_version text not null,
  corpus_hash    text not null,
  policy_count   int  not null default 0,
  block_count    int  not null default 0,
  unit_count     int  not null default 0,
  claim_count    int  not null default 0,
  finding_count  int  not null default 0,
  created_at     timestamptz not null default now(),
  unique (engine_version, corpus_hash)
);

create table if not exists public.pc2_units (
  run_id      uuid not null references public.pc2_runs(id) on delete cascade,
  id          text not null,            -- deterministic: u-<policyId>-b<order>-s<idx>
  policy_id   text not null,
  block_id    text not null,            -- content-analysis block id space
  block_kind  text not null,
  block_order int  not null,
  unit_index  int  not null,
  path        text not null default '', -- "Article 4 — …" / "Recital (12)" / "Preamble"
  start_char  int  not null,
  end_char    int  not null,
  text        text not null,
  step_ids    text[] not null default '{}',
  claims      jsonb  not null default '[]',
  primary key (run_id, id)
);

create index if not exists idx_pc2_units_policy on public.pc2_units (run_id, policy_id, block_order, unit_index);

create table if not exists public.pc2_findings (
  run_id     uuid not null references public.pc2_runs(id) on delete cascade,
  id         text not null,             -- deterministic per corpus
  rule_id    text not null,
  step_id    text not null,             -- ex-ante | horizontal | goals-means | evaluation
  severity   text not null,             -- high | medium | low | info
  scope      text not null,             -- within-policy | cross-policy
  policy_ids text[] not null default '{}',
  unit_ids   text[] not null default '{}',
  title      text not null,
  detail     text not null,
  evidence   jsonb not null default '[]',
  tier       text,
  primary key (run_id, id)
);

create index if not exists idx_pc2_findings_rule on public.pc2_findings (run_id, rule_id);
create index if not exists idx_pc2_findings_severity on public.pc2_findings (run_id, severity);

alter table public.pc2_runs     enable row level security;
alter table public.pc2_units    enable row level security;
alter table public.pc2_findings enable row level security;

drop policy if exists "PC2 runs are viewable by everyone" on public.pc2_runs;
create policy "PC2 runs are viewable by everyone"
  on public.pc2_runs for select using (true);

drop policy if exists "PC2 units are viewable by everyone" on public.pc2_units;
create policy "PC2 units are viewable by everyone"
  on public.pc2_units for select using (true);

drop policy if exists "PC2 findings are viewable by everyone" on public.pc2_findings;
create policy "PC2 findings are viewable by everyone"
  on public.pc2_findings for select using (true);
