-- /kurul, 2026-11-20 (veri-zinciri-analisti, Öneri — advisor WARN ile
-- doğrulandı): CLAUDE.md'nin kendi "RLS/Performans Dersleri" kuralına
-- (çıplak auth.uid() çağrıları (select auth.uid())'e çevrilmeli, yoksa
-- Postgres sorguyu satır satır yeniden değerlendirebilir) aykırı 4 INSERT
-- politikası — hepsi bu ay eklenen yeni Finans tabloları. Davranış
-- değişmiyor, sadece performans; satır etkilenmiyor.
alter policy genel_giderler_insert on public.genel_giderler
  with check (is_finans_yetkili() and created_by = (select auth.uid()));

alter policy kasa_transferleri_insert on public.kasa_transferleri
  with check (is_finans_yetkili() and created_by = (select auth.uid()));

alter policy ortak_hesabi_hareketleri_insert on public.ortak_hesabi_hareketleri
  with check (is_finans_yetkili() and created_by = (select auth.uid()));

alter policy tedarikci_odemeleri_insert on public.tedarikci_odemeleri
  with check (is_finans_yetkili() and created_by = (select auth.uid()));
