-- Broker, 2026-11-15: Kubilay Özkan'ın eski 13.200 TL'lik faturası
-- BizimHesap mutabakatı (migration 20261115240000) hesaplanırken
-- hâlâ "bekliyor" (açık) durumdaydı. Mutabakat SONRASINDA bu fatura
-- gerçekten ödendi diye işaretlendi (broker onayladı — borcundan
-- düşülmüş) ve bağlı cari hareket kapandı. Bu da mutabakat rakamını
-- geçersiz kıldı (artık 13.200 TL fazla borçlu gösteriyordu). Düzeltme:
-- +13.200 TL alacak ekleniyor, böylece toplam yine BizimHesap'ın
-- hedef bakiyesine (-11.550,10 TL) eşitleniyor.
insert into public.cari_hareketler (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, durum, created_by)
values (
  'd5c0fdbd-301d-4230-a465-ccd82dc833b6', current_date, 'alacak', 13200, 'diger',
  'BizimHesap mutabakatı düzeltmesi - eski 13.200 TL fatura mutabakattan SONRA ödendi olarak işaretlendi, çift sayımı önlemek için eklendi (2026-11-15)',
  'manuel', null, 'acik', '18916ade-21a9-444e-abab-003911bd1d50'
);

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
values ('18916ade-21a9-444e-abab-003911bd1d50', 'muhasebe_duzeltme', 'cari_hareketler', 'd5c0fdbd-301d-4230-a465-ccd82dc833b6',
  jsonb_build_object('not', 'Kubilay Özkan BizimHesap mutabakat düzeltmesi - eski fatura mutabakat sonrası ödendi işaretlendiği için +13.200 TL eklendi (2026-11-15)'));
