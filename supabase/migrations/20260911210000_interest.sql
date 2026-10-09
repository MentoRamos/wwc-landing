-- Where a raised hand goes.
--
-- Two places on the platform ask somebody to say they want something before
-- there is anything to sell them: /circle while the Kiwify links are not
-- configured, and the event's interest form. Until now the first asked for
-- nothing at all and the second posted to a handler that rejects it. Both
-- were losing exactly the people worth the most.
--
-- The table is deliberately not writable by anon. A public INSERT policy on a
-- lead table is an open endpoint for anybody who finds the anon key in the
-- page source: they can fill it with whatever they like, and the rows look
-- identical to real ones. The route writes with the service role after the
-- payload survives `readInterest`, which is the same shape as the rest of the
-- platform — the only service-role writes are the webhook and this.

create table public.interest (
  id          uuid primary key default extensions.gen_random_uuid(),
  email_norm  text not null check (email_norm = public.norm_email(email_norm)),
  product     public.product_key not null,
  name        text,
  whatsapp    text,
  source      text not null default 'site',
  -- Kept so a second submission can update the first rather than duplicate it,
  -- and so "quando foi que essa pessoa pediu" has an answer.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per person per product. Somebody who taps the form twice because
-- nothing visibly happened the first time is one lead, not two — and the
-- second submission is the one that carries their corrected phone number.
create unique index interest_email_product on public.interest (email_norm, product);

create index interest_created_at on public.interest (created_at desc);

create trigger interest_set_updated_at
  before update on public.interest
  for each row execute function public.set_updated_at();

alter table public.interest enable row level security;

-- No policy for anon, and none for authenticated either: a member has no
-- business reading the list of people who want to buy. Admin reads it through
-- the same `is_admin()` everything else uses.
create policy interest_read_admin on public.interest
  for select
  to authenticated
  using (public.is_admin());

revoke all on public.interest from anon;
revoke all on public.interest from authenticated;
grant select on public.interest to authenticated;
grant all on public.interest to service_role;
