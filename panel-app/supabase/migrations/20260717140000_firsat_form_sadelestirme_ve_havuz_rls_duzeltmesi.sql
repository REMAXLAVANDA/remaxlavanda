-- ============================================================================
-- RE/MAX Lavanda Portal — Fırsatlar: havuza atma RLS hatası + form sadeleştirme
--
-- 1) BUG: opportunities_insert politikası danışman için HER ZAMAN
--    claimer_id = auth.uid() şartı arıyordu. Ama "Havuza at" seçeneği
--    kasıtlı olarak claimer_id'yi BOŞ bırakıyor (havuza düşsün, kimse
--    üstlenmemiş olsun diye) — bu yüzden danışman "Havuza at"ı işaretleyip
--    kaydetmeye çalıştığında RLS reddediyor, "yetkiniz yok" hatası
--    alıyordu. Düzeltme: claimer_id ya kendisi ya da NULL olabilir.
--
-- 2) Form sadeleştirme: aidat/bina yaşı/kat/ısıtma alanları kaldırıldı
--    (kullanışsız/karmaşık bulundu) — kolonlar da temizleniyor.
-- ============================================================================

drop policy if exists opportunities_insert on public.opportunities;
create policy opportunities_insert on public.opportunities
  for insert to authenticated
  with check (
    public.current_user_role() in ('broker', 'owner', 'ofis')
    or (
      public.current_user_role() = 'danisman'
      and owner_id = auth.uid()
      and (claimer_id = auth.uid() or claimer_id is null)
    )
  );

alter table public.opportunities
  drop column if exists bina_yasi,
  drop column if exists kat,
  drop column if exists aidat,
  drop column if exists isitma;
