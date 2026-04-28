-- 028: track citation insertions ("citations_used") + funding on custom_references.
--
-- Two bits of bookkeeping rolled into one migration because they answer the
-- same question: "how many of the references cited in our reports are EU-
-- funded?"
--
--   1. `custom_references.funding` lets the inline Reference Manager save the
--      Crossref funder array the same way the production `references` table
--      does (see migration 025). Without this, references added via the web
--      app or the Word VBA bridge had no way to carry funding metadata.
--
--   2. `citations_used` is a thin event log: every time the Word add-in
--      inserts a citation, it appends a row here with the reference id, the
--      Word document id, and (when set) the active Report Plan. Aggregating
--      this table by funding gives us the EU-funded share per report.
--
-- The Word add-in already pins the active Report Plan to a per-document
-- setting (`Office.context.document.settings`); the add-in passes both the
-- document id and the plan id when it logs an insertion.
--
-- Idempotent.

-- ── 1. funding column on custom_references ──────────────────────────────────

alter table public.custom_references
  add column if not exists funding jsonb;

create index if not exists idx_custom_references_funding
  on public.custom_references using gin (funding);

-- ── 2. citations_used event log ─────────────────────────────────────────────

create table if not exists public.citations_used (
  id            uuid primary key default gen_random_uuid(),
  -- reference_id is intentionally text (not a foreign key): it can point at
  -- either `references.id` (uuid) or `custom_references.id` (text), and the
  -- add-in does not always know which store the citation came from.
  reference_id  text        not null,
  -- Word's per-document persistent id (Office.context.document.url or a
  -- generated guid stored alongside the plan in document settings). The add-
  -- in is responsible for stability across saves.
  document_key  text        not null,
  -- Optional Report Plan id the document is scoped to. Lets us report
  -- "EU-funded share for plan X" without scanning every document.
  plan_id       text,
  -- Snapshot fields so analytics queries don't have to join across
  -- references / custom_references at read time.
  doi           text,
  funding       jsonb,
  inserted_by   uuid        references auth.users(id) on delete set null,
  inserted_at   timestamptz not null default now()
);

create index if not exists idx_citations_used_reference_id
  on public.citations_used (reference_id);
create index if not exists idx_citations_used_document_key
  on public.citations_used (document_key);
create index if not exists idx_citations_used_plan_id
  on public.citations_used (plan_id) where plan_id is not null;
create index if not exists idx_citations_used_funding
  on public.citations_used using gin (funding);

alter table public.citations_used enable row level security;

-- Authenticated staff can read the log (analytics dashboards).
drop policy if exists "Citations used readable by authenticated" on public.citations_used;
create policy "Citations used readable by authenticated"
  on public.citations_used for select using (auth.uid() is not null);

-- Authenticated users can record their own insertions; service role (used by
-- the bridge / Next.js API) bypasses RLS.
drop policy if exists "Authenticated users can record citation usage" on public.citations_used;
create policy "Authenticated users can record citation usage"
  on public.citations_used for insert
  with check (auth.uid() is not null and (inserted_by is null or inserted_by = auth.uid()));
