-- Wealth & Wellness platform — row level security.
--
-- Design note: the query IS the authorization. Pages read with the user's own
-- client, so a person with no entitlement gets zero rows and the page turns
-- into a 404. There is no `if (hasAccess)` for anyone to forget on a new route.
-- Only the billing webhook and the signed-URL route use the service role.

-- ---------------------------------------------------------------- helpers

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- Every product this caller currently has a right to.
--
-- expires_at IS NULL is lifetime (a Protocol student, a Connect guest);
-- expires_at in the future is a live subscription. Both live in one column, so
-- there is nothing to sweep and nothing that fails open.
--
-- Matching by the JWT email, not only by user_id, is what makes an access
-- granted today already present on someone's very first sign-in months later.
create or replace function public.active_products()
returns public.product_key[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(distinct e.product), '{}'::public.product_key[])
  from public.entitlements e
  where e.status in ('active', 'past_due')
    and e.starts_at <= now()
    and (e.expires_at is null or e.expires_at > now())
    and (
      e.user_id = auth.uid()
      or e.email_norm = public.norm_email(auth.jwt() ->> 'email')
      or e.email_norm in (
        select a.email from public.identity_aliases a where a.user_id = auth.uid()
      )
    );
$$;

-- ---------------------------------------------------------------- lock down

alter table public.profiles         enable row level security;
alter table public.admin_users      enable row level security;
alter table public.entitlements     enable row level security;
alter table public.identity_aliases enable row level security;
alter table public.access_claims    enable row level security;
alter table public.content_items    enable row level security;
alter table public.progress         enable row level security;
alter table public.download_events  enable row level security;
alter table public.billing_events   enable row level security;
alter table public.admin_audit      enable row level security;
alter table public.event_editions   enable row level security;
alter table public.event_rsvps      enable row level security;

-- Deliberately NOT using FORCE ROW LEVEL SECURITY.
--
-- FORCE applies the policies to the table owner as well, which sounds like free
-- defence in depth and is in fact a trap here. is_admin() is a definer function
-- reading admin_users, whose only policy is `using (false)`: under FORCE it
-- would read zero rows and every admin check would silently return false
-- forever. handle_new_user() would likewise fail to write the profile row.
-- Application traffic never connects as the owner, so FORCE buys nothing real
-- and breaks the two functions the whole model rests on.

-- Nothing in this schema is reachable without signing in.
revoke all on public.profiles, public.admin_users, public.entitlements,
              public.identity_aliases, public.access_claims, public.content_items,
              public.progress, public.download_events, public.billing_events,
              public.admin_audit, public.event_editions, public.event_rsvps
  from anon;

-- Grants say which statements a signed-in caller may attempt at all; the
-- policies below decide which rows those statements may touch. Spelled out
-- here rather than inherited from the project's default privileges, so the
-- access model reads from this file alone.
--
-- Write grants on entitlements, content_items and the editions look generous:
-- they exist because an admin is also just an `authenticated` caller, and the
-- policies restrict those writes to is_admin(). admin_users gets nothing.
grant select                         on public.download_events  to authenticated;
grant select                         on public.billing_events   to authenticated;
grant select                         on public.admin_audit      to authenticated;
grant select, update                 on public.profiles         to authenticated;
grant select, insert, update         on public.access_claims    to authenticated;
grant select, insert, update, delete on public.entitlements     to authenticated;
grant select, insert, update, delete on public.identity_aliases to authenticated;
grant select, insert, update, delete on public.content_items    to authenticated;
grant select, insert, update, delete on public.progress         to authenticated;
grant select, insert, update, delete on public.event_editions   to authenticated;
grant select, insert, update, delete on public.event_rsvps      to authenticated;
revoke all                           on public.admin_users      from authenticated;

-- ---------------------------------------------------------------- profiles

create policy profiles_read_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------- admin_users

-- Deliberately unreadable and unwritable by everyone. Membership is only ever
-- observed through is_admin(), and only ever changed with the service role.
create policy admin_users_opaque on public.admin_users
  for all to authenticated
  using (false)
  with check (false);

-- ---------------------------------------------------------------- entitlements

create policy entitlements_read_own on public.entitlements
  for select to authenticated
  using (
    user_id = auth.uid()
    or email_norm = public.norm_email(auth.jwt() ->> 'email')
    or public.is_admin()
  );

create policy entitlements_admin_write on public.entitlements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- aliases

create policy aliases_read_own on public.identity_aliases
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy aliases_admin_write on public.identity_aliases
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- claims

create policy claims_read_own on public.access_claims
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy claims_open_own on public.access_claims
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy claims_admin_resolve on public.access_claims
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- content

-- The full row carries youtube_id and storage_path, so it is only ever visible
-- to someone who holds one of the required products.
create policy content_read_entitled on public.content_items
  for select to authenticated
  using (
    (published_at is not null and required_products && public.active_products())
    or public.is_admin()
  );

create policy content_admin_write on public.content_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The shelf, with locks: every signed-in person sees that a replay exists and
-- what it is about, without the id that would let them watch it. Deliberately
-- a definer view, so it is readable regardless of the policy above.
create view public.content_catalog
  with (security_invoker = off) as
  select id, slug, kind, collection, title, description,
         duration_seconds, season, required_products, published_at, sort_order
  from public.content_items
  where published_at is not null;

revoke all on public.content_catalog from anon;
grant select on public.content_catalog to authenticated;

-- ---------------------------------------------------------------- progress

-- Reading and writing your own progress, and only against content you may
-- actually open: otherwise progress rows become an oracle for the catalogue.
create policy progress_own on public.progress
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.content_items c
      where c.id = content_item_id
        and c.published_at is not null
        and c.required_products && public.active_products()
    )
  );

-- ---------------------------------------------------------------- downloads

create policy downloads_read_own on public.download_events
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------- billing/audit

-- Service role only. No policy for authenticated means no row is ever visible.
create policy billing_admin_read on public.billing_events
  for select to authenticated
  using (public.is_admin());

create policy audit_admin_read on public.admin_audit
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------- event

alter table public.event_editions enable row level security;

create policy editions_read_all on public.event_editions
  for select to authenticated
  using (true);

create policy editions_admin_write on public.event_editions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy rsvps_own on public.event_rsvps
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
