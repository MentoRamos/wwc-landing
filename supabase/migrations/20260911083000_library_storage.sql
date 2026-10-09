-- Wealth & Wellness platform — where the Library's files live.
--
-- One private bucket, and deliberately **no policy on storage.objects for
-- `authenticated`**. That is not an omission: it means no signed-in person can
-- list, read or write an object directly, ever. The only way to a file is a
-- signed URL minted by `/api/biblioteca/[slug]/download`, which asks the
-- user's own client first and gets zero rows back if they have no right to it.
--
-- So the authorization still lives in one place — the RLS policy on
-- content_items — and the storage layer has no second, parallel set of rules
-- that could drift away from it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'library',
  'library',
  false,                      -- never served directly; signed URLs only
  52428800,                   -- 50 MiB: the largest guide today is 16.5 MB
  array['application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A download is recorded by the same route, with the service role, right after
-- the policy has already said yes. `authenticated` holds `select` on this
-- table and nothing else (Fase 1), so nobody can write themselves a history —
-- or erase one. Spelled out so a later `grant all` reads as the mistake it is.
revoke insert, update, delete on public.download_events from authenticated;
