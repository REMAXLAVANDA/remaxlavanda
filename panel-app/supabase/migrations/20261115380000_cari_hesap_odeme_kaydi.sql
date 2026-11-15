-- Broker, 2026-11-15: "neden cari hesap açık/kapandı diye yazıyor, neden
-- bir hesap ekstresi (BizimHesap gibi) şeklinde ilerlemiyor" sorusuna
-- cevap — broker "Gerçek çift kayıt (BizimHesap gibi)" seçeneğini
-- onayladı. Bir danışmana fatura ödemesi yapıldığında (odeme_durumu
-- 'alindi' olduğunda), hakediş satırı sadece kapatılmakla kalmıyor,
-- AYRI bir "ödeme" satırı da oluşuyor — tıpkı gerçek bir muhasebe
-- defterinde hakediş ve ödemenin iki ayrı kalem olması gibi. Böylece
-- Cari Hesap ekranı artık kronolojik, bakiyeli bir ekstre gösterebiliyor
-- (bkz. lib/cariHesap.js ekstreForDanisman).
--
-- durum='kapandi' ile ekleniyor: hakediş satırı ödenince zaten
-- 'kapandi' oluyor (mevcut davranış, değişmedi) ve netBakiye()/
-- cariOzetiByDanisman() kapanan satırları saymıyor — yeni ödeme satırı
-- da 'kapandi' olduğu için aktif bakiye hesabına hiç etki etmiyor,
-- sıfır regresyon. Sadece ekstre görünümünde (ekstreForDanisman, TÜM
-- satırları durumdan bağımsız okuyor) görünür hale geliyor.
--
-- DİKKAT: kaynak_tip='cari_hesap_odemesi' ZATEN KULLANIMDA (bkz.
-- migration 20261109143500_cari_hesap_odeme.sql — kasadan yapılan
-- GERÇEK nakit ödemeler, kaynak_id orada cari_hesap_odemeleri.id'ye
-- işaret ediyor). Burada kaynak_id ciro_raporu_katilimcilari.id'ye
-- işaret edeceği için AYRI bir kaynak_tip ('ciro_katilimci_odemesi')
-- kullanılıyor — aksi halde aynı alan iki farklı anlama gelirdi.
alter table public.cari_hareketler drop constraint cari_hareketler_kaynak_tip_check;
alter table public.cari_hareketler add constraint cari_hareketler_kaynak_tip_check
  check (kaynak_tip = any (array['ciro_raporu_katilimcisi', 'islem_masrafi', 'komisyon_farki', 'cari_hesap_odemesi', 'ciro_katilimci_odemesi', 'manuel']));

create or replace function public.cari_hesap_odeme_kaydi_senkronize()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
begin
  select id into v_existing_id
  from public.cari_hareketler
  where kaynak_tip = 'ciro_katilimci_odemesi' and kaynak_id = new.id;

  if new.odeme_durumu = 'alindi' and coalesce(new.fatura_tutari, 0) > 0 then
    if v_existing_id is null then
      insert into public.cari_hareketler
        (danisman_id, tarih, tur, tutar, kategori, aciklama, kaynak_tip, kaynak_id, durum, created_by)
      values
        (new.danisman_id, current_date, 'borc', new.fatura_tutari, 'odeme',
         'Hizmet bedeli ödemesi (otomatik)', 'ciro_katilimci_odemesi', new.id, 'kapandi', null);
    else
      update public.cari_hareketler set tutar = new.fatura_tutari where id = v_existing_id;
    end if;
  else
    if v_existing_id is not null then
      delete from public.cari_hareketler where id = v_existing_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_cari_hesap_odeme_kaydi
  after update of odeme_durumu, fatura_tutari on public.ciro_raporu_katilimcilari
  for each row
  when (new.odeme_durumu is distinct from old.odeme_durumu or new.fatura_tutari is distinct from old.fatura_tutari)
  execute function public.cari_hesap_odeme_kaydi_senkronize();
