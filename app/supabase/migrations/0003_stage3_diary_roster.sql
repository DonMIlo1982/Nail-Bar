-- Spoilt Brat: stage 3
-- Diary (bookings) and roster (usual working days, leave, single-day changes).
--
-- Run once in Supabase: SQL Editor -> New query -> paste this file -> Run.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Roster
-- ---------------------------------------------------------------------------
-- Usual working days per technician, Sunday first (index 1 = Sunday in SQL arrays).
alter table public.technicians
  add column usual_days boolean[] not null default '{t,t,t,t,t,t,t}'
  check (array_length(usual_days, 1) = 7);

alter table public.settings add column roster_in_diary boolean not null default true;

create table public.roster_leave (
  id          uuid primary key default gen_random_uuid(),
  tech_id     uuid not null references public.technicians(id) on delete cascade,
  from_date   date not null,
  to_date     date not null,
  type        text not null check (type in ('Annual leave','Sick leave','Family responsibility','Study or training','Unpaid leave','Other time away')),
  note        text not null default '',
  by_name     text not null default '',
  created_by  uuid default auth.uid() references public.staff(id) on delete set null,
  created_at  timestamptz not null default now(),
  check (to_date >= from_date),
  -- One technician can't have two leave entries over the same days.
  exclude using gist (tech_id with =, daterange(from_date, to_date, '[]') with &&)
);

-- A change for one day only: 'on' brings someone in, 'off' gives them the day off.
create table public.roster_days (
  tech_id     uuid not null references public.technicians(id) on delete cascade,
  day         date not null,
  state       text not null check (state in ('on','off')),
  by_name     text not null default '',
  changed_at  timestamptz not null default now(),
  primary key (tech_id, day)
);

alter table public.roster_leave enable row level security;
alter table public.roster_days enable row level security;
create policy "leave: staff read" on public.roster_leave for select using (public.is_staff());
create policy "leave: roster permission writes" on public.roster_leave
  for all using (public.has_perm('roster')) with check (public.has_perm('roster'));
create policy "roster days: staff read" on public.roster_days for select using (public.is_staff());
create policy "roster days: roster permission writes" on public.roster_days
  for all using (public.has_perm('roster')) with check (public.has_perm('roster'));

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create table public.bookings (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references public.clients(id) on delete set null,
  client_name     text not null check (length(trim(client_name)) > 0),
  phone           text not null default '',
  tech_id         uuid not null references public.technicians(id),
  day             date not null,
  start_time      time not null,
  duration_min    int not null check (duration_min between 5 and 720),
  status          text not null default 'booked' check (status in ('booked','arrived','done','cancelled','no_show')),
  deposit         numeric(10,2) not null default 0 check (deposit >= 0),
  notes           text not null default '',
  reminded_at     timestamptz,
  status_by       text not null default '',
  status_at       timestamptz,
  created_by      uuid default auth.uid() references public.staff(id) on delete set null,
  created_by_name text not null default '',
  created_at      timestamptz not null default now(),
  updated_by_name text not null default '',
  updated_at      timestamptz not null default now(),
  slot            tsrange generated always as (
                    tsrange(day + start_time, day + start_time + make_interval(mins => duration_min))
                  ) stored,
  -- The database itself refuses double bookings for the same technician.
  constraint bookings_no_overlap exclude using gist (tech_id with =, slot with &&)
    where (status in ('booked','arrived','done'))
);
create index bookings_day_idx on public.bookings (day);
create index bookings_client_idx on public.bookings (client_id);

-- Services on a booking, with the name, price and length at the time it was made.
create table public.booking_items (
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  item_id       uuid references public.items(id) on delete set null,
  name          text not null,
  price         numeric(10,2) not null default 0,
  duration_min  int not null default 0,
  position      int not null default 0,
  primary key (booking_id, position)
);

create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- Cancelling or marking a no-show needs the cancelBooking permission.
create or replace function public.check_booking_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('cancelled','no_show')
     and not public.has_perm('cancelBooking') then
    raise exception 'You need permission to cancel bookings or mark no-shows. Ask a manager.';
  end if;
  return new;
end;
$$;
create trigger bookings_status_check before update on public.bookings
  for each row execute function public.check_booking_status();

alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
create policy "bookings: staff read" on public.bookings for select using (public.is_staff());
create policy "bookings: staff add" on public.bookings for insert with check (public.is_staff());
create policy "bookings: staff change" on public.bookings for update using (public.is_staff()) with check (public.is_staff());
create policy "booking items: staff read" on public.booking_items for select using (public.is_staff());
create policy "booking items: staff write" on public.booking_items for all using (public.is_staff()) with check (public.is_staff());
-- Bookings are never deleted: they are cancelled, so the history is kept.

revoke all on public.roster_leave, public.roster_days, public.bookings, public.booking_items from anon;
grant select, insert, update, delete on public.roster_leave, public.roster_days, public.booking_items to authenticated;
grant select, insert, update on public.bookings to authenticated;

-- Staff with the roster permission (who may not have settings permission) can change
-- usual working days and whether the diary follows the roster, and nothing else.
create or replace function public.set_usual_days(p_tech uuid, p_days boolean[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('roster') then raise exception 'You need the roster permission.'; end if;
  update technicians set usual_days = p_days where id = p_tech;
end;
$$;

create or replace function public.set_roster_in_diary(p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('roster') then raise exception 'You need the roster permission.'; end if;
  update settings set roster_in_diary = p_on where id = 1;
end;
$$;
