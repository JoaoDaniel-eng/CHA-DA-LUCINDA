
create type public.app_role as enum ('admin');
create type public.guest_status as enum ('confirmed','cancelled');
create type public.message_status as enum ('pending','approved','rejected');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.administrator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, update on public.administrator_profiles to authenticated;
grant all on public.administrator_profiles to service_role;
alter table public.administrator_profiles enable row level security;
create policy "Admins read profiles" on public.administrator_profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins update own profile" on public.administrator_profiles for update to authenticated using (user_id = auth.uid());

-- Public signup is disabled; every account created by the owner in Users becomes an admin.
create or replace function public.handle_new_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  insert into public.administrator_profiles(user_id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
  for each row execute function public.handle_new_admin();

create table public.event_settings (
  id smallint primary key default 1 check (id = 1),
  baby_name text not null default 'Lucinda',
  mom_message text not null,
  event_at timestamptz not null,
  address text not null,
  maps_query text,
  ultrasound_path text,
  success_message text not null,
  hero_subtitle text not null default 'Uma pequena flor está chegando à nossa floresta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.event_settings to anon, authenticated;
grant update on public.event_settings to authenticated;
grant all on public.event_settings to service_role;
alter table public.event_settings enable row level security;
create policy "Anyone reads settings" on public.event_settings for select to anon, authenticated using (true);
create policy "Admins update settings" on public.event_settings for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_settings_touch before update on public.event_settings for each row execute function public.touch_updated_at();

insert into public.event_settings (id, mom_message, event_at, address, success_message) values (1,
'Minha pequena Lucinda,

Ainda não conheço o seu rostinho por inteiro, não segurei suas mãozinhas e ainda não ouvi sua voz, mas você já ocupa o lugar mais bonito do meu coração.

Cada dia de espera me aproxima do sonho de ter você nos meus braços. Você chegou trazendo novos sonhos, enchendo minha vida de amor e me mostrando que a felicidade pode começar muito antes do primeiro abraço.

Estou contando os dias para conhecer você, sentir seu cheirinho e descobrir o mundo através dos seus olhinhos.

Enquanto esse momento não chega, quero compartilhar a alegria da sua chegada com pessoas especiais que farão parte da nossa história.

Por isso, preparei um dia cheio de carinho para celebrar a sua vida, minha pequena flor.

Que nossa floresta seja cheia de amor, que nunca faltem abraços em sua caminhada e que você sempre saiba o quanto foi amada antes mesmo de nascer.

Com todo o amor do mundo,
Mamãe.',
'2027-02-20 11:00:00-03',
'Rua Aureliano Leal, 69 - Jardim Primavera, Duque de Caxias, RJ',
'Que alegria saber que você estará com a gente nesse momento tão especial!

Sua presença tornará o chá de bebê da nossa pequena Lucinda ainda mais bonito e inesquecível.

Já estamos preparando tudo com muito carinho para celebrar esse dia com você.

Até lá! 🩷🌸');

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 3 and 120),
  phone text not null check (phone ~ '^55[1-9][0-9]{9,10}$'),
  gift text not null check (char_length(btrim(gift)) between 2 and 500),
  status public.guest_status not null default 'confirmed',
  edit_token_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index guests_status_idx on public.guests(status);
create index guests_phone_idx on public.guests(phone);
create index guests_created_idx on public.guests(created_at desc);
grant select, update on public.guests to authenticated;
grant all on public.guests to service_role;
alter table public.guests enable row level security;
create policy "Admins read guests" on public.guests for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins update guests" on public.guests for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger trg_guests_touch before update on public.guests for each row execute function public.touch_updated_at();

create table public.guestbook_messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (char_length(sender_name) between 2 and 80),
  content text not null check (char_length(content) between 2 and 600),
  status public.message_status not null default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);
create index gb_status_idx on public.guestbook_messages(status, created_at desc);
grant select (id, sender_name, content, created_at, status) on public.guestbook_messages to anon;
grant select, update, delete on public.guestbook_messages to authenticated;
grant all on public.guestbook_messages to service_role;
alter table public.guestbook_messages enable row level security;
create policy "Public reads approved" on public.guestbook_messages for select to anon, authenticated using (status = 'approved' or public.has_role(auth.uid(),'admin'));
create policy "Admins update messages" on public.guestbook_messages for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins delete messages" on public.guestbook_messages for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (key, window_start)
);
grant all on public.rate_limits to service_role;
alter table public.rate_limits enable row level security;

create or replace function public.hit_rate_limit(_key text, _max int, _window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare ws timestamptz := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);
declare n int;
begin
  insert into public.rate_limits(key, window_start) values (_key, ws)
    on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
    returning hits into n;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return n <= _max;
end $$;
revoke execute on function public.hit_rate_limit(text,int,int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text,int,int) to service_role;

-- storage policies for ultrasound bucket
create policy "Public read ultrasound" on storage.objects for select using (bucket_id = 'ultrasound');
create policy "Admins upload ultrasound" on storage.objects for insert to authenticated with check (bucket_id = 'ultrasound' and public.has_role(auth.uid(),'admin'));
create policy "Admins update ultrasound" on storage.objects for update to authenticated using (bucket_id = 'ultrasound' and public.has_role(auth.uid(),'admin'));
create policy "Admins delete ultrasound" on storage.objects for delete to authenticated using (bucket_id = 'ultrasound' and public.has_role(auth.uid(),'admin'));
