-- ============================================================================
-- 014 — GDPR: per-user consent flags
--
-- LLM features (AI summaries, Brussels Bulletin generation) send text to
-- third-party providers (Anthropic, OpenAI, Google, Azure OpenAI). Some
-- providers process data outside the EEA. To rely on Art. 6(1)(a) consent
-- and document Art. 49 SCC-backed transfers, we record per-user consent
-- explicitly with a timestamp.
-- ============================================================================

alter table public.profiles
  add column if not exists llm_consent_at timestamptz,
  add column if not exists analytics_consent_at timestamptz;

comment on column public.profiles.llm_consent_at is
  'GDPR Art. 6(1)(a): timestamp at which the user opted in to AI summaries '
  'using third-party LLM providers. Null = no consent on file. Cleared on '
  'withdrawal. The privacy notice describes the providers in scope.';

comment on column public.profiles.analytics_consent_at is
  'Reserved: timestamp of opt-in to optional UI-state local-storage features '
  '(news-feed reading list, Brussels Bulletin draft history, etc.). Null = '
  'only strictly-necessary storage allowed.';
