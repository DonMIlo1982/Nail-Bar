-- Spoilt Brat: stage 2
-- Stock history for retail products, and cost prices visible only to staff
-- with the "stock" permission.
--
-- Run once in Supabase: SQL Editor -> New query -> paste this file -> Run.

-- ---------------------------------------------------------------------------
-- Every change to stock on hand is recorded, so the count can always be explained.
-- ---------------------------------------------------------------------------
create table public.stock_movements (
  id          bigint generated always as identity primary key,
  item_id     uuid not null references public.items(id) on delete cascade,
  qty_change  int not null check (qty_change <> 0),
  qty_after   int not null,
  reason      text not null check (reason in ('opening','delivery','write_off','count','sale','refund')),
  note        text not null default '',
  sale_id     uuid,
  staff_id    uuid default auth.uid() references public.staff(id) on delete set null,
  staff_name  text not null default '',
  at          timestamptz not null default now()
);
create index stock_movements_item_idx on public.stock_movements (item_id, at desc);

alter table public.stock_movements enable row level security;
create policy "stock history: stock permission reads" on public.stock_movements
  for select using (public.has_perm('stock'));
-- No insert/update/delete policies: changes only go through adjust_stock() below.

-- Change stock on hand and record why, in one step.
-- p_change is added to the current count (negative for write-offs);
-- for a stock count, pass the counted number as p_set_to instead.
create or replace function public.adjust_stock(
  p_item uuid, p_change int, p_reason text, p_note text default '', p_set_to int default null
) returns int
language plpgsql security definer set search_path = public as $$
declare cur int; nxt int; who text;
begin
  if not public.has_perm('stock') then
    raise exception 'You need the stock permission to change stock.';
  end if;
  select qty into cur from items where id = p_item and kind = 'product' for update;
  if not found then raise exception 'That product was not found.'; end if;
  nxt := coalesce(p_set_to, cur + coalesce(p_change, 0));
  if nxt < 0 then raise exception 'Stock can''t go below zero (there are % in stock).', cur; end if;
  if nxt = cur then return cur; end if;
  update items set qty = nxt where id = p_item;
  select name into who from staff where id = auth.uid();
  insert into stock_movements (item_id, qty_change, qty_after, reason, note, staff_name)
  values (p_item, nxt - cur, nxt, p_reason, coalesce(p_note, ''), coalesce(who, ''));
  return nxt;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cost prices: everyone can read services and products for the till, but
-- only staff with the stock permission can read what they cost.
-- ---------------------------------------------------------------------------
revoke select on public.items from authenticated;
grant select (id, kind, name, category, code, duration_min, price, qty, reorder_at, active, legacy_id, created_at)
  on public.items to authenticated;

create or replace function public.items_with_cost() returns setof public.items
language sql stable security definer set search_path = public as $$
  select * from items where public.has_perm('stock') order by kind, name;
$$;

-- Stock on hand is changed through adjust_stock(), not by editing the number directly.
-- (A table-wide grant would cover qty too, so it is replaced by a column list.)
revoke update on public.items from authenticated;
grant update (kind, name, category, code, duration_min, cost, price, reorder_at, active, legacy_id)
  on public.items to authenticated;

revoke all on public.stock_movements from anon;
grant select on public.stock_movements to authenticated;
