-- Admin can remove a row from the interest list.
--
-- A lead list with no way to take an entry out is incomplete: the first four
-- rows on this table are end-to-end test posts, and the first real one will
-- eventually be a typo, a bot, or somebody who asked to be forgotten. The last
-- of those is not a nicety — art. 18 of the LGPD gives them the right, and the
-- right has to be exercisable by the person who answers the request.
--
-- Delete goes through `is_admin()` like every other admin write, so the action
-- that calls it uses the signed-in user's client and fails closed against the
-- policy rather than around it with a service role.

create policy interest_delete_admin on public.interest
  for delete
  to authenticated
  using (public.is_admin());

grant delete on public.interest to authenticated;
