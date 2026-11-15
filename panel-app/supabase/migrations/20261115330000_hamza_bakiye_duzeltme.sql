-- Broker, 2026-11-15: Hamza Bakırcı'nın BizimHesap mutabakat rakamı
-- (-72.290,94 TL) yanlıştı — 2 gerçek faturası (56.448 TL, GIB2026000000009
-- ve 10.368 TL, 29.09.2026 banka ekstresi ref 2966480866) BizimHesap'ta
-- henüz "kapatılmış" (Alış kaydı) olarak işlenmemiş olduğu için borç gibi
-- görünüyordu. Gerçek kalan borcu 5.474,94 TL (broker onayladı). Düzeltme:
-- +66.816,00 TL (56.448+10.368) alacak ekleniyor.
insert into public.cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, durum, created_by)
values (
  'd63f51fd-d55e-437f-a644-52bf76c809e1', current_date, 'alacak', 66816.00, 'diger',
  'BizimHesap mutabakat düzeltmesi - 56.448 TL (GIB2026000000009) ve 10.368 TL faturaların gerçekte kapanmış olması (29.09 ve 11.11 banka ödemeleri) BizimHesap bakiyesine henüz yansımamıştı, gerçek kalan borç 5.474,94 TL (2026-11-15)',
  'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'
);

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
values ('18916ade-21a9-444e-abab-003911bd1d50', 'muhasebe_duzeltme', 'cari_hareketler', 'd63f51fd-d55e-437f-a644-52bf76c809e1',
  jsonb_build_object('not', 'Hamza Bakırcı BizimHesap mutabakat düzeltmesi - gerçek kalan borç 5.474,94 TL (2026-11-15)'));
