-- praxis-connect: Datenbankschema (Supabase / PostgreSQL)
-- Hinweis: Es werden ausschließlich Fake-Daten verwendet.

-- ---------- Typen ----------
create type user_role as enum ('practice', 'admin');
create type appointment_status as enum ('planned', 'confirmed', 'cancelled', 'done');

-- ---------- Tabellen ----------
create table practices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  practice_id uuid references practices(id),
  role user_role not null default 'practice',
  full_name text,
  created_at timestamptz not null default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id),
  display_name text not null,
  birth_year int,
  created_at timestamptz not null default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id),
  patient_id uuid not null references patients(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'planned',
  reason text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_practice_id uuid not null references practices(id),
  recipient_practice_id uuid not null references practices(id),
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_practice_id <> recipient_practice_id)
);

create table audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  practice_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create index on appointments (practice_id, starts_at);
create index on messages (recipient_practice_id, created_at desc);
create index on audit_logs (created_at desc);

-- ---------- Hilfsfunktionen ----------
create or replace function current_practice_id() returns uuid
language sql stable security definer set search_path = public as $$
  select practice_id from profiles where id = auth.uid()
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false)
$$;

-- ---------- Row Level Security ----------
alter table practices     enable row level security;
alter table profiles      enable row level security;
alter table patients      enable row level security;
alter table appointments  enable row level security;
alter table messages      enable row level security;
alter table audit_logs    enable row level security;

create policy "eigene Praxis sehen" on practices
  for select using (id = current_practice_id() or is_admin());

create policy "eigenes Profil sehen" on profiles
  for select using (id = auth.uid() or is_admin());

create policy "Patienten der eigenen Praxis" on patients
  for all using (practice_id = current_practice_id() or is_admin())
  with check (practice_id = current_practice_id());

create policy "Termine der eigenen Praxis" on appointments
  for all using (practice_id = current_practice_id() or is_admin())
  with check (practice_id = current_practice_id());

create policy "Nachrichten lesen" on messages
  for select using (
    sender_practice_id = current_practice_id()
    or recipient_practice_id = current_practice_id()
  );

create policy "Nachrichten senden" on messages
  for insert with check (sender_practice_id = current_practice_id());

create policy "Nachrichten als gelesen markieren" on messages
  for update using (recipient_practice_id = current_practice_id());

create policy "Audit-Log nur für Admins" on audit_logs
  for select using (is_admin());

-- ---------- Audit-Trigger ----------
create or replace function log_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec record := coalesce(new, old);
begin
  insert into audit_logs (user_id, practice_id, action, entity, entity_id)
  values (auth.uid(), current_practice_id(), tg_op, tg_table_name, rec.id);
  return rec;
end;
$$;

create trigger audit_patients     after insert or update or delete on patients
  for each row execute function log_audit();
create trigger audit_appointments after insert or update or delete on appointments
  for each row execute function log_audit();
create trigger audit_messages     after insert or update or delete on messages
  for each row execute function log_audit();

-- ---------- Profil automatisch bei Registrierung anlegen ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();