-- CleanOS shared workspaces, schema version 1.
-- Run once in a new Supabase project. No existing application data is dropped.
-- App users may read through RLS and mutate only through the checked RPCs below.
begin;

do $$ begin
  if pg_catalog.to_regclass('public.cleanos_organizations') is not null then
    raise exception 'CleanOS is already installed. Do not reset the database; use an update migration instead.';
  end if;
end $$;

create table public.cleanos_organizations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  inventory_mode text not null default 'shared' check (inventory_mode in ('shared', 'facility')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.cleanos_members (
  org_id uuid not null references public.cleanos_organizations(id),
  user_id uuid not null references auth.users(id),
  name text not null check (length(btrim(name)) between 1 and 120),
  role text not null check (role in ('admin','supervisor','staff')),
  active boolean not null default true,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index cleanos_members_user_idx on public.cleanos_members(user_id, org_id) where active;

create table public.cleanos_facilities (
  org_id uuid not null references public.cleanos_organizations(id),
  id text not null check (length(id) between 1 and 120),
  name text not null check (length(btrim(name)) between 1 and 160),
  type text not null check (length(btrim(type)) between 1 and 80),
  address text not null check (length(btrim(address)) between 1 and 1000),
  active boolean not null default true,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id,id)
);
create table public.cleanos_areas (
  org_id uuid not null,
  facility_id text not null,
  id text not null check (length(id) between 1 and 120),
  name text not null check (length(btrim(name)) between 1 and 160),
  active boolean not null default true,
  primary key (org_id,facility_id,id),
  foreign key (org_id,facility_id) references public.cleanos_facilities(org_id,id)
);
create table public.cleanos_locations (
  org_id uuid not null references public.cleanos_organizations(id),
  id text not null check (length(id) between 1 and 120),
  name text not null check (length(btrim(name)) between 1 and 160),
  facility_id text,
  active boolean not null default true,
  primary key (org_id,id),
  foreign key (org_id,facility_id) references public.cleanos_facilities(org_id,id)
);
create unique index cleanos_location_facility_idx on public.cleanos_locations(org_id,facility_id)
  where facility_id is not null;

create table public.cleanos_products (
  org_id uuid not null references public.cleanos_organizations(id),
  id text not null check (length(id) between 1 and 120),
  name text not null check (length(btrim(name)) between 1 and 160),
  category text not null check (length(btrim(category)) between 1 and 80),
  unit text not null check (length(btrim(unit)) between 1 and 40),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0 and unit_price::text not in ('NaN','Infinity','-Infinity')),
  active boolean not null default true,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id,id)
);
create table public.cleanos_balances (
  org_id uuid not null,
  product_id text not null,
  location_id text not null,
  quantity numeric(15,3) not null default 0 check (quantity >= 0 and quantity::text not in ('NaN','Infinity','-Infinity')),
  threshold numeric(15,3) not null default 0 check (threshold >= 0 and threshold::text not in ('NaN','Infinity','-Infinity')),
  revision integer not null default 1 check (revision > 0),
  primary key (org_id,product_id,location_id),
  foreign key (org_id,product_id) references public.cleanos_products(org_id,id),
  foreign key (org_id,location_id) references public.cleanos_locations(org_id,id)
);
create table public.cleanos_tasks (
  org_id uuid not null references public.cleanos_organizations(id),
  id text not null check (length(id) between 1 and 120),
  title text not null check (length(btrim(title)) between 1 and 240),
  facility_id text not null,
  area_id text not null,
  assignee_id uuid not null,
  due_date date not null,
  priority text not null check (priority in ('low','medium','high')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  checklist jsonb not null check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) between 1 and 100),
  notes text not null default '' check (length(notes) <= 8000),
  revision integer not null default 1 check (revision > 0),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id,id),
  foreign key (org_id,facility_id,area_id) references public.cleanos_areas(org_id,facility_id,id),
  foreign key (org_id,assignee_id) references public.cleanos_members(org_id,user_id)
);
create index cleanos_tasks_assignee_idx on public.cleanos_tasks(org_id,assignee_id,due_date);
create index cleanos_tasks_date_idx on public.cleanos_tasks(org_id,due_date);
create index cleanos_tasks_status_idx on public.cleanos_tasks(org_id,status,due_date);

create table public.cleanos_stock_movements (
  org_id uuid not null,
  id uuid not null default pg_catalog.gen_random_uuid(),
  request_id text not null check (length(request_id) between 1 and 300),
  product_id text not null,
  location_id text not null,
  direction text not null check (direction in ('in','out')),
  quantity numeric(15,3) not null check (quantity > 0 and quantity::text not in ('NaN','Infinity','-Infinity')),
  note text not null default '' check (length(note) <= 2000),
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (org_id,id),
  unique (org_id,request_id),
  foreign key (org_id,product_id,location_id) references public.cleanos_balances(org_id,product_id,location_id),
  foreign key (org_id,actor_id) references public.cleanos_members(org_id,user_id)
);
create index cleanos_stock_time_idx on public.cleanos_stock_movements(org_id,location_id,created_at desc);

create table public.cleanos_invites (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  org_id uuid not null references public.cleanos_organizations(id),
  email text not null check (length(email) between 3 and 254 and email = lower(btrim(email))),
  role text not null check (role in ('admin','supervisor','staff')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  accepted_by uuid,
  accepted_at timestamptz,
  foreign key (org_id,created_by) references public.cleanos_members(org_id,user_id),
  foreign key (org_id,accepted_by) references public.cleanos_members(org_id,user_id),
  check ((accepted_by is null) = (accepted_at is null))
);
create index cleanos_invites_org_email_idx on public.cleanos_invites(org_id,email);

-- Helper functions are not client mutation entry points.
create function public.cleanos_actor() returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or not exists (
    select 1 from auth.users u where u.id=v_user and u.email_confirmed_at is not null
  ) then
    raise exception using errcode='42501', message='Sign in with a verified email address.';
  end if;
  return v_user;
end;
$$;

create function public.cleanos_role(p_org_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.cleanos_members m
  where m.org_id=p_org_id and m.user_id=auth.uid() and m.active
    and exists(select 1 from auth.users u where u.id=m.user_id and u.email_confirmed_at is not null)
$$;

create function public.cleanos_require_role(p_org_id uuid,p_roles text[]) returns text
language plpgsql security definer set search_path = '' as $$
declare v_role text;
begin
  perform public.cleanos_actor();
  v_role := public.cleanos_role(p_org_id);
  if v_role is null or not (v_role = any(p_roles)) then
    raise exception using errcode='42501', message='Your account does not have access to this operation.';
  end if;
  return v_role;
end;
$$;

create function public.cleanos_checked_text(p_value text,p_label text,p_max integer,p_allow_empty boolean default false) returns text
language plpgsql immutable set search_path = '' as $$
declare v_value text := btrim(coalesce(p_value,''));
begin
  if (not p_allow_empty and length(v_value)=0) or length(v_value)>p_max then
    raise exception using errcode='22023', message=p_label || ' is missing or too long.';
  end if;
  return v_value;
end;
$$;

create function public.cleanos_checked_amount(p_value numeric,p_label text,p_positive boolean default false,p_scale integer default 3) returns numeric
language plpgsql immutable set search_path = '' as $$
begin
  if p_value is null or p_value::text in ('NaN','Infinity','-Infinity')
    or p_value<0 or (p_positive and p_value=0) or p_value>999999999.999
    or p_value<>round(p_value,p_scale) then
    raise exception using errcode='22023', message=p_label || ' must be a valid amount with at most ' || p_scale || ' decimal places.';
  end if;
  return p_value;
end;
$$;

create function public.cleanos_checked_checklist(p_items jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare v_item jsonb; v_id text; v_ids text[] := array[]::text[]; v_result jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception using errcode='22023', message='Add between 1 and 100 checklist steps.';
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) is distinct from 'object' or jsonb_typeof(v_item->'done') is distinct from 'boolean' then
      raise exception using errcode='22023', message='Every checklist step needs a label and checked state.';
    end if;
    v_id := public.cleanos_checked_text(v_item->>'id','Checklist ID',160);
    if v_id=any(v_ids) then raise exception using errcode='22023', message='Checklist IDs must be unique.'; end if;
    v_ids := array_append(v_ids,v_id);
    v_result := v_result || jsonb_build_array(jsonb_build_object('id',v_id,
      'label',public.cleanos_checked_text(v_item->>'label','Checklist label',400),'done',(v_item->>'done')::boolean));
  end loop;
  return v_result;
end;
$$;

create function public.cleanos_schema_version() returns integer language sql immutable set search_path = '' as $$ select 1 $$;

create function public.cleanos_my_workspaces() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public.cleanos_actor(); v_result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'role',m.role) order by o.name),'[]'::jsonb)
    into v_result from public.cleanos_organizations o join public.cleanos_members m on m.org_id=o.id
    where m.user_id=v_user and m.active;
  return v_result;
end;
$$;

create function public.cleanos_create_workspace(p_name text,p_display_name text,p_inventory_mode text default 'shared') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public.cleanos_actor(); v_org uuid;
begin
  if p_inventory_mode not in ('shared','facility') or p_inventory_mode is null then
    raise exception using errcode='22023', message='Choose shared or facility inventory.';
  end if;
  insert into public.cleanos_organizations(name,inventory_mode,created_by)
    values(public.cleanos_checked_text(p_name,'Workspace name',120),p_inventory_mode,v_user) returning id into v_org;
  insert into public.cleanos_members(org_id,user_id,name,role) values(v_org,v_user,
    public.cleanos_checked_text(p_display_name,'Your name',120),'admin');
  insert into public.cleanos_locations(org_id,id,name) values(v_org,'main','Main stock room');
  return v_org;
end;
$$;

create function public.cleanos_create_location(p_org_id uuid,p_name text,p_facility_id text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare v_id text := pg_catalog.gen_random_uuid()::text;
begin
  perform public.cleanos_require_role(p_org_id,array['admin']);
  perform 1 from public.cleanos_organizations where id=p_org_id for update;
  if p_facility_id is not null then
    perform 1 from public.cleanos_facilities f where f.org_id=p_org_id and f.id=p_facility_id and f.active for share;
    if not found then raise exception using errcode='22023', message='Choose an active facility in this workspace.'; end if;
  end if;
  insert into public.cleanos_locations(org_id,id,name,facility_id) values(p_org_id,v_id,
    public.cleanos_checked_text(p_name,'Stock room name',160),p_facility_id);
  insert into public.cleanos_balances(org_id,product_id,location_id)
    select p_org_id,p.id,v_id from public.cleanos_products p where p.org_id=p_org_id;
  return v_id;
end;
$$;

create function public.cleanos_save_facility(p_org_id uuid,p_facility jsonb,p_expected_revision integer default null,p_create_location boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id text; v_name text; v_type text; v_address text; v_active boolean;
  v_old public.cleanos_facilities%rowtype; v_area jsonb; v_area_id text; v_ids text[] := array[]::text[];
begin
  perform public.cleanos_require_role(p_org_id,array['admin']);
  perform 1 from public.cleanos_organizations where id=p_org_id for update;
  v_id := public.cleanos_checked_text(p_facility->>'id','Facility ID',120);
  v_name := public.cleanos_checked_text(p_facility->>'name','Facility name',160);
  v_type := public.cleanos_checked_text(p_facility->>'type','Facility type',80);
  v_address := public.cleanos_checked_text(p_facility->>'address','Facility address',1000);
  v_active := coalesce((p_facility->>'active')::boolean,true);
  if jsonb_typeof(p_facility->'areas') is distinct from 'array' or jsonb_array_length(p_facility->'areas')>100 then
    raise exception using errcode='22023', message='Provide the facility cleaning areas (up to 100).';
  end if;
  select * into v_old from public.cleanos_facilities f where f.org_id=p_org_id and f.id=v_id for update;
  if found then
    if p_expected_revision is null or p_expected_revision<>v_old.revision then
      raise exception using errcode='40001', message='This facility changed on another phone. Refresh and try again.';
    end if;
    if not v_active and exists(select 1 from public.cleanos_tasks t where t.org_id=p_org_id and t.facility_id=v_id and t.status<>'completed') then
      raise exception using errcode='22023', message='Complete or move the open tasks before archiving this facility.';
    end if;
    update public.cleanos_facilities set name=v_name,type=v_type,address=v_address,active=v_active,
      revision=revision+1,updated_at=now() where org_id=p_org_id and id=v_id;
  else
    if p_expected_revision is not null then raise exception using errcode='40001', message='This facility no longer exists.'; end if;
    insert into public.cleanos_facilities(org_id,id,name,type,address,active) values(p_org_id,v_id,v_name,v_type,v_address,v_active);
  end if;
  for v_area in select value from jsonb_array_elements(p_facility->'areas') loop
    v_area_id := public.cleanos_checked_text(v_area->>'id','Area ID',120);
    if v_area_id=any(v_ids) then raise exception using errcode='22023', message='Area IDs must be unique.'; end if;
    v_ids := array_append(v_ids,v_area_id);
    if not coalesce((v_area->>'active')::boolean,true) and exists(
      select 1 from public.cleanos_tasks t where t.org_id=p_org_id and t.facility_id=v_id and t.area_id=v_area_id and t.status<>'completed'
    ) then raise exception using errcode='22023', message='Complete or move the open tasks before archiving this area.'; end if;
    insert into public.cleanos_areas(org_id,facility_id,id,name,active)
      values(p_org_id,v_id,v_area_id,public.cleanos_checked_text(v_area->>'name','Area name',160),coalesce((v_area->>'active')::boolean,true))
      on conflict(org_id,facility_id,id) do update set name=excluded.name,active=excluded.active;
  end loop;
  -- An omitted area remains readable as an archived historical reference.
  if exists(select 1 from public.cleanos_tasks t where t.org_id=p_org_id and t.facility_id=v_id
      and not(t.area_id=any(v_ids)) and t.status<>'completed') then
    raise exception using errcode='22023', message='Keep areas with open tasks until those tasks are completed or moved.';
  end if;
  update public.cleanos_areas set active=false where org_id=p_org_id and facility_id=v_id and not(id=any(v_ids));
  if p_create_location and v_active and not exists(select 1 from public.cleanos_locations l where l.org_id=p_org_id and l.facility_id=v_id) then
    perform public.cleanos_create_location(p_org_id,left(v_name,154) || ' stock',v_id);
  end if;
end;
$$;

create function public.cleanos_save_task(p_org_id uuid,p_task jsonb,p_expected_revision integer default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id text; v_title text; v_facility text; v_area text; v_assignee uuid; v_date date;
  v_priority text; v_status text; v_notes text; v_checklist jsonb; v_old public.cleanos_tasks%rowtype;
begin
  perform public.cleanos_require_role(p_org_id,array['admin','supervisor']);
  v_id := public.cleanos_checked_text(p_task->>'id','Task ID',120);
  v_title := public.cleanos_checked_text(p_task->>'title','Task title',240);
  v_facility := public.cleanos_checked_text(p_task->>'facilityId','Facility ID',120);
  v_area := public.cleanos_checked_text(p_task->>'areaId','Area ID',120);
  v_assignee := (p_task->>'assigneeId')::uuid;
  if (p_task->>'dueDate') is null or (p_task->>'dueDate') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception using errcode='22023', message='Enter a valid task date.';
  end if;
  v_date := (p_task->>'dueDate')::date;
  v_priority := p_task->>'priority';
  v_status := p_task->>'status';
  v_notes := coalesce(p_task->>'notes','');
  if v_priority is null or v_priority not in ('low','medium','high') or v_status is null
    or v_status not in ('pending','in_progress','completed') or length(v_notes)>8000 then
    raise exception using errcode='22023', message='Provide a valid priority, status and task notes.';
  end if;
  v_checklist := public.cleanos_checked_checklist(p_task->'checklist');
  if v_status='completed' and exists(select 1 from jsonb_array_elements(v_checklist) c where not(c->>'done')::boolean) then
    raise exception using errcode='22023', message='Complete every checklist step before completing the task.';
  end if;
  select * into v_old from public.cleanos_tasks t where t.org_id=p_org_id and t.id=v_id for update;
  if found then
    if p_expected_revision is null or p_expected_revision<>v_old.revision then
      raise exception using errcode='40001', message='This task changed on another phone. Refresh and try again.';
    end if;
  elsif p_expected_revision is not null then
    raise exception using errcode='40001', message='This task no longer exists.';
  end if;
  perform 1 from public.cleanos_facilities f where f.org_id=p_org_id and f.id=v_facility and f.active for share;
  if not found then raise exception using errcode='22023', message='Choose an active facility in this workspace.'; end if;
  perform 1 from public.cleanos_areas a where a.org_id=p_org_id and a.facility_id=v_facility and a.id=v_area and a.active for share;
  if not found then raise exception using errcode='22023', message='Choose an active cleaning area in that facility.'; end if;
  if v_assignee is null or not exists(select 1 from public.cleanos_members m
      where m.org_id=p_org_id and m.user_id=v_assignee and m.active) then
    raise exception using errcode='22023', message='Assign this task to an active workspace member.';
  end if;
  if v_old.id is null then
    insert into public.cleanos_tasks(org_id,id,title,facility_id,area_id,assignee_id,due_date,priority,status,checklist,notes,created_by,updated_by)
      values(p_org_id,v_id,v_title,v_facility,v_area,v_assignee,v_date,v_priority,v_status,v_checklist,v_notes,auth.uid(),auth.uid());
  else
    update public.cleanos_tasks set title=v_title,facility_id=v_facility,area_id=v_area,assignee_id=v_assignee,
      due_date=v_date,priority=v_priority,status=v_status,checklist=v_checklist,notes=v_notes,
      revision=revision+1,updated_by=auth.uid(),updated_at=now() where org_id=p_org_id and id=v_id;
  end if;
end;
$$;

create function public.cleanos_set_task_status(p_org_id uuid,p_task_id text,p_status text,p_expected_revision integer default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_role text; v_task public.cleanos_tasks%rowtype;
begin
  v_role := public.cleanos_require_role(p_org_id,array['admin','supervisor','staff']);
  select * into v_task from public.cleanos_tasks t where t.org_id=p_org_id and t.id=p_task_id for update;
  if not found or (v_role='staff' and v_task.assignee_id<>auth.uid()) then
    raise exception using errcode='42501', message='This task is unavailable to your account.';
  end if;
  if p_status is null or p_status not in ('pending','in_progress','completed')
    or (v_role='staff' and p_status='pending') then
    raise exception using errcode='22023', message='Choose a valid task status.';
  end if;
  if v_task.status=p_status then return; end if;
  if p_expected_revision is null or p_expected_revision<>v_task.revision then
    raise exception using errcode='40001', message='This task changed on another phone. Refresh and try again.';
  end if;
  if p_status='completed' and exists(select 1 from jsonb_array_elements(v_task.checklist) c where not(c->>'done')::boolean) then
    raise exception using errcode='22023', message='Complete every checklist step before completing the task.';
  end if;
  if p_status<>'completed' then
    perform 1 from public.cleanos_facilities f where f.org_id=p_org_id and f.id=v_task.facility_id and f.active for share;
    if not found then raise exception using errcode='22023', message='Archived facilities cannot receive reopened tasks.'; end if;
    perform 1 from public.cleanos_areas a where a.org_id=p_org_id and a.facility_id=v_task.facility_id and a.id=v_task.area_id and a.active for share;
    if not found then raise exception using errcode='22023', message='Archived cleaning areas cannot receive reopened tasks.'; end if;
  end if;
  update public.cleanos_tasks set status=p_status,revision=revision+1,updated_by=auth.uid(),updated_at=now()
    where org_id=p_org_id and id=p_task_id;
end;
$$;

create function public.cleanos_set_checklist_done(p_org_id uuid,p_task_id text,p_item_id text,p_done boolean,p_expected_revision integer default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_role text; v_task public.cleanos_tasks%rowtype; v_index integer; v_current boolean; v_next jsonb;
begin
  v_role := public.cleanos_require_role(p_org_id,array['admin','supervisor','staff']);
  select * into v_task from public.cleanos_tasks t where t.org_id=p_org_id and t.id=p_task_id for update;
  if not found or (v_role='staff' and v_task.assignee_id<>auth.uid()) then
    raise exception using errcode='42501', message='This task is unavailable to your account.';
  end if;
  if p_done is null then raise exception using errcode='22023', message='Provide the desired checklist state.'; end if;
  select (c.ordinality-1)::integer,(c.value->>'done')::boolean into v_index,v_current
    from jsonb_array_elements(v_task.checklist) with ordinality c(value,ordinality) where c.value->>'id'=p_item_id;
  if not found then raise exception using errcode='22023', message='This checklist step no longer exists.'; end if;
  -- A retry of an already-applied desired state is a successful no-op.
  if v_current=p_done then return; end if;
  if p_expected_revision is null or p_expected_revision<>v_task.revision then
    raise exception using errcode='40001', message='This task changed on another phone. Refresh and try again.';
  end if;
  if v_task.status='completed' and not p_done then
    perform 1 from public.cleanos_facilities f where f.org_id=p_org_id and f.id=v_task.facility_id and f.active for share;
    if not found then raise exception using errcode='22023', message='Archived facilities cannot receive reopened tasks.'; end if;
    perform 1 from public.cleanos_areas a where a.org_id=p_org_id and a.facility_id=v_task.facility_id and a.id=v_task.area_id and a.active for share;
    if not found then raise exception using errcode='22023', message='Archived cleaning areas cannot receive reopened tasks.'; end if;
  end if;
  v_next := jsonb_set(v_task.checklist,array[v_index::text,'done'],to_jsonb(p_done),false);
  update public.cleanos_tasks set checklist=v_next,
    status=case when v_task.status='completed' and not p_done then 'in_progress' else status end,
    revision=revision+1,updated_by=auth.uid(),updated_at=now() where org_id=p_org_id and id=p_task_id;
end;
$$;

create function public.cleanos_record_stock(p_org_id uuid,p_location_id text,p_product_id text,p_direction text,
  p_quantity numeric,p_note text,p_request_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_amount numeric; v_note text; v_request text; v_previous public.cleanos_stock_movements%rowtype;
  v_balance public.cleanos_balances%rowtype; v_next numeric;
begin
  perform public.cleanos_require_role(p_org_id,array['admin','supervisor']);
  v_amount := public.cleanos_checked_amount(p_quantity,'Stock quantity',true);
  v_note := public.cleanos_checked_text(p_note,'Stock note',2000,true);
  v_request := public.cleanos_checked_text(p_request_id,'Stock request ID',300);
  if p_direction is null or p_direction not in ('in','out') then raise exception using errcode='22023', message='Choose stock in or stock out.'; end if;
  -- Serialize a request before checking its ledger entry, including two concurrent retries.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_org_id::text || ':' || v_request,0));
  select * into v_previous from public.cleanos_stock_movements s where s.org_id=p_org_id and s.request_id=v_request;
  if found then
    if v_previous.actor_id=auth.uid() and v_previous.location_id=p_location_id and v_previous.product_id=p_product_id
      and v_previous.direction=p_direction and v_previous.quantity=v_amount and v_previous.note=v_note then return; end if;
    raise exception using errcode='22023', message='This stock request ID has already been used for different details.';
  end if;
  perform 1 from public.cleanos_products p where p.org_id=p_org_id and p.id=p_product_id and p.active for update;
  if not found then raise exception using errcode='22023', message='Choose an active product in this workspace.'; end if;
  perform 1 from public.cleanos_locations l where l.org_id=p_org_id and l.id=p_location_id and l.active for share;
  if not found then raise exception using errcode='22023', message='Choose an active stock room in this workspace.'; end if;
  select * into v_balance from public.cleanos_balances b where b.org_id=p_org_id and b.product_id=p_product_id
    and b.location_id=p_location_id for update;
  if not found then raise exception using errcode='22023', message='This product does not have a balance in the selected stock room.'; end if;
  if p_direction='out' and v_amount>v_balance.quantity then
    raise exception using errcode='22023', message='Stock out cannot exceed the available quantity.';
  end if;
  v_next := v_balance.quantity + case when p_direction='in' then v_amount else -v_amount end;
  if v_next>999999999999.999 then raise exception using errcode='22023', message='The resulting stock quantity is too large.'; end if;
  insert into public.cleanos_stock_movements(org_id,request_id,product_id,location_id,direction,quantity,note,actor_id)
    values(p_org_id,v_request,p_product_id,p_location_id,p_direction,v_amount,v_note,auth.uid());
  update public.cleanos_balances set quantity=v_next,revision=revision+1
    where org_id=p_org_id and product_id=p_product_id and location_id=p_location_id;
end;
$$;

create function public.cleanos_set_threshold(p_org_id uuid,p_location_id text,p_product_id text,p_threshold numeric,p_expected_revision integer default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_value numeric; v_balance public.cleanos_balances%rowtype;
begin
  perform public.cleanos_require_role(p_org_id,array['admin','supervisor']);
  v_value := public.cleanos_checked_amount(p_threshold,'Reorder threshold');
  perform 1 from public.cleanos_products p where p.org_id=p_org_id and p.id=p_product_id and p.active for share;
  if not found then raise exception using errcode='22023', message='Choose an active product in this workspace.'; end if;
  select * into v_balance from public.cleanos_balances b where b.org_id=p_org_id and b.product_id=p_product_id and b.location_id=p_location_id for update;
  if not found then raise exception using errcode='22023', message='This stock balance is unavailable.'; end if;
  if v_balance.threshold=v_value then return; end if;
  if p_expected_revision is null or p_expected_revision<>v_balance.revision then
    raise exception using errcode='40001', message='This stock balance changed on another phone. Refresh and try again.';
  end if;
  update public.cleanos_balances set threshold=v_value,revision=revision+1
    where org_id=p_org_id and product_id=p_product_id and location_id=p_location_id;
end;
$$;

create function public.cleanos_save_product(p_org_id uuid,p_product jsonb,p_expected_revision integer default null,
  p_location_id text default null,p_opening_quantity numeric default 0) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id text; v_name text; v_category text; v_unit text; v_price numeric; v_threshold numeric;
  v_active boolean; v_opening numeric; v_location text := coalesce(p_location_id,'main'); v_old public.cleanos_products%rowtype;
begin
  perform public.cleanos_require_role(p_org_id,array['admin','supervisor']);
  -- Serialize catalogue and stock-room creation so their balance cross-product is complete.
  perform 1 from public.cleanos_organizations where id=p_org_id for update;
  v_id := public.cleanos_checked_text(p_product->>'id','Product ID',120);
  v_name := public.cleanos_checked_text(p_product->>'name','Product name',160);
  v_category := public.cleanos_checked_text(p_product->>'category','Product category',80);
  v_unit := public.cleanos_checked_text(p_product->>'unit','Product unit',40);
  if (v_name || v_category || v_unit) ~ E'[\n\r]' then raise exception using errcode='22023', message='Product names, categories and units must each use one line.'; end if;
  v_price := public.cleanos_checked_amount((p_product->>'unitPrice')::numeric,'Unit value',false,2);
  v_active := coalesce((p_product->>'active')::boolean,true);
  v_opening := public.cleanos_checked_amount(p_opening_quantity,'Opening quantity');
  select * into v_old from public.cleanos_products p where p.org_id=p_org_id and p.id=v_id for update;
  if found then
    if p_expected_revision is null or p_expected_revision<>v_old.revision then
      raise exception using errcode='40001', message='This product changed on another phone. Refresh and try again.';
    end if;
    if v_opening<>0 then raise exception using errcode='22023', message='Opening stock is only allowed when creating a product.'; end if;
    if v_unit<>v_old.unit and exists(select 1 from public.cleanos_stock_movements s where s.org_id=p_org_id and s.product_id=v_id) then
      raise exception using errcode='22023', message='A product unit cannot change after stock movements have been recorded.';
    end if;
    if not v_active and exists(select 1 from public.cleanos_balances b where b.org_id=p_org_id and b.product_id=v_id and b.quantity>0) then
      raise exception using errcode='22023', message='Issue or reconcile remaining stock before archiving this product.';
    end if;
    update public.cleanos_products set name=v_name,category=v_category,unit=v_unit,unit_price=v_price,active=v_active,
      revision=revision+1,updated_at=now() where org_id=p_org_id and id=v_id;
  else
    if p_expected_revision is not null then raise exception using errcode='40001', message='This product no longer exists.'; end if;
    v_threshold := public.cleanos_checked_amount(coalesce((p_product->>'threshold')::numeric,0),'Reorder threshold');
    if not v_active and v_opening>0 then raise exception using errcode='22023', message='Opening stock requires an active product.'; end if;
    if not exists(select 1 from public.cleanos_locations l where l.org_id=p_org_id and l.id=v_location and l.active) then
      raise exception using errcode='22023', message='Choose an active stock room in this workspace.';
    end if;
    insert into public.cleanos_products(org_id,id,name,category,unit,unit_price,active)
      values(p_org_id,v_id,v_name,v_category,v_unit,v_price,v_active);
    insert into public.cleanos_balances(org_id,product_id,location_id,threshold)
      select p_org_id,v_id,l.id,case when l.id=v_location then v_threshold else 0 end from public.cleanos_locations l where l.org_id=p_org_id;
    if v_opening>0 then
      perform public.cleanos_record_stock(p_org_id,v_location,v_id,'in',v_opening,'Opening balance','opening:' || v_id || ':' || v_location);
    end if;
  end if;
end;
$$;

create function public.cleanos_create_invite(p_org_id uuid,p_email text,p_role text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_email text; v_code text;
begin
  perform public.cleanos_require_role(p_org_id,array['admin']);
  perform 1 from public.cleanos_organizations where id=p_org_id for update;
  perform public.cleanos_require_role(p_org_id,array['admin']);
  v_email := lower(public.cleanos_checked_text(p_email,'Email address',254));
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or p_role is null or p_role not in ('admin','supervisor','staff') then
    raise exception using errcode='22023', message='Provide a valid email address and workspace role.';
  end if;
  if exists(select 1 from public.cleanos_members m join auth.users u on u.id=m.user_id
      where m.org_id=p_org_id and m.active and lower(u.email)=v_email) then
    raise exception using errcode='22023', message='This person is already a member. Manage their role from the team list.';
  end if;
  -- Three independent random UUIDs provide more than 256 random bits. Only a
  -- SHA-256 digest is stored; the raw, single-use code is returned once.
  v_code := replace(pg_catalog.gen_random_uuid()::text || pg_catalog.gen_random_uuid()::text || pg_catalog.gen_random_uuid()::text,'-','');
  update public.cleanos_invites set expires_at=least(expires_at,now())
    where org_id=p_org_id and email=v_email and accepted_at is null;
  insert into public.cleanos_invites(org_id,email,role,token_hash,expires_at,created_by)
    values(p_org_id,v_email,p_role,encode(pg_catalog.sha256(convert_to(v_code,'UTF8')),'hex'),now()+interval '7 days',auth.uid());
  return v_code;
end;
$$;

create function public.cleanos_join_workspace(p_code text,p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public.cleanos_actor(); v_email text; v_name text; v_hash text; v_org uuid;
  v_invite public.cleanos_invites%rowtype;
begin
  v_name := public.cleanos_checked_text(p_display_name,'Your name',120);
  if p_code is null or lower(btrim(p_code)) !~ '^[0-9a-f]{96}$' then
    raise exception using errcode='22023', message='Enter the complete invitation code from your admin.';
  end if;
  v_hash := encode(pg_catalog.sha256(convert_to(lower(btrim(p_code)),'UTF8')),'hex');
  select i.org_id into v_org from public.cleanos_invites i where i.token_hash=v_hash;
  if not found then raise exception using errcode='22023', message='This invitation is invalid or expired.'; end if;
  -- Membership changes and invitations lock the organisation first, consistently.
  perform 1 from public.cleanos_organizations where id=v_org for update;
  select * into v_invite from public.cleanos_invites i where i.token_hash=v_hash for update;
  select lower(u.email) into v_email from auth.users u where u.id=v_user;
  if v_email is distinct from v_invite.email then
    raise exception using errcode='42501', message='Sign in with the verified email address this invitation was sent to.';
  end if;
  if v_invite.accepted_at is not null then
    if v_invite.accepted_by=v_user and exists(select 1 from public.cleanos_members m where m.org_id=v_org and m.user_id=v_user and m.active) then
      return v_org;
    end if;
    raise exception using errcode='22023', message='This invitation has already been used.';
  end if;
  if v_invite.expires_at<=now() or not exists(select 1 from public.cleanos_members m
      where m.org_id=v_org and m.user_id=v_invite.created_by and m.active and m.role='admin') then
    raise exception using errcode='22023', message='This invitation is invalid or expired. Ask an admin for a new code.';
  end if;
  -- Joining must never remove the last active admin, including an invite created
  -- before the recipient became an admin through a different administrator.
  if v_invite.role<>'admin' and exists(select 1 from public.cleanos_members m
      where m.org_id=v_org and m.user_id=v_user and m.active and m.role='admin')
    and not exists(select 1 from public.cleanos_members m where m.org_id=v_org and m.user_id<>v_user and m.active and m.role='admin') then
    raise exception using errcode='22023', message='A workspace must keep at least one active admin.';
  end if;
  insert into public.cleanos_members(org_id,user_id,name,role,active) values(v_org,v_user,v_name,v_invite.role,true)
    on conflict(org_id,user_id) do update set name=excluded.name,role=excluded.role,active=true,
      revision=public.cleanos_members.revision+1,updated_at=now();
  update public.cleanos_invites set accepted_by=v_user,accepted_at=now() where id=v_invite.id;
  return v_org;
end;
$$;

create function public.cleanos_list_invites(p_org_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  perform public.cleanos_require_role(p_org_id,array['admin']);
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,
      'expiresAt',i.expires_at,'usedAt',i.accepted_at) order by i.created_at desc),'[]'::jsonb)
    into v_result from public.cleanos_invites i where i.org_id=p_org_id;
  return v_result;
end;
$$;

create function public.cleanos_revoke_invite(p_org_id uuid,p_invite_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.cleanos_require_role(p_org_id,array['admin']);
  perform 1 from public.cleanos_organizations where id=p_org_id for update;
  perform public.cleanos_require_role(p_org_id,array['admin']);
  update public.cleanos_invites set expires_at=least(expires_at,now())
    where org_id=p_org_id and id=p_invite_id and accepted_at is null;
  if not found then raise exception using errcode='22023', message='This pending invitation is unavailable.'; end if;
end;
$$;

create function public.cleanos_update_member(p_org_id uuid,p_user_id uuid,p_name text,p_role text,p_active boolean,p_expected_revision integer default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old public.cleanos_members%rowtype; v_name text;
begin
  perform public.cleanos_require_role(p_org_id,array['admin']);
  perform 1 from public.cleanos_organizations where id=p_org_id for update;
  perform public.cleanos_require_role(p_org_id,array['admin']);
  v_name := public.cleanos_checked_text(p_name,'Member name',120);
  if p_role is null or p_role not in ('admin','supervisor','staff') or p_active is null then
    raise exception using errcode='22023', message='Provide a valid member role and active status.';
  end if;
  select * into v_old from public.cleanos_members m where m.org_id=p_org_id and m.user_id=p_user_id for update;
  if not found then raise exception using errcode='22023', message='This workspace member is unavailable.'; end if;
  if v_old.name=v_name and v_old.role=p_role and v_old.active=p_active then return; end if;
  if p_expected_revision is null or p_expected_revision<>v_old.revision then
    raise exception using errcode='40001', message='This member changed on another phone. Refresh and try again.';
  end if;
  if v_old.active and v_old.role='admin' and (not p_active or p_role<>'admin')
    and not exists(select 1 from public.cleanos_members m where m.org_id=p_org_id and m.user_id<>p_user_id and m.active and m.role='admin') then
    raise exception using errcode='22023', message='A workspace must keep at least one active admin.';
  end if;
  update public.cleanos_members set name=v_name,role=p_role,active=p_active,revision=revision+1,updated_at=now()
    where org_id=p_org_id and user_id=p_user_id;
end;
$$;

create function public.cleanos_workspace(p_org_id uuid,p_location_id text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_role text; v_org public.cleanos_organizations%rowtype; v_location text := coalesce(p_location_id,'main');
  v_facilities jsonb; v_staff jsonb; v_tasks jsonb; v_inventory jsonb; v_movements jsonb; v_locations jsonb;
begin
  v_role := public.cleanos_require_role(p_org_id,array['admin','supervisor','staff']);
  select * into v_org from public.cleanos_organizations where id=p_org_id;
  if not exists(select 1 from public.cleanos_locations l where l.org_id=p_org_id and l.id=v_location and l.active) then
    raise exception using errcode='22023', message='This stock room is unavailable. Select an active stock room.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'facilityId',l.facility_id,'active',l.active) order by l.name),'[]'::jsonb)
    into v_locations from public.cleanos_locations l where l.org_id=p_org_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'type',f.type,'address',f.address,
      'active',f.active,'revision',f.revision,'areas',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'active',a.active) order by a.name)
        from public.cleanos_areas a where a.org_id=p_org_id and a.facility_id=f.id),'[]'::jsonb)) order by f.name),'[]'::jsonb)
    into v_facilities from public.cleanos_facilities f where f.org_id=p_org_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',m.name,'role',m.role,'active',m.active,'revision',m.revision) order by m.name),'[]'::jsonb)
    into v_staff from public.cleanos_members m where m.org_id=p_org_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'facilityId',t.facility_id,'areaId',t.area_id,
      'assigneeId',t.assignee_id,'dueDate',t.due_date,'priority',t.priority,'status',t.status,'checklist',t.checklist,
      'notes',t.notes,'revision',t.revision) order by t.due_date,t.created_at,t.id),'[]'::jsonb)
    into v_tasks from public.cleanos_tasks t where t.org_id=p_org_id and (v_role in ('admin','supervisor') or t.assignee_id=auth.uid());
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'category',p.category,'unit',p.unit,
      'quantity',b.quantity,'threshold',b.threshold,'unitPrice',p.unit_price,'active',p.active,
      'revision',p.revision,'balanceRevision',b.revision) order by p.name),'[]'::jsonb)
    into v_inventory from public.cleanos_products p join public.cleanos_balances b on b.org_id=p.org_id and b.product_id=p.id
    where p.org_id=p_org_id and b.location_id=v_location;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'itemId',s.product_id,'locationId',s.location_id,
      'type',s.direction,'quantity',s.quantity,'note',s.note,'createdAt',s.created_at) order by s.created_at desc,s.id desc),'[]'::jsonb)
    into v_movements from (select * from public.cleanos_stock_movements m where m.org_id=p_org_id and m.location_id=v_location
      order by m.created_at desc,m.id desc limit 200) s;
  return jsonb_build_object('workspace',jsonb_build_object('id',v_org.id,'name',v_org.name,'role',v_role,
      'memberId',auth.uid(),'inventoryMode',v_org.inventory_mode),'locations',v_locations,'locationId',v_location,
    'state',jsonb_build_object('version',1,'onboardingDone',true,'session',jsonb_build_object('role',v_role,'staffId',auth.uid()),
      'facilities',v_facilities,'staff',v_staff,'tasks',v_tasks,'inventory',v_inventory,'movements',v_movements));
end;
$$;

create function public.cleanos_immutable_ledger() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode='42501', message='Stock movements are append-only. Record a correcting movement instead.';
end;
$$;
create trigger cleanos_stock_movements_immutable before update or delete on public.cleanos_stock_movements
  for each row execute function public.cleanos_immutable_ledger();

-- RLS remains a separate protection even though all mutations use RPCs.
alter table public.cleanos_organizations enable row level security;
alter table public.cleanos_members enable row level security;
alter table public.cleanos_facilities enable row level security;
alter table public.cleanos_areas enable row level security;
alter table public.cleanos_locations enable row level security;
alter table public.cleanos_products enable row level security;
alter table public.cleanos_balances enable row level security;
alter table public.cleanos_tasks enable row level security;
alter table public.cleanos_stock_movements enable row level security;
alter table public.cleanos_invites enable row level security;

create policy cleanos_organizations_read on public.cleanos_organizations for select to authenticated
  using (public.cleanos_role(id) is not null);
create policy cleanos_members_read on public.cleanos_members for select to authenticated
  using (public.cleanos_role(org_id) is not null);
create policy cleanos_facilities_read on public.cleanos_facilities for select to authenticated
  using (public.cleanos_role(org_id) is not null);
create policy cleanos_areas_read on public.cleanos_areas for select to authenticated
  using (public.cleanos_role(org_id) is not null);
create policy cleanos_locations_read on public.cleanos_locations for select to authenticated
  using (public.cleanos_role(org_id) is not null);
create policy cleanos_products_read on public.cleanos_products for select to authenticated
  using (public.cleanos_role(org_id) is not null);
create policy cleanos_balances_read on public.cleanos_balances for select to authenticated
  using (public.cleanos_role(org_id) is not null);
create policy cleanos_tasks_read on public.cleanos_tasks for select to authenticated
  using (public.cleanos_role(org_id) in ('admin','supervisor')
    or (public.cleanos_role(org_id)='staff' and assignee_id=auth.uid()));
create policy cleanos_stock_read on public.cleanos_stock_movements for select to authenticated
  using (public.cleanos_role(org_id) is not null);
create policy cleanos_invites_read on public.cleanos_invites for select to authenticated
  using (public.cleanos_role(org_id)='admin');

do $$
declare v_table text; v_function record;
begin
  foreach v_table in array array['cleanos_organizations','cleanos_members','cleanos_facilities','cleanos_areas',
      'cleanos_locations','cleanos_products','cleanos_balances','cleanos_tasks','cleanos_stock_movements','cleanos_invites'] loop
    execute format('revoke all on table public.%I from public, anon, authenticated',v_table);
    execute format('grant select on table public.%I to authenticated',v_table);
  end loop;
  -- PostgreSQL grants EXECUTE to PUBLIC by default: close every new entry point.
  for v_function in select p.oid::regprocedure as signature from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cleanos\_%' escape '\'
  loop
    execute format('revoke all on function %s from public, anon, authenticated',v_function.signature);
  end loop;
end;
$$;

grant execute on function public.cleanos_schema_version() to anon,authenticated;
grant execute on function public.cleanos_role(uuid) to authenticated;
grant execute on function public.cleanos_my_workspaces() to authenticated;
grant execute on function public.cleanos_create_workspace(text,text,text) to authenticated;
grant execute on function public.cleanos_join_workspace(text,text) to authenticated;
grant execute on function public.cleanos_workspace(uuid,text) to authenticated;
grant execute on function public.cleanos_save_task(uuid,jsonb,integer) to authenticated;
grant execute on function public.cleanos_set_task_status(uuid,text,text,integer) to authenticated;
grant execute on function public.cleanos_set_checklist_done(uuid,text,text,boolean,integer) to authenticated;
grant execute on function public.cleanos_record_stock(uuid,text,text,text,numeric,text,text) to authenticated;
grant execute on function public.cleanos_set_threshold(uuid,text,text,numeric,integer) to authenticated;
grant execute on function public.cleanos_save_facility(uuid,jsonb,integer,boolean) to authenticated;
grant execute on function public.cleanos_save_product(uuid,jsonb,integer,text,numeric) to authenticated;
grant execute on function public.cleanos_create_location(uuid,text,text) to authenticated;
grant execute on function public.cleanos_create_invite(uuid,text,text) to authenticated;
grant execute on function public.cleanos_list_invites(uuid) to authenticated;
grant execute on function public.cleanos_revoke_invite(uuid,uuid) to authenticated;
grant execute on function public.cleanos_update_member(uuid,uuid,text,text,boolean,integer) to authenticated;

notify pgrst, 'reload schema';
commit;
