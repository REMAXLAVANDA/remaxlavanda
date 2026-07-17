-- ============================================================================
-- RE/MAX Lavanda Portal — Fırsatlar: danışman kendi bulduğu müşteriyi
-- (portföy arayışı/satıcı-alıcı adayı) doğrudan kendine ekleyebilsin.
--
-- Önceki kural sadece broker/owner/ofis'e insert izni veriyordu — danışman
-- kendi bilgisini giremiyordu. Bunu açarken havuz mantığını bozmamak için
-- danışmanın eklediği kayıt SADECE kendi owner_id + claimer_id'siyle
-- oluşturulabiliyor (with check) — yani direkt kendine atanmış oluyor,
-- açık havuza düşüp başka bir danışman tarafından üstlenilemiyor.
-- ============================================================================

drop policy if exists opportunities_insert on public.opportunities;
create policy opportunities_insert on public.opportunities
  for insert to authenticated
  with check (
    public.current_user_role() in ('broker', 'owner', 'ofis')
    or (
      public.current_user_role() = 'danisman'
      and owner_id = auth.uid()
      and claimer_id = auth.uid()
    )
  );
