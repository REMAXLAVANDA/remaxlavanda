-- Broker, 2026-11-22 (1. aşama, madde 1.3): ortak hesabına para koyma
-- (ortağın şirkete borç vermesi/para koyması) — bugüne kadar bu tablo
-- SADECE çekiş kabul ediyordu.
--
-- Yetki: "koyma" YENİ bir yetenek, is_manager() (broker/owner) ile
-- sınırlı — "çekiş" ESKİ davranış, is_finans_yetkili() (broker/owner/
-- muhasebe) olarak AYNEN kalıyor, dokunulmadı.
alter table public.ortak_hesabi_hareketleri drop constraint if exists ortak_hesabi_hareketleri_tur_check;
alter table public.ortak_hesabi_hareketleri add constraint ortak_hesabi_hareketleri_tur_check
  check (tur in ('cekis', 'koyma'));

drop policy if exists ortak_hesabi_hareketleri_insert on public.ortak_hesabi_hareketleri;
create policy ortak_hesabi_hareketleri_insert on public.ortak_hesabi_hareketleri
  for insert
  with check (
    is_finans_yetkili()
    and created_by = (select auth.uid())
    and (tur = 'cekis' or is_manager())
  );

-- Banka satırı bir ortak hareketine eşleştirilebilsin (banka_hareketleri
-- tarafında "ortak hesabından/hesabına" olduğu görünsün diye — bkz.
-- banka_hareketleri.genel_gider_id ile AYNI desen, madde 1.2).
alter table public.banka_hareketleri
  add column if not exists ortak_hareket_id uuid references public.ortak_hesabi_hareketleri(id);
