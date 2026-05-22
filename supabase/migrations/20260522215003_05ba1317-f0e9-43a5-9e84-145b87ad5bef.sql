
-- Role enum + user_roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Admins can view roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Users can view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

-- Shipments
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  customer_name text,
  customer_email text,
  origin text not null,
  destination text not null,
  carrier text not null default 'Logiport Express',
  status text not null default 'Order received',
  eta timestamptz,
  weight text,
  service text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shipments enable row level security;

create policy "Public can read shipments" on public.shipments
  for select to anon, authenticated using (true);
create policy "Admins manage shipments" on public.shipments
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Shipment events
create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  label text not null,
  location text,
  event_time timestamptz not null default now(),
  sequence int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.shipment_events enable row level security;

create policy "Public can read events" on public.shipment_events
  for select to anon, authenticated using (true);
create policy "Admins manage events" on public.shipment_events
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger shipments_touch before update on public.shipments
  for each row execute function public.touch_updated_at();

create index on public.shipment_events (shipment_id, sequence);
