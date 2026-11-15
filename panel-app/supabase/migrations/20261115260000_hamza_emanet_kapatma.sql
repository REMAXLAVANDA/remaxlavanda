-- Broker, 2026-11-15: Hamza Bakırcı'nın kendi bildirdiği emanet
-- (b7c6c1e3, 117.600 TL) zaten ciro raporu fed6f780'e bağlıydı
-- (satıcı+alıcı hizmet bedeli toplamı = 117.600, birebir eşleşiyor).
-- O rapor bu sabah gerçek banka ödemesiyle eşleştirilip kapatılmıştı
-- (bkz. migration 20261115160000) ama emanetin kendisi hiç kapatılmamış
-- kalmıştı — sistemde danışmanın kendi bildirdiği (bankadan otomatik
-- gelmeyen) bir emaneti otomatik kapatan mekanizma yok, bu elle
-- düzeltiliyor.
insert into public.emanet_hareketleri (emanet_id, tutar, yon, cikis_nedeni, tarih, islemi_yapan_id, ciro_raporu_katilimci_id, created_by)
values ('b7c6c1e3-95e5-4b88-9c56-c907f8e60614', 117600, 'cikis', 'hizmet_bedeline_mahsup', current_date, '18916ade-21a9-444e-abab-003911bd1d50', 'ba840d2e-a60d-4d78-9363-10127cc1658e', '18916ade-21a9-444e-abab-003911bd1d50');

update public.emanetler set durum = 'kapandi' where id = 'b7c6c1e3-95e5-4b88-9c56-c907f8e60614';

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
values ('18916ade-21a9-444e-abab-003911bd1d50', 'muhasebe_duzeltme', 'emanetler', 'b7c6c1e3-95e5-4b88-9c56-c907f8e60614',
  jsonb_build_object('not', 'Emanet, zaten kapanmış ciro raporuna (fed6f780) bağlıydı — elle kapatıldı, sistemde otomatik kapatma eksikliği var (2026-11-15)'));
