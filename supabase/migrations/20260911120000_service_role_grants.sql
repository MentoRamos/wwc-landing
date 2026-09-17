-- Wealth & Wellness platform — the grants the server itself needs.
--
-- Fase 1 spelled out what `anon` may not do and what `authenticated` may
-- attempt, and said in its own comment that it wanted the access model to read
-- from that file alone rather than lean on the project's default privileges.
-- It then leaned on them for `service_role`, which is never mentioned there.
--
-- Locally that was invisible: a default Supabase project grants the API roles
-- on new tables automatically. The hosted project was created with
-- **"Automatically expose new tables" off** — deliberately, so that forgetting
-- a grant hides a table instead of exposing one — and there that omission is
-- total: `service_role` had no privilege on a single platform table. Every
-- server-side path would have failed with 42501: the Kiwify webhook, the
-- download record, the admin bootstrap, the Library seed.
--
-- Granting broadly here is the honest choice, not laziness. `service_role` is
-- the secret key; anything holding it is already trusted with everything, so
-- withholding a column-level grant buys no safety and only guarantees that
-- some server feature 403s mysteriously two months from now. The real defence
-- is that almost nothing is allowed to use this role — see lib/supabase/admin.ts.

grant usage on schema public to service_role;

grant all on
  public.profiles,
  public.admin_users,
  public.entitlements,
  public.identity_aliases,
  public.access_claims,
  public.content_items,
  public.progress,
  public.download_events,
  public.billing_events,
  public.admin_audit,
  public.event_editions,
  public.event_rsvps
to service_role;

-- The catalogue view, so server-side tooling can read the shelf as the server.
grant select on public.content_catalog to service_role;

-- `anon` stays shut out of everything, including anything added above by
-- accident. Repeated from Fase 1 on purpose: this file grants broadly, and the
-- line that keeps that from mattering belongs next to it.
revoke all on public.profiles, public.admin_users, public.entitlements,
              public.identity_aliases, public.access_claims, public.content_items,
              public.progress, public.download_events, public.billing_events,
              public.admin_audit, public.event_editions, public.event_rsvps
  from anon;
