-- Broker, 2026-11-15: Birgül Özdemir'in kendi bildirdiği emanet
-- (783ad287, 150.000 TL) de Hamza'dakiyle AYNI sorunu taşıyordu —
-- ciro raporu (d2bbfda3) zaten onaylı/kapanmış (satıcı+alıcı hizmet
-- bedeli toplamı = 150.000, birebir eşleşiyor) ama emanetin kendisi
-- kapatılmamıştı. Bu raporda 2 katılımcı var: Ahmet Erdemir (60.000
-- TL fatura, hâlâ "bekliyor" — broker bilerek dokunulmasın dedi) ve
-- Birgül (60.000 TL fatura, zaten "alındı"). Sadece dokümantasyon
-- amaçlı emanet_hareketleri kaydı ekleniyor — odeme_durumu/cari_hareket
-- HİÇBİRİNE dokunulmuyor (cozumle_emanet RPC'si çağrılmıyor, ham kayıt).
insert into public.emanet_hareketleri (emanet_id, tutar, yon, cikis_nedeni, tarih, islemi_yapan_id, ciro_raporu_katilimci_id, created_by)
values
  ('783ad287-8661-48a5-a425-0e0b59845219', 75000, 'cikis', 'hizmet_bedeline_mahsup', current_date, '18916ade-21a9-444e-abab-003911bd1d50', '974f30c1-26ea-4484-8f36-8030bf94487c', '18916ade-21a9-444e-abab-003911bd1d50'),
  ('783ad287-8661-48a5-a425-0e0b59845219', 75000, 'cikis', 'hizmet_bedeline_mahsup', current_date, '18916ade-21a9-444e-abab-003911bd1d50', 'b2986915-abd0-4004-b3d5-002f34e516bc', '18916ade-21a9-444e-abab-003911bd1d50');

update public.emanetler set durum = 'kapandi' where id = '783ad287-8661-48a5-a425-0e0b59845219';

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
values ('18916ade-21a9-444e-abab-003911bd1d50', 'muhasebe_duzeltme', 'emanetler', '783ad287-8661-48a5-a425-0e0b59845219',
  jsonb_build_object('not', 'Emanet, zaten kapanmış ciro raporuna (d2bbfda3) bağlıydı — elle kapatıldı. Ahmet Erdemir''in 60.000 TL faturası bilerek "bekliyor" bırakıldı (2026-11-15)'));
