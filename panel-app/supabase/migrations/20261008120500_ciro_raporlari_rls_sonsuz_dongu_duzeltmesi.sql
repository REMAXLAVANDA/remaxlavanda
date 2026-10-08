-- Az önceki migration'da (20261008120000) ciro_raporlari ve
-- ciro_raporu_katilimcilari politikaları BİRBİRİNİ çıplak EXISTS alt
-- sorgusuyla kontrol ediyordu — ciro_raporlari'nı sorgulamak onun SELECT
-- politikasını, o da ciro_raporu_katilimcilari'nı sorguluyor, o da KENDİ
-- politikasında ciro_raporlari'nı sorguluyor → sonsuz döngü (42P17).
-- Role-simülasyon testinde (ilk INSERT denemesinde) hemen yakalandı,
-- hiçbir uygulama kodu buna henüz bağlı değildi.
--
-- Çözüm: CLAUDE.md'deki kural — "RLS politikasında kullanılan bir
-- fonksiyon kendi koruduğu tabloyu (veya herhangi RLS'li bir tabloyu)
-- sorguluyorsa SECURITY DEFINER olmalı". Çapraz-tablo bakışlarını
-- SECURITY DEFINER fonksiyonların arkasına alıyoruz — is_manager() ile
-- AYNI desen, bu fonksiyonlar diğer tablonun RLS'ini hiç tetiklemiyor.

create or replace function public.ciro_raporu_olusturan_id(p_rapor_id uuid)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select olusturan_id from public.ciro_raporlari where id = p_rapor_id;
$$;

create or replace function public.ciro_raporu_durum(p_rapor_id uuid)
returns text
language sql
security definer set search_path = public
stable
as $$
  select durum from public.ciro_raporlari where id = p_rapor_id;
$$;

create or replace function public.ciro_raporunda_katilimci_mi(p_rapor_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.ciro_raporu_katilimcilari
    where ciro_raporu_id = p_rapor_id and danisman_id = auth.uid()
  );
$$;

-- NOT: bu migration DROP POLICY yerine ALTER POLICY kullanıyor — uygulama
-- anında bu Supabase projesinde DROP (hem DROP POLICY hem DELETE) tutarlı
-- biçimde asılı kalıyordu (ayrı, araştırılan bir platform sorunu — bkz.
-- AI_NOTLARI.md), ALTER POLICY anında çalıştı. Sonuç olarak birebir aynı.
alter policy ciro_raporlari_select on public.ciro_raporlari
  using (
    (select is_manager())
    or olusturan_id = (select auth.uid())
    or (select public.ciro_raporunda_katilimci_mi(id))
  );

alter policy ciro_raporu_katilimcilari_select on public.ciro_raporu_katilimcilari
  using (
    (select is_manager())
    or danisman_id = (select auth.uid())
    or (select public.ciro_raporu_olusturan_id(ciro_raporu_id)) = (select auth.uid())
  );

alter policy ciro_raporu_katilimcilari_insert_self on public.ciro_raporu_katilimcilari
  with check (
    (select is_manager())
    or (
      (select public.ciro_raporu_olusturan_id(ciro_raporu_id)) = (select auth.uid())
      and (select public.ciro_raporu_durum(ciro_raporu_id)) in ('taslak','reddedildi')
    )
  );

alter policy ciro_raporu_katilimcilari_update on public.ciro_raporu_katilimcilari
  using (
    (select is_manager())
    or (
      danisman_id = (select auth.uid())
      and (select public.ciro_raporu_durum(ciro_raporu_id)) in ('taslak','onay_bekliyor','reddedildi')
    )
  )
  with check (
    (select is_manager())
    or (
      danisman_id = (select auth.uid())
      and (select public.ciro_raporu_durum(ciro_raporu_id)) in ('taslak','onay_bekliyor','reddedildi')
    )
  );

alter policy ciro_raporu_katilimcilari_delete on public.ciro_raporu_katilimcilari
  using (
    (select is_manager())
    or (
      (select public.ciro_raporu_olusturan_id(ciro_raporu_id)) = (select auth.uid())
      and (select public.ciro_raporu_durum(ciro_raporu_id)) in ('taslak','reddedildi')
    )
  );
