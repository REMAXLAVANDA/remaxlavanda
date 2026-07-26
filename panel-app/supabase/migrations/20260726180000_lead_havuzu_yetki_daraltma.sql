-- ----------------------------------------------------------------------------
-- LEAD HAVUZU YETKİ DARALTMA — sadece broker/owner. Daha önce ofis de
-- erişebiliyordu, artık değil (bkz. lib/roles.js canManageLeads).
-- recruiting_manage politikasına DOKUNULMADI — Recruiting broker/owner/
-- ofis erişimini koruyor, iki modül artık bağımsız yetki seviyelerinde.
-- ----------------------------------------------------------------------------

drop policy if exists leads_manage on public.leads;
create policy leads_manage on public.leads
  for all to authenticated
  using (public.current_user_role() in ('broker', 'owner'))
  with check (public.current_user_role() in ('broker', 'owner'));
