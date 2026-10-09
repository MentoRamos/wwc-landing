-- Wealth & Wellness platform — one row per subscription, not one per payment.
--
-- The Kiwify webhook upserts on (external_id, product): a renewal has to move
-- the date on the row that already exists. Without a unique index there is
-- nothing to conflict on, so every monthly charge would insert another row.
-- Nobody would notice — `active_products()` would still answer correctly —
-- until the day Kauã revokes an access on the admin screen and the other
-- eleven rows keep it open.
--
-- Deliberately NOT a partial index. The first version carried
-- `where external_id is not null`, to leave hand-made grants free to repeat,
-- and Postgres then refused every upsert with 42P10: a partial index can only
-- back an ON CONFLICT whose statement repeats the same predicate, which
-- PostgREST does not emit.
--
-- The predicate was never needed. Two NULLs are distinct in a unique index, so
-- any number of manual rows with a null `external_id` still coexist — two
-- Protocol students can both hold a manual `protocol` row exactly as before.

drop index if exists public.entitlements_external_product_key;

create unique index if not exists entitlements_external_product_key
  on public.entitlements (external_id, product);
