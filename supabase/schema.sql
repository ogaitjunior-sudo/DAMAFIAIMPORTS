create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id text primary key,
  auth_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text unique,
  phone text unique not null,
  cpf text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id text primary key references public.profiles(id) on delete cascade,
  name text not null,
  email text,
  phone text unique not null,
  cpf text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

do $$
declare
  constraint_name text;
begin
  update public.profiles set role = 'customer' where role = 'user';
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%role%';
  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;
  alter table public.profiles alter column role set default 'customer';
  alter table public.profiles add constraint profiles_role_check check (role in ('customer', 'admin'));

  update public.users set role = 'customer' where role = 'user';
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.users'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%role%';
  if constraint_name is not null then
    execute format('alter table public.users drop constraint %I', constraint_name);
  end if;
  alter table public.users alter column role set default 'customer';
  alter table public.users add constraint users_role_check check (role in ('customer', 'admin'));
end $$;

create table if not exists public.raffles (
  id text primary key,
  title text not null,
  description text not null,
  image_url text,
  image_urls text[] not null default '{}',
  price_per_ticket numeric(12,2) not null,
  total_numbers integer not null check (total_numbers > 0),
  sold_numbers integer not null default 0,
  status text not null default 'ativa' check (status in ('ativa', 'pausada', 'encerrada')),
  draw_date text,
  pix_key text not null,
  admin_whatsapp text not null,
  reservation_mode text not null default 'auto_24h' check (reservation_mode in ('auto_24h', 'manual_admin')),
  created_at timestamptz not null default now()
);

alter table public.raffles
  add column if not exists reservation_mode text not null default 'auto_24h';

update public.raffles
set reservation_mode = 'auto_24h'
where reservation_mode is null
   or reservation_mode not in ('auto_24h', 'manual_admin');

alter table public.raffles
  drop constraint if exists raffles_reservation_mode_check;

alter table public.raffles
  add constraint raffles_reservation_mode_check
  check (reservation_mode in ('auto_24h', 'manual_admin'));

alter table public.raffles
  drop column if exists reservation_duration_value,
  drop column if exists reservation_duration_unit;

create table if not exists public.tickets (
  id text primary key,
  code text not null unique,
  user_id text references public.profiles(id) on delete set null,
  raffle_id text not null references public.raffles(id) on delete cascade,
  participant jsonb not null,
  numbers integer[] not null default '{}',
  paid boolean not null default false,
  status text not null default 'free' check (status in ('free', 'paid')),
  order_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.orders (
  id text primary key,
  raffle_id text not null references public.raffles(id) on delete cascade,
  buyer_name text not null,
  buyer_whatsapp text not null,
  buyer_cpf text,
  selected_numbers integer[] not null default '{}',
  total_amount numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled')),
  pix_copy_paste text,
  reserved_until timestamptz,
  validation_code text,
  ticket_id text references public.tickets(id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.orders
  add column if not exists reserved_until timestamptz;

create table if not exists public.raffle_number_reservations (
  id text primary key,
  raffle_id text not null references public.raffles(id) on delete cascade,
  user_name text not null,
  whatsapp text not null,
  numbers integer[] not null default '{}',
  total numeric(12,2) not null,
  status text not null default 'reserved' check (status in ('available', 'selected', 'reserved', 'confirmed', 'cancelled', 'expired')),
  payment_proof text,
  reserved_until timestamptz,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists raffle_number_reservations_raffle_status_idx
  on public.raffle_number_reservations (raffle_id, status, reserved_until);

create index if not exists raffle_number_reservations_numbers_gin_idx
  on public.raffle_number_reservations using gin (numbers);

alter table public.raffle_number_reservations
  alter column status set default 'reserved';

alter table public.raffle_number_reservations
  alter column reserved_until drop not null;

alter table public.raffle_number_reservations
  drop constraint if exists raffle_number_reservations_status_check;

update public.raffle_number_reservations
set status = 'reserved'
where status = 'pending_payment';

update public.raffle_number_reservations
set status = 'cancelled'
where status = 'canceled';

alter table public.raffle_number_reservations
  add constraint raffle_number_reservations_status_check
  check (status in ('available', 'selected', 'reserved', 'confirmed', 'cancelled', 'expired'));

alter table public.raffle_number_reservations replica identity full;
alter table public.raffles replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'raffle_number_reservations'
     ) then
    alter publication supabase_realtime add table public.raffle_number_reservations;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'raffles'
     ) then
    alter publication supabase_realtime add table public.raffles;
  end if;
end;
$$;

create or replace function public.expire_raffle_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  update public.raffle_number_reservations
  set status = 'expired'
  where status = 'reserved'
    and reserved_until is not null
    and reserved_until <= now();

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

create or replace function public.create_raffle_number_reservation(
  p_id text,
  p_raffle_id text,
  p_user_name text,
  p_whatsapp text,
  p_numbers integer[],
  p_total numeric,
  p_payment_proof text default null
)
returns public.raffle_number_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  target_raffle public.raffles%rowtype;
  normalized_numbers integer[];
  invalid_number integer;
  reservation_deadline timestamptz;
  result public.raffle_number_reservations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('raffle-reservation:' || p_raffle_id));
  perform public.expire_raffle_reservations();

  select * into target_raffle
  from public.raffles
  where id = p_raffle_id;

  if not found or target_raffle.status <> 'ativa' then
    raise exception 'Rifa indisponível.' using errcode = 'P0001';
  end if;

  select array_agg(distinct selected_number order by selected_number)
  into normalized_numbers
  from unnest(p_numbers) as selected_numbers(selected_number);

  if normalized_numbers is null or array_length(normalized_numbers, 1) is null then
    raise exception 'Selecione pelo menos um número.' using errcode = 'P0001';
  end if;

  select selected_number
  into invalid_number
  from unnest(normalized_numbers) as selected_numbers(selected_number)
  where selected_number < 0 or selected_number >= target_raffle.total_numbers
  limit 1;

  if invalid_number is not null then
    raise exception 'Número % inválido.', lpad(invalid_number::text, 2, '0') using errcode = 'P0001';
  end if;

  reservation_deadline := case
    when target_raffle.reservation_mode = 'manual_admin' then null
    else now() + interval '24 hours'
  end;

  if exists (
    select 1
    from public.tickets
    where raffle_id = p_raffle_id
      and paid = true
      and numbers && normalized_numbers
  ) then
    raise exception 'Um ou mais números já estão vendidos.' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.raffle_number_reservations
    where raffle_id = p_raffle_id
      and numbers && normalized_numbers
      and (
        status = 'confirmed'
        or (status = 'reserved' and (reserved_until is null or reserved_until > now()))
      )
  ) then
    raise exception 'Um ou mais números já estão reservados.' using errcode = 'P0001';
  end if;

  insert into public.raffle_number_reservations (
    id,
    raffle_id,
    user_name,
    whatsapp,
    numbers,
    total,
    status,
    payment_proof,
    reserved_until
  )
  values (
    p_id,
    p_raffle_id,
    p_user_name,
    p_whatsapp,
    normalized_numbers,
    p_total,
    'reserved',
    p_payment_proof,
    reservation_deadline
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.confirm_raffle_number_reservation(p_id text)
returns public.raffle_number_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reservation public.raffle_number_reservations%rowtype;
begin
  select * into target_reservation
  from public.raffle_number_reservations
  where id = p_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('raffle-reservation:' || target_reservation.raffle_id));
  perform public.expire_raffle_reservations();

  select * into target_reservation
  from public.raffle_number_reservations
  where id = p_id
  for update;

  if target_reservation.status = 'expired' then
    raise exception 'Esta reserva expirou.' using errcode = 'P0001';
  end if;

  if target_reservation.status <> 'reserved' then
    raise exception 'Esta reserva não está pendente.' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.tickets
    where raffle_id = target_reservation.raffle_id
      and paid = true
      and numbers && target_reservation.numbers
  ) then
    raise exception 'Um ou mais números já estão vendidos.' using errcode = 'P0001';
  end if;

  update public.raffle_number_reservations
  set status = 'confirmed',
      confirmed_at = now()
  where id = p_id
  returning * into target_reservation;

  return target_reservation;
end;
$$;

create or replace function public.cancel_raffle_number_reservation(p_id text)
returns public.raffle_number_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reservation public.raffle_number_reservations%rowtype;
begin
  select * into target_reservation
  from public.raffle_number_reservations
  where id = p_id
  for update;

  if not found then
    raise exception 'Reserva não encontrada.' using errcode = 'P0001';
  end if;

  if target_reservation.status = 'confirmed' then
    raise exception 'Reserva já confirmada.' using errcode = 'P0001';
  end if;

  update public.raffle_number_reservations
  set status = 'cancelled'
  where id = p_id
    and status in ('reserved', 'expired', 'cancelled')
  returning * into target_reservation;

  return target_reservation;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tickets'::regclass
      and conname = 'tickets_order_id_fkey'
  ) then
    alter table public.tickets
      add constraint tickets_order_id_fkey
      foreign key (order_id) references public.orders(id) on delete cascade
      deferrable initially deferred;
  end if;
end $$;

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  price numeric(12,2) not null,
  stock integer not null default 0,
  description text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.winners (
  id text primary key,
  title text not null,
  description text not null,
  winner_name text not null,
  city text not null,
  date text not null,
  image_url text not null,
  video_url text,
  status text not null default 'Entrega confirmada',
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_id text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.publicacoes (like public.posts including all);

create table if not exists public.campeonatos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.times (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid references public.campeonatos(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.jogadores (
  id uuid primary key default gen_random_uuid(),
  time_id uuid references public.times(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.partidas (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid references public.campeonatos(id) on delete cascade,
  home_team_id uuid references public.times(id) on delete set null,
  away_team_id uuid references public.times(id) on delete set null,
  starts_at timestamptz,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table if not exists public.resultados (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid references public.partidas(id) on delete cascade,
  home_score integer not null default 0,
  away_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ranking (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid references public.campeonatos(id) on delete cascade,
  time_id uuid references public.times(id) on delete cascade,
  points integer not null default 0,
  position integer,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.raffles enable row level security;
alter table public.tickets enable row level security;
alter table public.orders enable row level security;
alter table public.raffle_number_reservations enable row level security;
alter table public.products enable row level security;
alter table public.winners enable row level security;
alter table public.posts enable row level security;
alter table public.publicacoes enable row level security;
alter table public.campeonatos enable row level security;
alter table public.times enable row level security;
alter table public.jogadores enable row level security;
alter table public.partidas enable row level security;
alter table public.resultados enable row level security;
alter table public.ranking enable row level security;

drop policy if exists "profiles own read" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "profiles admin insert" on public.profiles;
drop policy if exists "profiles self insert" on public.profiles;
drop policy if exists "profiles admin delete" on public.profiles;
drop policy if exists "users own read" on public.users;
drop policy if exists "users own insert" on public.users;
drop policy if exists "users own update" on public.users;
drop policy if exists "users admin delete" on public.users;
drop policy if exists "sessions own read" on public.sessions;
drop policy if exists "sessions own insert" on public.sessions;
drop policy if exists "sessions own update" on public.sessions;
drop policy if exists "sessions own delete" on public.sessions;
drop policy if exists "public raffles read" on public.raffles;
drop policy if exists "admin raffles write" on public.raffles;
drop policy if exists "public products read" on public.products;
drop policy if exists "admin products write" on public.products;
drop policy if exists "public winners read" on public.winners;
drop policy if exists "admin winners write" on public.winners;
drop policy if exists "orders own read" on public.orders;
drop policy if exists "orders public insert" on public.orders;
drop policy if exists "orders own update" on public.orders;
drop policy if exists "orders admin delete" on public.orders;
drop policy if exists "reservations public read active" on public.raffle_number_reservations;
drop policy if exists "reservations own read" on public.raffle_number_reservations;
drop policy if exists "reservations public insert" on public.raffle_number_reservations;
drop policy if exists "reservations own update" on public.raffle_number_reservations;
drop policy if exists "reservations admin update" on public.raffle_number_reservations;
drop policy if exists "reservations admin delete" on public.raffle_number_reservations;
drop policy if exists "tickets own read" on public.tickets;
drop policy if exists "tickets admin insert" on public.tickets;
drop policy if exists "tickets admin update" on public.tickets;
drop policy if exists "tickets admin delete" on public.tickets;
drop policy if exists "published posts read" on public.posts;
drop policy if exists "admin posts write" on public.posts;
drop policy if exists "published publicacoes read" on public.publicacoes;
drop policy if exists "admin publicacoes write" on public.publicacoes;
drop policy if exists "public campeonatos read" on public.campeonatos;
drop policy if exists "admin campeonatos write" on public.campeonatos;
drop policy if exists "public times read" on public.times;
drop policy if exists "admin times write" on public.times;
drop policy if exists "public jogadores read" on public.jogadores;
drop policy if exists "admin jogadores write" on public.jogadores;
drop policy if exists "public partidas read" on public.partidas;
drop policy if exists "admin partidas write" on public.partidas;
drop policy if exists "public resultados read" on public.resultados;
drop policy if exists "admin resultados write" on public.resultados;
drop policy if exists "public ranking read" on public.ranking;
drop policy if exists "admin ranking write" on public.ranking;

create policy "profiles own read" on public.profiles
  for select using (auth_user_id = auth.uid() or public.is_admin());
create policy "profiles own update" on public.profiles
  for update using (auth_user_id = auth.uid() or public.is_admin())
  with check ((auth_user_id = auth.uid() and role = 'customer') or public.is_admin());
create policy "profiles self insert" on public.profiles
  for insert with check ((auth_user_id = auth.uid() and role = 'customer') or public.is_admin());
create policy "profiles admin delete" on public.profiles
  for delete using (public.is_admin());

create policy "users own read" on public.users
  for select using (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = users.id
        and p.auth_user_id = auth.uid()
    )
  );
create policy "users own insert" on public.users
  for insert with check (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = users.id
        and p.auth_user_id = auth.uid()
    )
  );
create policy "users own update" on public.users
  for update using (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = users.id
        and p.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = users.id
        and p.auth_user_id = auth.uid()
    )
  );
create policy "users admin delete" on public.users
  for delete using (public.is_admin());

create policy "sessions own read" on public.sessions
  for select using (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = sessions.user_id
        and p.auth_user_id = auth.uid()
    )
  );
create policy "sessions own insert" on public.sessions
  for insert with check (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = sessions.user_id
        and p.auth_user_id = auth.uid()
    )
  );
create policy "sessions own update" on public.sessions
  for update using (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = sessions.user_id
        and p.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = sessions.user_id
        and p.auth_user_id = auth.uid()
    )
  );
create policy "sessions own delete" on public.sessions
  for delete using (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.id = sessions.user_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "public raffles read" on public.raffles
  for select using (status in ('ativa', 'pausada', 'encerrada'));
create policy "admin raffles write" on public.raffles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "public products read" on public.products
  for select using (true);
create policy "admin products write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "public winners read" on public.winners
  for select using (true);
create policy "admin winners write" on public.winners
  for all using (public.is_admin()) with check (public.is_admin());

create policy "orders own read" on public.orders
  for select using (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.phone = orders.buyer_whatsapp
    )
  );
create policy "orders public insert" on public.orders
  for insert with check (true);
create policy "orders own update" on public.orders
  for update using (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.phone = orders.buyer_whatsapp
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.phone = orders.buyer_whatsapp
    )
  );
create policy "orders admin delete" on public.orders
  for delete using (public.is_admin());

create policy "reservations own read" on public.raffle_number_reservations
  for select using (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.phone = raffle_number_reservations.whatsapp
    )
  );
create policy "reservations public insert" on public.raffle_number_reservations
  for insert with check (true);
create policy "reservations own update" on public.raffle_number_reservations
  for update using (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.phone = raffle_number_reservations.whatsapp
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.phone = raffle_number_reservations.whatsapp
    )
  );
create policy "reservations admin update" on public.raffle_number_reservations
  for update using (public.is_admin()) with check (public.is_admin());
create policy "reservations admin delete" on public.raffle_number_reservations
  for delete using (public.is_admin());

create policy "tickets own read" on public.tickets
  for select using (
    public.is_admin() or exists (
      select 1 from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.id = tickets.user_id
    )
  );
create policy "tickets admin insert" on public.tickets
  for insert with check (public.is_admin());
create policy "tickets admin update" on public.tickets
  for update using (public.is_admin()) with check (public.is_admin());
create policy "tickets admin delete" on public.tickets
  for delete using (public.is_admin());

create policy "published posts read" on public.posts
  for select using (status = 'published' or public.is_admin());
create policy "admin posts write" on public.posts
  for all using (public.is_admin()) with check (public.is_admin());
create policy "published publicacoes read" on public.publicacoes
  for select using (status = 'published' or public.is_admin());
create policy "admin publicacoes write" on public.publicacoes
  for all using (public.is_admin()) with check (public.is_admin());

create policy "public campeonatos read" on public.campeonatos for select using (status = 'published' or public.is_admin());
create policy "admin campeonatos write" on public.campeonatos for all using (public.is_admin()) with check (public.is_admin());
create policy "public times read" on public.times for select using (true);
create policy "admin times write" on public.times for all using (public.is_admin()) with check (public.is_admin());
create policy "public jogadores read" on public.jogadores for select using (true);
create policy "admin jogadores write" on public.jogadores for all using (public.is_admin()) with check (public.is_admin());
create policy "public partidas read" on public.partidas for select using (true);
create policy "admin partidas write" on public.partidas for all using (public.is_admin()) with check (public.is_admin());
create policy "public resultados read" on public.resultados for select using (true);
create policy "admin resultados write" on public.resultados for all using (public.is_admin()) with check (public.is_admin());
create policy "public ranking read" on public.ranking for select using (true);
create policy "admin ranking write" on public.ranking for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('da-mafia-assets', 'da-mafia-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "public asset read" on storage.objects;
drop policy if exists "admin asset insert" on storage.objects;
drop policy if exists "admin asset update" on storage.objects;
drop policy if exists "admin asset delete" on storage.objects;

create policy "public asset read" on storage.objects
  for select using (bucket_id = 'da-mafia-assets');
create policy "admin asset insert" on storage.objects
  for insert with check (bucket_id = 'da-mafia-assets' and public.is_admin());
create policy "admin asset update" on storage.objects
  for update using (bucket_id = 'da-mafia-assets' and public.is_admin());
create policy "admin asset delete" on storage.objects
  for delete using (bucket_id = 'da-mafia-assets' and public.is_admin());
