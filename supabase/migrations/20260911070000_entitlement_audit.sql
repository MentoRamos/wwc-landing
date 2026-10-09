-- Wealth & Wellness platform — the audit trail for access changes.
--
-- Fase 1 gave `admin_audit` a read policy for admins and nothing else: no
-- insert policy, and `grant select` only. An admin could therefore grant
-- access and be unable to record that they had. The trail would have been
-- empty on launch day and nobody would have noticed until it was needed.
--
-- The fix is a trigger rather than an insert in the route. A route can be
-- forgotten — the Kiwify webhook, a CSV importer, a fix applied by hand in
-- psql at midnight — and an audit trail with holes is worse than none,
-- because it is trusted. Hanging it off the table means every write to
-- `entitlements`, from any caller, leaves a row behind.
--
-- Same reasoning as the RLS design: the database enforces it, not the caller.

create or replace function public.audit_entitlement_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.entitlements;
begin
  target := coalesce(new, old);

  insert into public.admin_audit (actor_id, action, target_email, payload)
  values (
    auth.uid(),
    'entitlement.' || lower(tg_op),
    target.email_norm,
    jsonb_strip_nulls(jsonb_build_object(
      'entitlement_id', target.id,
      'product',        target.product,
      'status',         target.status,
      'source',         target.source,
      'expires_at',     target.expires_at,
      -- Only on an update, and only the fields worth reading back later.
      'was', case when tg_op = 'UPDATE' then jsonb_build_object(
        'status',     old.status,
        'expires_at', old.expires_at,
        'product',    old.product
      ) end
    ))
  );

  return target;
end;
$$;

-- `actor_id` is nullable on purpose: the Kiwify webhook and a migration both
-- write entitlements with no `auth.uid()`, and a not-null constraint here
-- would turn an unattributed change into a failed payment.
comment on function public.audit_entitlement_change() is
  'Writes admin_audit for every entitlement write. SECURITY DEFINER because '
  'admin_audit is deliberately insert-less for authenticated callers.';

drop trigger if exists entitlements_audit on public.entitlements;

create trigger entitlements_audit
  after insert or update or delete on public.entitlements
  for each row execute function public.audit_entitlement_change();

-- The trail is append-only by construction: `authenticated` holds `select`
-- and nothing else (Fase 1), and the only writer is the definer function
-- above. Spelled out here so a later `grant all` reads as the mistake it is.
revoke insert, update, delete on public.admin_audit from authenticated;
