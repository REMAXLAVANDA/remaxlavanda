-- Finans modülü, madde 5 (broker onayı 2026-11-06): Gider Defteri'nde
-- kişi/kalem eşleştirme. islem_masraflari şu an boş (0 satır) — geçiş/
-- backfill'e gerek yok, kolonlar doğrudan NOT NULL eklenebiliyor.
--
-- kaynak_turu: banka kaynaklı (masrafOlarakIsaretle) ile ciro kaynaklı
-- (tapu harcı/ilan gideri, ciro raporuna bağlı) ayrı kaynaklar — ikisine
-- aynı "banka_hareketi_id zorunlu" kısıtını uygulamak yanlış olurdu,
-- bu yüzden ayrı bir kaynak_turu kolonu + ona göre değişen CHECK.
--
-- siniflandirma: danisman_id'den TÜRETİLMİYOR bilerek — boş danisman_id
-- "ofis gideri" anlamına gelmeyebilir, "henüz sınıflandırılmadı" da
-- olabilir, bu yüzden üçüncü, açık bir durum var.

alter table public.islem_masraflari
  add column kaynak_turu text not null default 'banka' check (kaynak_turu in ('banka', 'ciro_raporu')),
  add column siniflandirma text not null default 'siniflandirilmamis' check (siniflandirma in ('danisman_cari', 'ofis_gideri', 'siniflandirilmamis'));

alter table public.islem_masraflari
  alter column kaynak_turu drop default;

alter table public.islem_masraflari
  add constraint islem_masraflari_kaynak_turu_tutarliligi check (
    (kaynak_turu = 'banka' and banka_hareketi_id is not null and ciro_raporu_id is null) or
    (kaynak_turu = 'ciro_raporu' and ciro_raporu_id is not null and banka_hareketi_id is null)
  );

alter table public.islem_masraflari
  add constraint islem_masraflari_danisman_cari_tutarliligi check (
    siniflandirma != 'danisman_cari' or danisman_id is not null
  );
