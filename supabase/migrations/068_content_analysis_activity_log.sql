-- ─────────────────────────────────────────────────────────────────────────────
-- Activity log, part 2: content-analysis coverage + attribution.
--
-- Migration 067 wired the Project Workspace's pw_* tables into the
-- pw_activity_log. The Content Analysis workbench, however, writes to its own
-- content_analysis_* tables — adding documents to a workspace, writing
-- whole-document summaries, tagging passages, general notes, overall tags,
-- the report outline and project codes. None of that was logged. This
-- migration extends the same trigger to those tables.
--
-- Attribution: the content-analysis store writes through the SERVICE ROLE
-- (no auth.uid() in the trigger), so the API routes now resolve the signed-in
-- user from the request's bearer token and stamp their id onto the row —
-- `author_id` on segments/summaries/notes/codes (columns that already
-- existed), and the two columns added here:
--    content_analysis_corpus.added_by     — who added/removed the document
--    content_analysis_outlines.updated_by — who last edited the outline
-- For deletes the route stamps the deleter onto the row first; the trigger
-- ignores updates that ONLY touch attribution columns, so that stamp never
-- produces a spurious "edited" entry.
--
-- Project scoping: corpus/outline rows carry a project id. Segments,
-- summaries and notes carry one too (nullable — master-library annotations
-- fall back to every project whose corpus contains the document). Overall
-- tags are document-scoped only and always fan out via the corpus.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.content_analysis_corpus
  add column if not exists added_by uuid references auth.users(id) on delete set null;

alter table public.content_analysis_outlines
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

-- ── Helpers ──────────────────────────────────────────────────────────────────
-- Friendly display label for a document: corpus metadata title → ingested
-- document title → the raw id.
create or replace function public.pw_activity_doc_label(p_doc text)
returns text
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (select coalesce(c.doc_meta->>'shortTitle', c.doc_meta->>'title')
       from public.content_analysis_corpus c
      where c.document_id = p_doc and c.doc_meta is not null
      limit 1),
    (select d.title from public.content_analysis_documents d where d.id = p_doc),
    p_doc
  );
$$;

-- Every project whose workspace corpus contains the document (for changes
-- that don't carry their own project id).
create or replace function public.pw_activity_doc_projects(p_doc text)
returns text[]
language sql stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct c.project_id), '{}'::text[])
    from public.content_analysis_corpus c
   where c.document_id = p_doc;
$$;

-- ── Trigger function (full replacement of 067's version) ─────────────────────
create or replace function public.pw_log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec          record;
  v_op         text := lower(TG_OP);
  v_project    text;
  v_projects   text[];
  v_kind       text;
  v_id         text := '';
  v_label      text;
  v_summary    text := '';
  v_actor      uuid;
  v_actor_name text := '';
  v_verb       text;
begin
  if TG_OP = 'DELETE' then rec := OLD; else rec := NEW; end if;

  -- An update that only touches attribution columns is the routes' delete- /
  -- write-stamp, not a content change — never log it.
  if TG_OP = 'UPDATE' and TG_TABLE_NAME like 'content\_analysis\_%' escape '\' then
    if (to_jsonb(OLD) - 'author_id' - 'added_by' - 'updated_by' - 'updated_at')
       = (to_jsonb(NEW) - 'author_id' - 'added_by' - 'updated_by' - 'updated_at') then
      return null;
    end if;
  end if;

  case TG_TABLE_NAME
    when 'pw_projects' then
      if TG_OP = 'INSERT' and rec.is_seed then return null; end if;
      v_project := rec.id; v_kind := 'project';
      v_id := rec.id; v_label := rec.name;

    when 'pw_modules' then
      if TG_OP = 'INSERT' and rec.is_seed then return null; end if;
      v_project := rec.project_id; v_kind := 'tool';
      v_id := rec.id; v_label := rec.name;

    when 'pw_recommendations' then
      if TG_OP = 'INSERT' and rec.is_seed then return null; end if;
      v_project := rec.project_id; v_kind := 'recommendation';
      v_id := rec.id; v_label := rec.title;

    when 'pw_recommendation_events' then
      -- Service-role inserts here are the seed pass — skip them.
      if TG_OP = 'INSERT' and auth.uid() is null then return null; end if;
      select project_id, title into v_project, v_label
        from public.pw_recommendations where id = rec.recommendation_id;
      v_kind := 'recommendation update'; v_id := rec.id::text;

    when 'pw_member_state_cells' then
      v_project := rec.project_id; v_kind := 'member-state cell';
      v_id := rec.country_code || ':' || rec.sector_id;
      v_label := rec.country_code || ' · ' || rec.sector_id;

    when 'pw_policy_annotations' then
      v_project := rec.project_id; v_kind := 'policy annotation';
      v_id := rec.id::text;
      v_label := rec.kind || ' on ' || rec.policy_id;

    when 'pw_policy_codes' then
      -- Entity = the policy, not the individual code row, so a fork (which
      -- copies every master code in one statement) coalesces into one entry.
      v_project := rec.project_id; v_kind := 'policy codes';
      v_id := rec.policy_id; v_label := rec.policy_id;
      v_verb := case v_op when 'insert' then 'Added' when 'update' then 'Edited' else 'Removed' end;
      v_summary := v_verb || ' codes on policy “' || rec.policy_id || '”';

    when 'pw_custom_module_content' then
      v_project := rec.project_id; v_kind := 'notes';
      v_id := rec.module_id;
      select name into v_label from public.pw_modules
        where project_id = rec.project_id and id = rec.module_id;
      v_label := coalesce(v_label, rec.module_id);
      v_summary := 'Edited notes “' || v_label || '”';

    when 'pw_comments' then
      v_project := rec.project_id; v_kind := 'comment';
      v_id := rec.id::text;
      v_label := left(rec.body, 80);
      if v_actor_name = '' then v_actor_name := coalesce(rec.author_name, ''); end if;
      v_verb := case v_op when 'insert' then 'Commented' when 'update' then 'Edited a comment' else 'Deleted a comment' end;
      v_summary := v_verb || ' on ' || rec.target_kind || ' ' || rec.target_id
        || ': “' || left(rec.body, 80) || '”';

    when 'pw_verifications' then
      v_project := rec.project_id; v_kind := 'verification';
      v_id := rec.target_kind || ':' || rec.target_id;
      v_label := rec.target_kind || ' ' || rec.target_id;
      v_actor_name := coalesce(nullif(rec.user_name, ''), v_actor_name);
      v_summary := case when v_op = 'delete'
        then 'Cleared their vote on ' || rec.target_kind || ' ' || rec.target_id
        else 'Marked ' || rec.target_kind || ' ' || rec.target_id || ' as ' || rec.status
      end;

    when 'pw_meetings' then
      v_project := rec.project_id; v_kind := 'meeting';
      v_id := rec.id::text; v_label := rec.title;

    when 'pw_meeting_milestones' then
      v_project := rec.project_id; v_kind := 'milestone';
      v_id := rec.id::text; v_label := rec.title;

    when 'pw_project_phases' then
      v_project := rec.project_id; v_kind := 'phase';
      v_id := rec.id::text; v_label := rec.title;

    when 'pw_flowchart_state' then
      v_project := rec.project_id; v_kind := 'flow chart';
      v_id := rec.storage_key; v_label := rec.storage_key;
      v_summary := 'Edited the flow charts';

    when 'pw_indicator_revisions' then
      -- Mirror of the Indicator Database audit log: one entry per recorded
      -- revision, with the actor and summary the app already resolved.
      v_project := rec.project_id; v_kind := 'indicator';
      v_id := rec.indicator_id;
      select name into v_label from public.pw_indicators where id = rec.indicator_id;
      v_label := coalesce(v_label, rec.snapshot #>> '{metadata,name}', rec.indicator_id);
      v_actor := rec.changed_by;
      v_actor_name := coalesce(nullif(rec.changed_by_name, ''), '');
      v_op := case rec.action
        when 'create' then 'insert'
        when 'delete' then 'delete'
        else 'update'
      end;
      v_summary := case rec.action
        when 'create'       then 'Created indicator'
        when 'edit-sheet'   then 'Edited the data grid of indicator'
        when 'import'       then 'Imported Excel data into indicator'
        when 'refresh'      then 'Refreshed indicator'
        when 'point-upsert' then 'Edited a data point of indicator'
        when 'point-delete' then 'Removed a data point of indicator'
        when 'metadata'     then 'Edited the details of indicator'
        when 'restore'      then 'Restored a previous version of indicator'
        when 'delete'       then 'Deleted indicator'
        else 'Changed indicator'
      end || ' “' || v_label || '”';

    -- ── Content analysis ────────────────────────────────────────────────────

    when 'content_analysis_corpus' then
      -- An update is a metadata refresh on a re-add — not worth a log entry.
      if TG_OP = 'UPDATE' then return null; end if;
      v_project := rec.project_id; v_kind := 'document';
      v_id := rec.document_id;
      v_label := coalesce(
        rec.doc_meta->>'shortTitle', rec.doc_meta->>'title',
        public.pw_activity_doc_label(rec.document_id));
      v_actor := rec.added_by;
      v_summary := case v_op
        when 'insert' then 'Added document “' || v_label || '” to the workspace'
        else 'Removed document “' || v_label || '” from the workspace'
      end;

    when 'content_analysis_segments' then
      -- Sentinel rows are corpus membership in disguise (pre-062 fallback).
      if rec.code_id = '__ws_corpus__' then return null; end if;
      v_kind := 'tag'; v_id := rec.document_id;
      v_label := public.pw_activity_doc_label(rec.document_id);
      v_actor := coalesce(rec.author_id, rec.note_author_id);
      if rec.project_id is not null then
        v_projects := array[rec.project_id];
      else
        v_projects := public.pw_activity_doc_projects(rec.document_id);
      end if;
      v_summary := case v_op
        when 'insert' then 'Added a tag in document “' || v_label || '”'
        when 'update' then 'Edited tags in document “' || v_label || '”'
        else 'Removed a tag from document “' || v_label || '”'
      end;

    when 'content_analysis_summaries' then
      v_kind := 'summary'; v_id := rec.document_id;
      v_label := public.pw_activity_doc_label(rec.document_id);
      v_actor := rec.author_id;
      if rec.project_id is not null then
        v_projects := array[rec.project_id];
      else
        v_projects := public.pw_activity_doc_projects(rec.document_id);
      end if;
      v_summary := case v_op
        when 'insert' then 'Wrote a summary for document “' || v_label || '”'
        when 'update' then 'Edited the summary of document “' || v_label || '”'
        else 'Deleted the summary of document “' || v_label || '”'
      end;

    when 'content_analysis_notes' then
      v_kind := 'note'; v_id := rec.document_id;
      v_label := public.pw_activity_doc_label(rec.document_id);
      v_actor := rec.author_id;
      v_actor_name := coalesce(nullif(rec.author, ''), v_actor_name);
      if rec.project_id is not null then
        v_projects := array[rec.project_id];
      else
        v_projects := public.pw_activity_doc_projects(rec.document_id);
      end if;
      v_summary := case v_op
        when 'insert' then 'Added a note on document “' || v_label || '”'
        when 'update' then 'Edited a note on document “' || v_label || '”'
        else 'Removed a note from document “' || v_label || '”'
      end;

    when 'content_analysis_overall_tags' then
      v_kind := 'overall tags'; v_id := rec.document_id;
      v_label := public.pw_activity_doc_label(rec.document_id);
      v_actor := rec.created_by;
      v_projects := public.pw_activity_doc_projects(rec.document_id);
      v_summary := case v_op
        when 'delete' then 'Removed an overall tag from document “' || v_label || '”'
        else 'Added an overall tag on document “' || v_label || '”'
      end;

    when 'content_analysis_outlines' then
      v_project := rec.project_id; v_kind := 'report outline';
      v_id := rec.project_id; v_label := 'Report outline';
      v_actor := rec.updated_by;
      v_summary := 'Edited the report outline';

    when 'content_analysis_codes' then
      -- Master codes are deterministic seed data; only project codes are
      -- workspace activity.
      if rec.project_id is null then return null; end if;
      v_project := rec.project_id; v_kind := 'code';
      v_id := rec.id; v_label := rec.name;
      v_actor := rec.author_id;

    else
      return null;
  end case;

  if v_projects is null then
    if v_project is null then return null; end if;
    v_projects := array[v_project];
  end if;
  select array_agg(distinct p) into v_projects
    from unnest(v_projects) p where p is not null and p <> '';
  if v_projects is null then return null; end if;

  v_label := coalesce(v_label, v_id);

  if v_actor is null then
    v_actor := auth.uid();
  end if;
  if v_actor is not null and v_actor_name = '' then
    select display_name into v_actor_name from public.profiles where id = v_actor;
    v_actor_name := coalesce(v_actor_name, '');
  end if;
  if v_actor_name = '' then
    begin
      v_actor_name := coalesce(
        current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
    exception when others then
      v_actor_name := '';
    end;
  end if;

  if v_summary = '' then
    v_verb := case v_op when 'insert' then 'Added' when 'update' then 'Edited' else 'Deleted' end;
    v_summary := v_verb || ' ' || v_kind
      || case when v_label <> '' then ' “' || v_label || '”' else '' end;
  end if;

  foreach v_project in array v_projects loop
    -- A project delete cascades into every child table; the single
    -- 'Deleted project' entry is enough — skip the per-row child deletes.
    if TG_TABLE_NAME <> 'pw_projects'
       and not exists (select 1 from public.pw_projects where id = v_project) then
      continue;
    end if;

    -- Coalesce repeats: same entity + action + actor + summary within 15
    -- minutes is one log entry (autosaves, write-through stores, bulk saves).
    if exists (
      select 1 from public.pw_activity_log
       where project_id = v_project
         and table_name = TG_TABLE_NAME
         and entity_id  = v_id
         and op         = v_op
         and actor_id is not distinct from v_actor
         and summary    = v_summary
         and created_at > now() - interval '15 minutes'
    ) then
      continue;
    end if;

    insert into public.pw_activity_log
      (project_id, table_name, op, entity_kind, entity_id, entity_label, summary, actor_id, actor_name)
    values
      (v_project, TG_TABLE_NAME, v_op, v_kind, v_id, v_label, v_summary, v_actor, v_actor_name);
  end loop;

  return null;
exception when others then
  -- Best-effort: a logging failure must never abort the change it records.
  raise warning 'pw_log_activity failed on %.%: %', TG_TABLE_NAME, TG_OP, sqlerrm;
  return null;
end;
$$;

-- ── Attach the trigger to the content-analysis tables ────────────────────────
do $$
declare
  t text;
  tbls text[] := array[
    'content_analysis_corpus','content_analysis_segments',
    'content_analysis_summaries','content_analysis_notes',
    'content_analysis_overall_tags','content_analysis_outlines',
    'content_analysis_codes'
  ];
begin
  foreach t in array tbls loop
    execute format('drop trigger if exists trg_%s_activity on public.%I', t, t);
    execute format(
      'create trigger trg_%s_activity
         after insert or update or delete on public.%I
         for each row execute function public.pw_log_activity()',
      t, t
    );
  end loop;
end $$;
