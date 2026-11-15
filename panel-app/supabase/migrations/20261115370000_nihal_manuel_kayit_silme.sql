-- Broker, 2026-11-15: Nihal Sunar için Portal'a girilen 2 manuel
-- (bankayla tek tek doğrulanmamış, BizimHesap toplamına dayanan) mutabakat
-- kaydı siliniyor — broker sadece bankayla doğrulanmış gerçek kayıtların
-- kalmasını istiyor. Gerçek, banka-doğrulanmış 2 hizmet bedeli kaydı
-- (53.760 ve 120.000 TL, ikisi de zaten kapalı) etkilenmiyor.
delete from public.cari_hareketler
where id in ('518c9221-2b9b-432c-9b66-b8184ad57513', '06c90f8b-7757-4724-b8b1-0728b79e09d7');

insert into public.audit_log (actor_id, action, table_name, record_id, detay)
values ('18916ade-21a9-444e-abab-003911bd1d50', 'muhasebe_duzeltme', 'cari_hareketler', '6ac0f46e-718f-4ebc-9e69-0f0bba0a154c',
  jsonb_build_object('not', 'Nihal Sunar - bankayla doğrulanmamış 2 manuel mutabakat kaydı silindi, sadece gerçek banka kayıtları bırakıldı (2026-11-15)'));
