-- ─────────────────────────────────────────────────────────────────────────────
-- Activity log, part 3: end-to-end self-test.
--
-- "The log shows nothing" has too many possible causes to debug blind from
-- the UI (triggers missing, project row absent, trigger erroring, or simply
-- no changes made since installation). This function settles it: it performs
-- a real probe write (insert + delete of a uniquely-keyed pw_flowchart_state
-- row), checks the trigger recorded it in pw_activity_log, removes the probe
-- entries again, and reports the outcome. The Activity log dialog runs it
-- when the log is empty and shows the verdict, so an empty log is always
-- accompanied by "verified working — nothing has happened yet" or the exact
-- failure reason.
--
-- Leaves no trace: both the probe row and its log entries are deleted.
-- Idempotent; safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.pw_activity_log_selftest(p_project text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k text := '__activity_selftest__' || extract(epoch from clock_timestamp())::text;
  n int;
begin
  if to_regclass('public.pw_activity_log') is null then
    return jsonb_build_object('ok', false, 'reason', 'log-table-missing');
  end if;
  -- The trigger only logs changes for projects that exist in pw_projects;
  -- a missing row would silently swallow every change in this project.
  if not exists (select 1 from public.pw_projects where id = p_project) then
    return jsonb_build_object('ok', false, 'reason', 'project-not-in-db');
  end if;

  begin
    insert into public.pw_flowchart_state (project_id, storage_key, data)
      values (p_project, k, '{}'::jsonb);
    delete from public.pw_flowchart_state
      where project_id = p_project and storage_key = k;
  exception when others then
    return jsonb_build_object('ok', false, 'reason', 'probe-write-failed', 'error', sqlerrm);
  end;

  select count(*) into n from public.pw_activity_log
    where project_id = p_project
      and table_name = 'pw_flowchart_state'
      and entity_id = k;

  -- Clean up the probe's log entries — the self-test must leave no trace.
  delete from public.pw_activity_log
    where project_id = p_project
      and table_name = 'pw_flowchart_state'
      and entity_id = k;

  return jsonb_build_object(
    'ok', n > 0,
    'reason', case when n > 0 then 'ok' else 'trigger-did-not-fire' end
  );
end;
$$;

grant execute on function public.pw_activity_log_selftest(text) to anon, authenticated, service_role;
