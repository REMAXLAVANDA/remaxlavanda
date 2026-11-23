-- 2. Aşama, Adım 1 (docs/muhasebe-tasarim.md madde b/c) — "tek defter"
-- katmanının temeli. Bu tablo SADECE OKUMA amaçlı: elle hiçbir satır
-- girilmez/değiştirilmez, tamamı aşağıdaki trigger'larla 7 kaynak
-- tablodan otomatik üretilir. Mevcut hiçbir ekran bu tablodan OKUMAYA
-- geçmiyor — sadece YENİ raporların (Adım 5) kaynağı olacak.
--
-- hesap_tip + hesap_id/kategori: 'kasa','cari_danisman','cari_tedarikci',
-- 'cari_ortak','emanet' gerçek bir kimliğe (uuid) bağlanıyor → hesap_id.
-- 'gelir'/'gider' bir kimliğe değil bir KATEGORİ METNİNE bağlanıyor
-- (genel_giderler'in kendisinde bile ayrı bir "gelir/gider kategorisi"
-- tablosu yok) → kategori. 'cari_musteri' şimdilik KULLANILMIYOR (henüz
-- hiçbir kaynak tablo müşteriyi bir kimlikle değil serbest metinle
-- tutuyor, bkz. lib/bankaHareketleri.js musteriCarisi() — Adım 1
-- kapsamında değil).
--
-- Yön kuralı (basit çift taraflı, TAM bir genel muhasebe hesap planı
-- değil — sadece 7 kaynağı birbirine bağlayan bir köprü):
--   kasa, emanet         : varlık gibi   → bakiye = borç − alacak
--   gelir                : alacak arttırır → toplam = alacak − borç
--   gider                : borç arttırır   → toplam = borç − alacak
--   cari_tedarikci, cari_ortak : borç/yükümlülük gibi → bakiye = alacak − borç
--   cari_danisman         : "şirketin danışmana borcu" → bakiye = alacak − borç
-- Her gerçek olay İKİ satır üretir, biri borç biri alacak, tutarları
-- eşit — böylece defterin tamamında toplam borç = toplam alacak kalır
-- (basit bir tutarlılık kontrolü).
create table public.defter_kayitlari (
  id uuid primary key default gen_random_uuid(),
  tarih date not null,
  hesap_tip text not null check (hesap_tip in (
    'kasa', 'cari_danisman', 'cari_tedarikci', 'cari_musteri', 'cari_ortak', 'gelir', 'gider', 'emanet'
  )),
  hesap_id uuid,
  kategori text,
  yon text not null check (yon in ('borc', 'alacak')),
  tutar numeric not null check (tutar > 0),
  kdv_tutari numeric,
  kaynak_tablo text not null,
  kaynak_id uuid not null,
  aciklama text,
  created_at timestamptz not null default now(),
  constraint defter_kayitlari_hesap_veya_kategori check (
    (hesap_tip in ('gelir', 'gider') and kategori is not null and hesap_id is null)
    or
    (hesap_tip not in ('gelir', 'gider') and hesap_id is not null and kategori is null)
  )
);

create index defter_kayitlari_kaynak_idx on public.defter_kayitlari (kaynak_tablo, kaynak_id);
create index defter_kayitlari_hesap_idx on public.defter_kayitlari (hesap_tip, hesap_id);
create index defter_kayitlari_tarih_idx on public.defter_kayitlari (tarih);

alter table public.defter_kayitlari enable row level security;

-- Sadece broker/owner/muhasebe okuyabilir (is_finans_yetkili) — defterin
-- okuyacağı raporlar zaten bugün aynı yetkiyle korunan ekranların devamı.
-- Elle INSERT/UPDATE/DELETE YOK — sadece SECURITY DEFINER trigger
-- fonksiyonları yazabiliyor, bu yüzden normal rollere hiç yazma izni
-- verilmiyor (RLS'de policy olmaması = varsayılan red).
create policy defter_kayitlari_select on public.defter_kayitlari
  for select
  using (is_finans_yetkili());

revoke all on public.defter_kayitlari from public, anon, authenticated;
grant select on public.defter_kayitlari to authenticated;

-- ============================================================
-- 1) genel_giderler → (kasa, alacak) + (gider, borç)
-- ============================================================
create or replace function public.defter_genel_gider_senkronize()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    delete from defter_kayitlari where kaynak_tablo = 'genel_giderler' and kaynak_id = old.id;
    return old;
  end if;

  insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
  values (new.tarih, 'kasa', new.kasa_id, 'alacak', new.tutar, 'genel_giderler', new.id, new.aciklama);
  insert into defter_kayitlari (tarih, hesap_tip, kategori, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
  values (new.tarih, 'gider', new.ana_kategori || ' · ' || new.alt_kategori, 'borc', new.tutar, 'genel_giderler', new.id, new.aciklama);
  return new;
end;
$$;

create trigger defter_genel_gider_sync
  after insert or delete on public.genel_giderler
  for each row execute function public.defter_genel_gider_senkronize();

-- ============================================================
-- 2) tedarikci_odemeleri → (kasa, alacak) + (cari_tedarikci, borç)
-- Not: tedarikçinin kendi kimlik tablosu henüz yok (Adım 2'de gelecek,
-- bkz. docs/muhasebe-tasarim.md madde f) — şimdilik tedarikci_adi'ndan
-- SABİT/TEKRARLANABİLİR bir kimlik türetiliyor (md5 hash). Aynı
-- sınırlama zaten lib/bankaHareketleri.js musteriCarisi()'nde de var
-- (serbest metinden gruplama) — yeni bir risk değil.
-- ============================================================
create or replace function public.defter_tedarikci_odeme_senkronize()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    delete from defter_kayitlari where kaynak_tablo = 'tedarikci_odemeleri' and kaynak_id = old.id;
    return old;
  end if;

  insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
  values
    (new.tarih, 'kasa', new.kasa_id, 'alacak', new.tutar, 'tedarikci_odemeleri', new.id, new.tedarikci_adi),
    (new.tarih, 'cari_tedarikci', md5(lower(trim(new.tedarikci_adi)))::uuid, 'borc', new.tutar, 'tedarikci_odemeleri', new.id, new.tedarikci_adi);
  return new;
end;
$$;

create trigger defter_tedarikci_odeme_sync
  after insert or delete on public.tedarikci_odemeleri
  for each row execute function public.defter_tedarikci_odeme_senkronize();

-- ============================================================
-- 3) ortak_hesabi_hareketleri → koyma: (kasa, borç) + (cari_ortak, alacak)
--                                çekiş: (kasa, alacak) + (cari_ortak, borç)
-- ============================================================
create or replace function public.defter_ortak_hesabi_senkronize()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    delete from defter_kayitlari where kaynak_tablo = 'ortak_hesabi_hareketleri' and kaynak_id = old.id;
    return old;
  end if;

  if new.tur = 'koyma' then
    insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
    values
      (new.tarih, 'kasa', new.kasa_id, 'borc', new.tutar, 'ortak_hesabi_hareketleri', new.id, new.aciklama),
      (new.tarih, 'cari_ortak', new.ortak_id, 'alacak', new.tutar, 'ortak_hesabi_hareketleri', new.id, new.aciklama);
  else
    insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
    values
      (new.tarih, 'kasa', new.kasa_id, 'alacak', new.tutar, 'ortak_hesabi_hareketleri', new.id, new.aciklama),
      (new.tarih, 'cari_ortak', new.ortak_id, 'borc', new.tutar, 'ortak_hesabi_hareketleri', new.id, new.aciklama);
  end if;
  return new;
end;
$$;

create trigger defter_ortak_hesabi_sync
  after insert or delete on public.ortak_hesabi_hareketleri
  for each row execute function public.defter_ortak_hesabi_senkronize();

-- ============================================================
-- 4) kasa_transferleri → (kasa çıkış, alacak) + (kasa giriş, borç)
-- ============================================================
create or replace function public.defter_kasa_transferi_senkronize()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    delete from defter_kayitlari where kaynak_tablo = 'kasa_transferleri' and kaynak_id = old.id;
    return old;
  end if;

  insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
  values
    (new.tarih, 'kasa', new.cikis_kasa_id, 'alacak', new.tutar, 'kasa_transferleri', new.id, new.aciklama),
    (new.tarih, 'kasa', new.giris_kasa_id, 'borc', new.tutar, 'kasa_transferleri', new.id, new.aciklama);
  return new;
end;
$$;

create trigger defter_kasa_transferi_sync
  after insert or delete on public.kasa_transferleri
  for each row execute function public.defter_kasa_transferi_senkronize();

-- ============================================================
-- 5) cari_hesap_odemeleri → (kasa, alacak) + (cari_danisman, borç)
-- Danışmana ödeme yapılması — şirketin danışmana olan borcu azalır.
-- ============================================================
create or replace function public.defter_cari_hesap_odeme_senkronize()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    delete from defter_kayitlari where kaynak_tablo = 'cari_hesap_odemeleri' and kaynak_id = old.id;
    return old;
  end if;

  insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
  values
    (new.tarih, 'kasa', new.kasa_id, 'alacak', new.tutar, 'cari_hesap_odemeleri', new.id, new.aciklama),
    (new.tarih, 'cari_danisman', new.danisman_id, 'borc', new.tutar, 'cari_hesap_odemeleri', new.id, new.aciklama);
  return new;
end;
$$;

create trigger defter_cari_hesap_odeme_sync
  after insert or delete on public.cari_hesap_odemeleri
  for each row execute function public.defter_cari_hesap_odeme_senkronize();
