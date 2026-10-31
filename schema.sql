-- Run once in the new Still & Rooted project. No existing tables are removed.
begin;
create table if not exists public.study_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_key text not null check (length(entry_key) between 1 and 100),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_key)
);
alter table public.study_entries enable row level security;
revoke all on public.study_entries from anon;
grant select, insert, update, delete on public.study_entries to authenticated;
create policy "Read own study entries" on public.study_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own study entries" on public.study_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own study entries" on public.study_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own study entries" on public.study_entries for delete to authenticated using ((select auth.uid()) = user_id);
create or replace function public.stamp_study_entry() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger study_entry_timestamp before update on public.study_entries for each row execute function public.stamp_study_entry();
commit;
