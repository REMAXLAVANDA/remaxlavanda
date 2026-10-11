-- 2026-10-11 broker kararı — taslak bir ciro raporunun "sil" ve
-- "düzenle" seçeneği olmalı (şu an sadece "Onaya Gönder" vardı).
--
-- Silme: ciro_raporu_katilimcilari zaten ON DELETE CASCADE ile bağlıydı
-- (migration 20261008120000) — danışman kendi taslak/reddedildi raporunu
-- silince katılımcı satırları otomatik gider. Bu rapora bağlı para
-- hareketi beyanları (ciro_raporu_id, migration 20261011150000) için
-- AYNI mantık uygulanıyor: beyan silinirse ona bağlı beyan edilen para
-- hareketleri de anlamsız kalır, onlar da gitsin (CASCADE).
alter table public.banka_hareketleri
  drop constraint banka_hareketleri_ciro_raporu_id_fkey,
  add constraint banka_hareketleri_ciro_raporu_id_fkey
    foreign key (ciro_raporu_id) references public.ciro_raporlari(id) on delete cascade;

-- ciro_raporlari_update_self ile AYNI kapsam (sadece taslak/reddedildi,
-- sadece kendi raporu) — is_manager() zaten FOR ALL ile kapsıyor, bu
-- SADECE danışman/ofis'e kendi taslak/reddedildi raporunu silme izni
-- ekliyor.
create policy ciro_raporlari_delete_self on public.ciro_raporlari
  for delete to authenticated
  using (
    olusturan_id = (select auth.uid())
    and durum in ('taslak', 'reddedildi')
  );
