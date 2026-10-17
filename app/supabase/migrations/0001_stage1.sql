-- Spoilt Brat: stage 1
-- Staff logins and permissions, business settings, technicians, services and
-- products, the client database, and the activity log.
--
-- Run once in Supabase: SQL Editor -> New query -> paste this file -> Run.
-- Every table has row-level security: nobody can read or change anything
-- without being an active staff member with the right permission.

-- ---------------------------------------------------------------------------
-- Staff (one row per login; id is the Supabase auth user)
-- ---------------------------------------------------------------------------
create table public.staff (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text,
  role        text not null default 'cashier' check (role in ('owner','manager','cashier')),
  perms       text[] not null default '{}',
  active      boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Helpers used by the security rules. "security definer" lets them read
-- the staff table without tripping its own rules.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where id = auth.uid() and active);
$$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from staff where id = auth.uid() and active;
$$;

-- Owners can do everything; everyone else needs the permission in their list.
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff
    where id = auth.uid() and active and (role = 'owner' or p = any(perms))
  );
$$;

-- The very first login becomes the active owner. Everyone added after that
-- starts switched off until the owner turns them on in the app (Staff page).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  select not exists (select 1 from staff) into first_user;
  insert into staff (id, name, email, role, active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    new.email,
    case when first_user then 'owner' else 'cashier' end,
    first_user
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Never leave the business without an active owner.
create or replace function public.keep_an_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from staff where role = 'owner' and active
      and id <> coalesce(old.id, '00000000-0000-0000-0000-000000000000')
    union all
    select 1 where tg_op = 'UPDATE' and new.role = 'owner' and new.active
  ) then
    raise exception 'There must always be at least one active owner.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger staff_keep_owner
  before update or delete on public.staff
  for each row execute function public.keep_an_owner();

alter table public.staff enable row level security;
create policy "staff: team can see the team" on public.staff
  for select using (public.is_staff() or id = auth.uid());
create policy "staff: settings permission edits logins" on public.staff
  for update using (public.has_perm('settings')) with check (public.has_perm('settings'));
create policy "staff: settings permission removes logins" on public.staff
  for delete using (public.has_perm('settings') and id <> auth.uid());

-- ---------------------------------------------------------------------------
-- Business settings (a single row)
-- ---------------------------------------------------------------------------
create table public.settings (
  id              int primary key default 1 check (id = 1),
  business_name   text not null default 'Spoilt Brat',
  address         text not null default 'Bryanpark Shopping Centre, Bryanston',
  phone           text not null default '',
  email           text not null default '',
  vat_registered  boolean not null default false,
  vat_no          text not null default '',
  receipt_footer  text not null default 'Thank you for visiting. See you soon!',
  voucher_months  int not null default 36 check (voucher_months >= 36),
  opening_hours   jsonb not null default '[
    {"open":"08:00","close":"19:00","closed":false},{"open":"08:00","close":"19:00","closed":false},
    {"open":"08:00","close":"19:00","closed":false},{"open":"08:00","close":"19:00","closed":false},
    {"open":"08:00","close":"19:00","closed":false},{"open":"08:00","close":"19:00","closed":false},
    {"open":"08:00","close":"19:00","closed":false}]'::jsonb,
  updated_at      timestamptz not null default now()
);
insert into public.settings (id) values (1);

alter table public.settings enable row level security;
create policy "settings: staff read" on public.settings for select using (public.is_staff());
create policy "settings: settings permission edits" on public.settings
  for update using (public.has_perm('settings')) with check (public.has_perm('settings'));

-- ---------------------------------------------------------------------------
-- Technicians
-- ---------------------------------------------------------------------------
create table public.technicians (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  colour      text not null default '#C2185B',
  comm_svc    numeric(5,2) not null default 0,
  comm_prod   numeric(5,2) not null default 0,
  active      boolean not null default true,
  sort        int not null default 0,
  legacy_id   text unique,            -- id from the single-file POS, for imports
  created_at  timestamptz not null default now()
);

alter table public.technicians enable row level security;
create policy "technicians: staff read" on public.technicians for select using (public.is_staff());
create policy "technicians: settings permission writes" on public.technicians
  for all using (public.has_perm('settings')) with check (public.has_perm('settings'));

-- ---------------------------------------------------------------------------
-- Services and retail products
-- (Cost prices are readable by all staff for now; the stock screens in a
-- later stage will move them behind the "stock" permission.)
-- ---------------------------------------------------------------------------
create table public.items (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('service','product')),
  name          text not null,
  category      text not null default '',
  code          text not null default '',
  duration_min  int,
  cost          numeric(10,2) not null default 0,
  price         numeric(10,2) not null default 0,
  qty           int not null default 0,
  reorder_at    int not null default 0,
  active        boolean not null default true,
  legacy_id     text unique,
  created_at    timestamptz not null default now()
);

alter table public.items enable row level security;
create policy "items: staff read" on public.items for select using (public.is_staff());
create policy "items: stock permission writes" on public.items
  for all using (public.has_perm('stock')) with check (public.has_perm('stock'));

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
-- 082 123 4567, +27 82 123 4567 and 27821234567 all become 0821234567.
create or replace function public.norm_phone(p text) returns text
language sql immutable as $$
  select case
    when d ~ '^27[0-9]{9}$' then '0' || substr(d, 3)
    when length(d) >= 9 then d
    else null end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) x;
$$;

create table public.clients (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (length(trim(name)) > 0),
  phone              text not null default '',
  phone_norm         text generated always as (public.norm_phone(phone)) stored,
  email              text not null default '',
  birth_month        smallint check (birth_month between 1 and 12),
  birth_day          smallint check (birth_day between 1 and 31),
  preferred_tech_id  uuid references public.technicians(id) on delete set null,
  allergies          text not null default '',   -- health information (POPIA special personal information)
  notes              text not null default '',
  marketing_consent  boolean not null default false,
  consent_at         timestamptz,
  consent_source     text check (consent_source in ('till','client form','online','import')),
  legacy_id          text unique,
  created_at         timestamptz not null default now(),
  created_by         uuid references public.staff(id) on delete set null,
  updated_at         timestamptz not null default now(),
  check ((birth_month is null) = (birth_day is null))
);
create index clients_name_idx  on public.clients (lower(name));
create index clients_phone_idx on public.clients (phone_norm);
create index clients_email_idx on public.clients (lower(email));

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

alter table public.clients enable row level security;
create policy "clients: clients permission reads" on public.clients
  for select using (public.has_perm('clients'));
create policy "clients: clients permission adds" on public.clients
  for insert with check (public.has_perm('clients'));
create policy "clients: clients permission edits" on public.clients
  for update using (public.has_perm('clients')) with check (public.has_perm('clients'));
create policy "clients: owner or manager deletes" on public.clients
  for delete using (public.my_role() in ('owner','manager'));

-- ---------------------------------------------------------------------------
-- Activity log (who did what). Staff can add entries; nobody can change them.
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  staff_id    uuid default auth.uid() references public.staff(id) on delete set null,
  staff_name  text not null default '',
  action      text not null,
  detail      text not null default ''
);
create index activity_log_at_idx on public.activity_log (at desc);

alter table public.activity_log enable row level security;
create policy "log: staff add their own entries" on public.activity_log
  for insert with check (public.is_staff() and staff_id = auth.uid());
create policy "log: reports permission reads" on public.activity_log
  for select using (public.has_perm('reports'));

-- ---------------------------------------------------------------------------
-- Access through the API: logged-in users only (the rules above still apply).
-- ---------------------------------------------------------------------------
revoke all on public.staff, public.settings, public.technicians, public.items,
  public.clients, public.activity_log from anon;
grant select, insert, update, delete on public.staff, public.settings, public.technicians,
  public.items, public.clients, public.activity_log to authenticated;
