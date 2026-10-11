-- 2026-10-11 broker onayı — Banka Hareketleri'ni danışman/ofis'e de aç:
-- "dekont bilgisini danışman kendi girsin, istediği kadar (parçalı ödeme
-- olabiliyor)". Eşleştirme/son "ödeme alındı" onayı hâlâ SADECE broker'da
-- (broker kararı: "danışman girer, broker onaylar") — bu yüzden danışman/
-- ofis'e sadece kendi girdiği, henüz eşleşmemiş kayıtlar üzerinde INSERT/
-- SELECT/UPDATE/DELETE açılıyor; durum/eşleştirme alanlarını kendileri
-- değiştiremez (WITH CHECK'te sabitlendi). banka_hareketleri_manage
-- (is_manager) politikası AYNEN kalıyor, bu SADECE ek bir izin katmanı.

create policy banka_hareketleri_insert_self on public.banka_hareketleri
  for insert to authenticated
  with check (
    public.is_active()
    and public.current_user_role() in ('danisman', 'ofis')
    and olusturan_id = (select auth.uid())
    and kaynak = 'manuel'
    and durum = 'eslesmedi'
  );

create policy banka_hareketleri_select_self on public.banka_hareketleri
  for select to authenticated
  using (
    public.current_user_role() in ('danisman', 'ofis')
    and olusturan_id = (select auth.uid())
  );

-- Sadece henüz eşleşmemişken düzenlenebilir/silinebilir — broker eşleştirir
-- eşleştirmez (durum != 'eslesmedi') danışman artık dokunamaz.
create policy banka_hareketleri_update_self on public.banka_hareketleri
  for update to authenticated
  using (
    public.current_user_role() in ('danisman', 'ofis')
    and olusturan_id = (select auth.uid())
    and durum = 'eslesmedi'
  )
  with check (
    public.current_user_role() in ('danisman', 'ofis')
    and olusturan_id = (select auth.uid())
    and durum = 'eslesmedi'
    and eslesen_katilimci_id is null
    and eslestiren_id is null
  );

create policy banka_hareketleri_delete_self on public.banka_hareketleri
  for delete to authenticated
  using (
    public.current_user_role() in ('danisman', 'ofis')
    and olusturan_id = (select auth.uid())
    and durum = 'eslesmedi'
  );

-- "tur" MyRemax sınıflandırmasına göre genişletildi — sadece bağlanma
-- parası/diğer vardı, hizmet bedeli ve iade eklendi.
alter table public.banka_hareketleri
  drop constraint banka_hareketleri_tur_check,
  add constraint banka_hareketleri_tur_check check (tur in (
    'baglanma_parasi', 'hizmet_bedeli', 'iade', 'diger'
  )),
  add column banka_adi text,
  add column dekont_dosya_url text;
