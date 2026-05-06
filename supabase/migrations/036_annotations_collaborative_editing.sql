-- Allow any authenticated user to update or delete any annotation.
-- Annotations are a collaborative tool used by a closed team; restricting
-- edits to the original author makes them unwieldy in practice.

drop policy if exists "Users can update own annotations" on public.annotations;
create policy "Authenticated users can update annotations"
  on public.annotations for update
  using (auth.uid() is not null);

drop policy if exists "Users can delete own annotations" on public.annotations;
create policy "Authenticated users can delete annotations"
  on public.annotations for delete
  using (auth.uid() is not null);
