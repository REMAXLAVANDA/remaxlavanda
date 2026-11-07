-- Finans modülü, madde 3 (broker onayı 2026-11-06): Danışman Cari Hesabı
-- — YENİ TABLO AÇILMADI, mevcut cari_hareketler genişletiliyor.
--
-- Madde 4'ün cevabı (broker'a yazılı rapor edildi, onaylandı): taslak/
-- onaylı/iptal onay akışı EKLENMİYOR. Gerekçe: otomatik üretilecek
-- komisyon_farki kayıtları zaten iki ayrı yerde onaylanmış veriye
-- dayanıyor (fatura_tutari broker'ın "Fatura Kontrol"ünden, banka
-- teyidi broker'ın "teyit_edildi" işaretinden) — üçüncü bir onay
-- katmanı gereksiz iş yükü olur. Elle girilenler (avans/ceza/diger) zaten
-- sadece broker/owner girebiliyor, girişin kendisi yetkili onayı demek.
-- Düzeltme gerekirse (emanet_hareketleri ile AYNI felsefe) ters hareket
-- eklenir — bunun için duzeltme_hareketi_id eklendi, created_by zaten
-- vardı (ayrıca eklenmedi).

alter table public.cari_hareketler
  drop constraint cari_hareketler_kategori_check,
  add constraint cari_hareketler_kategori_check check (
    kategori in ('hizmet_bedeli', 'sahibinden_bedeli', 'ofis_katilim_bedeli', 'islem_masrafi', 'komisyon_farki', 'avans', 'ceza', 'diger')
  );

alter table public.cari_hareketler
  drop constraint cari_hareketler_kaynak_tip_check,
  add constraint cari_hareketler_kaynak_tip_check check (
    kaynak_tip in ('ciro_raporu_katilimcisi', 'islem_masrafi', 'komisyon_farki', 'manuel')
  );

alter table public.cari_hareketler
  add column duzeltme_hareketi_id uuid references public.cari_hareketler(id);
