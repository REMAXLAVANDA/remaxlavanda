-- Ofis Faturası artık satıcı ve alıcı için AYRI — broker, 2026-10-17:
-- "ofis faturası keserken alıcı yeri ayrı satıcı yeri ayrı fatura
-- bilgileri girmek gerekmez mi". satici_hizmet_bedeli_alindi/
-- alici_hizmet_bedeli_alindi birbirinden bağımsız (bkz. migration
-- 20261011140000) — bir raporda hem satıcıdan hem alıcıdan hizmet
-- bedeli alınabiliyor, bu durumda ofis gerçekte İKİ fatura kesiyor ama
-- eski tek ofis_fatura_* alanı bunu tutamıyordu (canlıda doğrulandı:
-- 751ead6a-31ec-436d-9b91-43594567c4db raporunda hem satıcı hem alıcıdan
-- 67.200 TL alınmış, tek fatura no girilmiş — hangi tarafa ait olduğu
-- veriden anlaşılamıyordu, broker'a soruldu: alıcı tarafına ait).

alter table public.ciro_raporlari
  add column ofis_fatura_satici_no text,
  add column ofis_fatura_satici_tarihi date,
  add column ofis_fatura_satici_tutari numeric,
  add column ofis_fatura_alici_no text,
  add column ofis_fatura_alici_tarihi date,
  add column ofis_fatura_alici_tutari numeric;

-- Mevcut tek kayıt broker onayıyla ALICI tarafına taşınıyor — veri
-- kaybolmuyor, yeni kolona kopyalanıp eski kolon NULL'lanıyor (UI artık
-- eski kolonu hiç okumuyor/yazmıyor, bkz. supabaseProvider.js).
update public.ciro_raporlari
set
  ofis_fatura_alici_no = ofis_fatura_no,
  ofis_fatura_alici_tarihi = ofis_fatura_tarihi,
  ofis_fatura_alici_tutari = ofis_fatura_tutari,
  ofis_fatura_no = null,
  ofis_fatura_tarihi = null,
  ofis_fatura_tutari = null
where ofis_fatura_no is not null;

-- Broker-only koruma triggerı (20261017120000) yeni kolonları da kapsasın
-- — eski ofis_fatura_* kolonlar artık kullanılmıyor ama DROP edilmedi
-- (geri alınabilir kalsın), koruma yine de kalıyor ki unutulmuş eski
-- veri de danışman tarafından değiştirilemesin.
create or replace function public.ciro_raporlari_broker_alanlarini_koru()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not (select is_manager()) then
    new.ofis_fatura_no := old.ofis_fatura_no;
    new.ofis_fatura_tarihi := old.ofis_fatura_tarihi;
    new.ofis_fatura_tutari := old.ofis_fatura_tutari;
    new.ofis_fatura_satici_no := old.ofis_fatura_satici_no;
    new.ofis_fatura_satici_tarihi := old.ofis_fatura_satici_tarihi;
    new.ofis_fatura_satici_tutari := old.ofis_fatura_satici_tutari;
    new.ofis_fatura_alici_no := old.ofis_fatura_alici_no;
    new.ofis_fatura_alici_tarihi := old.ofis_fatura_alici_tarihi;
    new.ofis_fatura_alici_tutari := old.ofis_fatura_alici_tutari;
    new.myremax_girildi := old.myremax_girildi;
    new.muhasebe_tamamlandi := old.muhasebe_tamamlandi;
    new.muhasebe_tamamlanma_tarihi := old.muhasebe_tamamlanma_tarihi;
    new.muhasebe_tamamlayan_id := old.muhasebe_tamamlayan_id;
    new.onaylayan_id := old.onaylayan_id;
    new.onay_tarihi := old.onay_tarihi;
  end if;
  return new;
end;
$$;
