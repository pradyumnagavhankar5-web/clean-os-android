-- Keep each workspace response on one MVCC snapshot across phones.
begin;
alter function public.cleanos_workspace(uuid,text) stable;
create or replace function public.cleanos_schema_version() returns integer
language sql immutable set search_path = '' as $$ select 2 $$;
notify pgrst, 'reload schema';
commit;
