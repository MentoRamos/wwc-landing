-- Wealth & Wellness platform — core schema.
--
-- One rule holds the whole system up: entitlements.expires_at IS NULL means
-- lifetime, expires_at > now() means "while they keep paying". The check runs
-- inside the RLS policy (see the companion policies migration), never in a cron
-- job, so a dead billing webhook can never leave access open by accident.
--
-- Emails are stored pre-normalised in email_norm (lower + trimmed) with a CHECK
-- that enforces it, instead of the citext extension: no extension search_path to
-- get wrong, and plain b-tree indexes and equality work as expected.

create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------- enumerations

create type public.product_key as enum ('protocol', 'circle', 'connect', 'face_a_face');
create type public.ent_status  as enum ('active', 'past_due', 'canceled', 'revoked');
create type public.ent_source  as enum ('manual', 'kiwify', 'import');
create type public.content_kind as enum ('pdf', 'video');

-- ---------------------------------------------------------------- shared bits

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Normalised form of an email, used everywhere a person is matched by address.
create or replace function public.norm_email(value text)
returns text
language sql
immutable
as $$
  select lower(btrim(value));
$$;

-- ---------------------------------------------------------------- people

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null check (email = public.norm_email(email)),
  full_name   text,
  avatar_url  text,
  whatsapp    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Admin lives in its own table, never as a column on profiles. With a role
-- column, the "update your own profile" policy would have to be defended
-- column by column or a user promotes themselves with one line of JS.
create table public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Someone paid with one address and signs in with another. An alias is only
-- ever created by an admin reviewing a claim: automatic linking on an
-- unverified address is an account takeover vector.
create table public.identity_aliases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null unique check (email = public.norm_email(email)),
  verified_at timestamptz,
  source      text not null default 'admin',
  created_at  timestamptz not null default now()
);

create index identity_aliases_user_idx on public.identity_aliases (user_id);

-- ---------------------------------------------------------------- access

create table public.entitlements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  email_norm  text not null check (email_norm = public.norm_email(email_norm)),
  email_raw   text not null,
  product     public.product_key not null,
  status      public.ent_status not null default 'active',
  source      public.ent_source not null,
  external_id text,
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz,                    -- NULL = lifetime
  granted_by  uuid references auth.users(id),
  note        text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row execute function public.set_updated_at();

-- One row per external subscription, so a replayed webhook upserts.
create unique index entitlements_external_key
  on public.entitlements (product, external_id)
  where external_id is not null;

-- One manual grant per person per product, so granting twice is idempotent.
create unique index entitlements_manual_key
  on public.entitlements (email_norm, product)
  where source = 'manual';

create index entitlements_email_idx   on public.entitlements (email_norm);
create index entitlements_user_idx    on public.entitlements (user_id);
create index entitlements_expires_idx on public.entitlements (expires_at);

-- "I already bought and it did not show up." Reviewed by hand.
create table public.access_claims (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  claimed_email text not null check (claimed_email = public.norm_email(claimed_email)),
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  resolved_by   uuid references auth.users(id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index access_claims_status_idx on public.access_claims (status);

-- ---------------------------------------------------------------- content

create table public.content_items (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  kind              public.content_kind not null,
  collection        text not null,
  title             text not null,
  description       text,
  storage_path      text,        -- pdf: object in the private bucket
  youtube_id        text,        -- video: unlisted id. Treat as a secret.
  duration_seconds  int,
  season            text,
  required_products public.product_key[] not null default '{}'::public.product_key[],
  published_at      timestamptz, -- NULL = draft
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint content_items_payload_matches_kind check (
    (kind = 'pdf'   and storage_path is not null and youtube_id is null) or
    (kind = 'video' and youtube_id   is not null and storage_path is null)
  )
);

create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

create index content_items_required_idx on public.content_items using gin (required_products);
create index content_items_published_idx on public.content_items (published_at);

create table public.progress (
  user_id          uuid not null references auth.users(id) on delete cascade,
  content_item_id  uuid not null references public.content_items(id) on delete cascade,
  position_seconds int not null default 0 check (position_seconds >= 0),
  completed_at     timestamptz,
  last_seen_at     timestamptz not null default now(),
  primary key (user_id, content_item_id)
);

create table public.download_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  ip_hash         text,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index download_events_user_time_idx on public.download_events (user_id, created_at desc);

-- ---------------------------------------------------------------- billing

-- Written before any effect is applied. The unique key is what stops a replayed
-- subscription_renewed from pushing expires_at forward twice.
create table public.billing_events (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,
  external_event_id text not null,
  event_type        text not null,
  payload           jsonb not null,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  result            text,
  unique (provider, external_event_id)
);

create table public.admin_audit (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references auth.users(id),
  action       text not null,
  target_email text,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index admin_audit_time_idx on public.admin_audit (created_at desc);

-- ---------------------------------------------------------------- event

create table public.event_editions (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique,
  title     text not null,
  starts_at timestamptz,
  city      text,
  venue     text,
  status    text not null default 'announced'
              check (status in ('announced', 'open', 'closed', 'done'))
);

create table public.event_rsvps (
  user_id      uuid not null references auth.users(id) on delete cascade,
  edition_id   uuid not null references public.event_editions(id) on delete cascade,
  status       text not null default 'interested'
                 check (status in ('interested', 'invited', 'confirmed', 'declined')),
  checked_in_at timestamptz,
  created_at   timestamptz not null default now(),
  primary key (user_id, edition_id)
);

-- ---------------------------------------------------------------- on sign-up

-- Creates the profile and adopts any entitlement that was granted by email
-- before this person ever signed in. Adoption is a convenience for the admin
-- screen only: active_products() already matches by email, so access works on
-- the very first render even without this.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalised text := public.norm_email(new.email);
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    normalised,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  update public.entitlements
     set user_id = new.id
   where user_id is null
     and email_norm = normalised;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
