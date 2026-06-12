-- ─────────────────────────────────────────────────────────────────────────────
-- Policy Coherence 2.0 (beta) — machine-learning layer results.
--
-- Persists the unsupervised pass over the pc2_units substrate (TF-IDF
-- vector-space model → cosine pair mining → signal classification → theme
-- clustering): contradiction candidates, trade-off candidates,
-- duplication/overlap pairs and cross-policy theme clusters. Rows reference
-- the run whose units they were learned from, so pair.unit_a/unit_b and
-- cluster.unit_ids join back to pc2_units(run_id, id).
--
-- Access model as the other PC2 tables: public read, writes via the service
-- role in /api/policy-coherence-2/ml. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pc2_ml_pairs (
  run_id       uuid not null references public.pc2_runs(id) on delete cascade,
  id           text not null,            -- deterministic over the unit-id pair
  ml_version   text not null,
  kind         text not null,            -- contradiction-candidate | tradeoff-candidate | duplication-overlap
  score        double precision not null,
  cosine       double precision not null,
  scope        text not null,            -- within-policy | cross-policy
  policy_a     text not null,
  policy_b     text not null,
  unit_a       text not null,
  unit_b       text not null,
  path_a       text not null default '',
  path_b       text not null default '',
  quote_a      text not null default '',
  quote_b      text not null default '',
  shared_terms text[] not null default '{}',
  signals      text[] not null default '{}',
  axis         text,
  primary key (run_id, id)
);

create index if not exists idx_pc2_ml_pairs_kind on public.pc2_ml_pairs (run_id, kind);

create table if not exists public.pc2_ml_clusters (
  run_id     uuid not null references public.pc2_runs(id) on delete cascade,
  id         text not null,
  ml_version text not null,
  label      text not null,
  size       int  not null,
  policy_ids text[] not null default '{}',
  unit_ids   text[] not null default '{}',
  axis       text,
  primary key (run_id, id)
);

alter table public.pc2_ml_pairs    enable row level security;
alter table public.pc2_ml_clusters enable row level security;

drop policy if exists "PC2 ML pairs are viewable by everyone" on public.pc2_ml_pairs;
create policy "PC2 ML pairs are viewable by everyone"
  on public.pc2_ml_pairs for select using (true);

drop policy if exists "PC2 ML clusters are viewable by everyone" on public.pc2_ml_clusters;
create policy "PC2 ML clusters are viewable by everyone"
  on public.pc2_ml_clusters for select using (true);
