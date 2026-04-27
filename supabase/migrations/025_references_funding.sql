-- 025: add funding metadata to references.
--
-- Funding entries follow the CrossRef shape (name + DOI prefix + award list).
-- We lift it out of csl_json into its own column so we can aggregate the
-- "EU-funded share" of a report library cheaply via a GIN index, instead of
-- scanning every csl_json blob.
--
-- Existing rows backfill from csl_json->'funder' so DOI-imported references
-- pick up funding info without a re-import.

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS funding JSONB;

UPDATE public.references
SET funding = csl_json -> 'funder'
WHERE funding IS NULL
  AND csl_json ? 'funder';

CREATE INDEX IF NOT EXISTS references_funding_idx
  ON public.references USING gin (funding);
