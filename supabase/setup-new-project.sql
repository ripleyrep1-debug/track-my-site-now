-- =====================================================================
-- Rapidexpresscargo — full schema for the NEW backend project
-- (ytowmbamajcximjjegdi). Run once in the SQL editor of that project.
-- Safe to re-run.
-- =====================================================================

-- ---------- roles -----------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create unique index if not exists one_admin_only
  on public.user_roles ((role)) where role = 'admin';

-- Compatibility table: one row per admin auth user.
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select on public.admins to authenticated;
grant all on public.admins to service_role;
alter table public.admins enable row level security;

-- ---------- shipments -------------------------------------------------
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  customer_name text,
  customer_email text,
  origin text not null,
  destination text not null,
  carrier text not null default 'Rapidexpresscargo Express',
  status text not null default 'Order received',
  eta timestamptz,
  weight text,
  service text,
  notes text,
  auto_progress boolean not null default false,
  origin_warehouse text,
  transit_days int default 5,
  ship_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shipments
  drop constraint if exists shipments_origin_warehouse_check;
alter table public.shipments
  add constraint shipments_origin_warehouse_check
  check (origin_warehouse is null or origin_warehouse in ('Greece','Poland','Germany'));

alter table public.shipments
  drop constraint if exists shipments_transit_days_check;
alter table public.shipments
  add constraint shipments_transit_days_check
  check (transit_days is null or (transit_days between 3 and 7));

grant select on public.shipments to anon, authenticated;
grant all on public.shipments to service_role;
alter table public.shipments enable row level security;

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  label text not null,
  location text,
  event_time timestamptz not null default now(),
  sequence int not null default 0,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

grant select on public.shipment_events to anon, authenticated;
grant all on public.shipment_events to service_role;
alter table public.shipment_events enable row level security;

create index if not exists shipment_events_shipment_seq_idx
  on public.shipment_events (shipment_id, sequence);

-- ---------- policies --------------------------------------------------
-- Public tracking lookups are read-only. All writes go through the
-- server (service role), so the browser never gets write access.
drop policy if exists "Public can read shipments" on public.shipments;
create policy "Public can read shipments" on public.shipments
  for select to anon, authenticated using (true);

drop policy if exists "No direct shipment changes from browser" on public.shipments;
create policy "No direct shipment changes from browser" on public.shipments
  for all to authenticated using (false) with check (false);

drop policy if exists "Public can read events" on public.shipment_events;
create policy "Public can read events" on public.shipment_events
  for select to anon, authenticated using (true);

drop policy if exists "No direct shipment event changes from browser" on public.shipment_events;
create policy "No direct shipment event changes from browser" on public.shipment_events
  for all to authenticated using (false) with check (false);

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "No direct role changes from browser" on public.user_roles;
create policy "No direct role changes from browser" on public.user_roles
  for all to authenticated using (false) with check (false);

drop policy if exists "Admins can view own admin row" on public.admins;
create policy "Admins can view own admin row" on public.admins
  for select to authenticated using (auth.uid() = id);

-- ---------- functions -------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql security definer set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists shipments_touch on public.shipments;
create trigger shipments_touch before update on public.shipments
  for each row execute function public.touch_updated_at();

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$
  select auth.uid() = _user_id
    and exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where role = 'admin'::public.app_role); $$;

create or replace function public.lookup_tracking(p_tracking_number text)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_shipment public.shipments%rowtype;
  v_events jsonb;
  v_id text;
begin
  v_id := trim(p_tracking_number);
  if v_id is null or length(v_id) < 3 or length(v_id) > 64 then
    return jsonb_build_object('error', 'Invalid tracking number');
  end if;

  select * into v_shipment from public.shipments where tracking_number = v_id;
  if not found then
    return jsonb_build_object('found', false);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'label', e.label, 'location', e.location, 'event_time', e.event_time,
    'sequence', e.sequence, 'latitude', e.latitude, 'longitude', e.longitude
  ) order by e.sequence, e.event_time), '[]'::jsonb)
  into v_events
  from public.shipment_events e where e.shipment_id = v_shipment.id;

  return jsonb_build_object(
    'found', true,
    'shipment', jsonb_build_object(
      'tracking_number', v_shipment.tracking_number,
      'customer_name', v_shipment.customer_name,
      'origin', v_shipment.origin,
      'destination', v_shipment.destination,
      'carrier', v_shipment.carrier,
      'status', v_shipment.status,
      'eta', v_shipment.eta,
      'service', v_shipment.service,
      'weight', v_shipment.weight
    ),
    'events', v_events
  );
end;
$$;

-- ---------- automatic progression ------------------------------------
create or replace function public.advance_auto_shipments()
returns integer language plpgsql security definer set search_path = public
as $function$
declare
  s record;
  inserted_count int := 0;
  base_fractions numeric[] := array[0.00, 0.05, 0.18, 0.35, 0.55, 0.72];
  base_labels    text[]    := array[
    'Order received',
    'Picked up from warehouse',
    'Left the warehouse',
    'In transit',
    'Arrived at destination port',
    'Customs clearance'
  ];
  fractions numeric[];
  labels    text[];
  i int;
  total_seconds numeric;
  ev_time timestamptz;
  warehouse_loc text;
  wh_lat numeric;
  wh_lng numeric;
  loc text;
  hold_frac numeric;
begin
  for s in
    select * from public.shipments
    where auto_progress = true and transit_days is not null and ship_started_at is not null
  loop
    total_seconds := s.transit_days::numeric * 86400;
    hold_frac := greatest(0.78, least(0.92, (s.transit_days::numeric - 1.0) / s.transit_days::numeric));
    fractions := base_fractions || array[hold_frac, greatest(hold_frac + 0.04, 0.96), 1.00];
    labels    := base_labels    || array['On hold - awaiting clearance', 'Out for delivery', 'Delivered'];

    if s.origin_warehouse = 'Greece' then
      warehouse_loc := 'Athens Warehouse, Greece'; wh_lat := 37.9838; wh_lng := 23.7275;
    elsif s.origin_warehouse = 'Poland' then
      warehouse_loc := 'Warsaw Warehouse, Poland'; wh_lat := 52.2297; wh_lng := 21.0122;
    elsif s.origin_warehouse = 'Germany' then
      warehouse_loc := 'Frankfurt Warehouse, Germany'; wh_lat := 50.1109; wh_lng := 8.6821;
    else
      warehouse_loc := coalesce(s.origin, 'Origin warehouse'); wh_lat := null; wh_lng := null;
    end if;

    for i in 1..array_length(fractions, 1) loop
      ev_time := s.ship_started_at + make_interval(secs => (fractions[i] * total_seconds)::double precision);
      if ev_time <= now() then
        if not exists (select 1 from public.shipment_events where shipment_id = s.id and sequence = i) then
          if i <= 3 then
            loc := warehouse_loc;
          elsif i >= array_length(fractions, 1) - 1 then
            loc := s.destination;
          elsif labels[i] = 'On hold - awaiting clearance' then
            loc := s.destination || ' (customs facility)';
          else
            loc := warehouse_loc || ' -> ' || s.destination;
          end if;

          insert into public.shipment_events (
            shipment_id, label, location, event_time, sequence, latitude, longitude
          ) values (
            s.id, labels[i], loc, ev_time, i,
            case when i <= 3 then wh_lat else null end,
            case when i <= 3 then wh_lng else null end
          );

          update public.shipments set status = labels[i], updated_at = now() where id = s.id;
          inserted_count := inserted_count + 1;
        end if;
      end if;
    end loop;
  end loop;
  return inserted_count;
end;
$function$;

-- Internal functions stay server-only.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.admin_exists() from public, anon, authenticated;
revoke execute on function public.advance_auto_shipments() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
-- Public tracking lookup: read-only, scoped to one tracking number, returns no
-- internal ids. Static hosting (Hostinger) calls this RPC directly.
grant execute on function public.lookup_tracking(text) to anon, authenticated;


-- ---------- 15-minute auto-progress schedule --------------------------
create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'advance-auto-shipments') then
    perform cron.unschedule('advance-auto-shipments');
  end if;
  perform cron.schedule(
    'advance-auto-shipments',
    '*/15 * * * *',
    $cron$ select public.advance_auto_shipments(); $cron$
  );
end $$;

-- ---------- make your account the admin -------------------------------
-- Sign up support@rapidexprescargoagency.com first (Authentication > Users),
-- then run:
--
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'support@rapidexprescargoagency.com'
-- on conflict do nothing;
--
-- insert into public.admins (id)
-- select id from auth.users where email = 'support@rapidexprescargoagency.com'
-- on conflict do nothing;
