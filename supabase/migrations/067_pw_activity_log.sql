-- ─────────────────────────────────────────────────────────────────────────────
-- Project Workspace activity log.
--
-- One append-only table (`pw_activity_log`) recording who changed what, when,
-- across the whole Project Workspace — projects, tools, indicators,
-- recommendations, meetings, milestones, phases, comments, verifications,
-- member-state cells, policy annotations/codes, notes and flow charts.
--
-- Entries are written by a single AFTER trigger (`pw_log_activity`) attached
-- to every pw_* table, so every code path — current and future — is captured
-- without each API route having to remember to log. Indicator changes are not
-- triggered off `pw_indicators` / `pw_indicator_points` directly (the seed and
-- refresh jobs write thousands of rows there); instead the trigger listens on
-- `pw_indicator_revisions`, which already records exactly the user-driven
-- indicator actions with a ready-made summary and actor name.
--
-- Noise control:
--   • seed inserts (`is_seed = true`) are skipped,
--   • cascade deletes under a project delete collapse into the single
--     "Deleted project" entry (children are skipped once the project row is
--     gone),
--   • repeats of the same action on the same entity by the same person within
--     15 minutes coalesce into one entry (autosaved notes, flow-chart
--     write-through, code forks).
--
-- The trigger is best-effort: any unexpected error is swallowed so a logging
-- failure can never abort the data change it is recording.
--
-- `project_id` deliberately has NO foreign key — the log of a deleted project
-- (including its deletion) must survive the project row.
--
-- Read by GET /api/project-workspace/projects/[projectId]/activity; included
-- in the nightly off-site backup (scripts/backup-content-analysis.mjs).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pw_activity_log (
  id            bigint      generated always as identity primary key,
  project_id    text        not null,
  table_name    text        not null,
  op            text        not null check (op in ('insert','update','delete')),
  -- Friendly entity kind ('indicator', 'meeting', 'comment', …) + identity.
  entity_kind   text        not null,
  entity_id     text        not null default '',
  entity_label  text        not null default '',
  -- One human-readable line, e.g. 'Edited meeting “Kick-off”'.
  summary       text        not null default '',
  actor_id      uuid,
  actor_name    text        not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists pw_activity_log_project_idx
  on public.pw_activity_log(project_id, id desc);

-- Serves the 15-minute coalescing lookup in the trigger.
create index if not exists pw_activity_log_coalesce_idx
  on public.pw_activity_log(project_id, table_name, entity_id, created_at desc);

alter table public.pw_activity_log enable row level security;

-- Read-only for clients; rows are only ever written by the trigger function
-- below (security definer — the table owner bypasses RLS). No insert/update/
-- delete policies on purpose: the log is append-only and tamper-proof from
-- the app's point of view.
drop policy if exists "pw_activity_log read" on public.pw_activity_log;
create policy "pw_activity_log read"
  on public.pw_activity_log for select to authenticated using (true);

-- ── Trigger function ─────────────────────────────────────────────────────────
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
  v_kind       text;
  v_id         text := '';
  v_label      text;
  v_summary    text := '';
  v_actor      uuid;
  v_actor_name text := '';
  v_verb       text;
begin
  if TG_OP = 'DELETE' then rec := OLD; else rec := NEW; end if;

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

    else
      return null;
  end case;

  if v_project is null then return null; end if;

  -- A project delete cascades into every child table; the single
  -- 'Deleted project' entry is enough — skip the per-row child deletes.
  if TG_TABLE_NAME <> 'pw_projects'
     and not exists (select 1 from public.pw_projects where id = v_project) then
    return null;
  end if;

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

  -- Coalesce repeats: same entity + action + actor + summary within 15
  -- minutes is one log entry (autosaves, write-through stores, bulk forks).
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
    return null;
  end if;

  insert into public.pw_activity_log
    (project_id, table_name, op, entity_kind, entity_id, entity_label, summary, actor_id, actor_name)
  values
    (v_project, TG_TABLE_NAME, v_op, v_kind, v_id, v_label, v_summary, v_actor, v_actor_name);

  return null;
exception when others then
  -- Best-effort: a logging failure must never abort the change it records.
  raise warning 'pw_log_activity failed on %.%: %', TG_TABLE_NAME, TG_OP, sqlerrm;
  return null;
end;
$$;

-- ── Attach the trigger to every workspace table ──────────────────────────────
do $$
declare
  t text;
  tbls text[] := array[
    'pw_projects','pw_modules','pw_recommendations','pw_recommendation_events',
    'pw_member_state_cells','pw_policy_annotations','pw_policy_codes',
    'pw_custom_module_content','pw_comments','pw_verifications',
    'pw_meetings','pw_meeting_milestones','pw_project_phases','pw_flowchart_state'
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

-- Indicator changes arrive via the revisions archive (insert-only).
drop trigger if exists trg_pw_indicator_revisions_activity on public.pw_indicator_revisions;
create trigger trg_pw_indicator_revisions_activity
  after insert on public.pw_indicator_revisions
  for each row execute function public.pw_log_activity();
