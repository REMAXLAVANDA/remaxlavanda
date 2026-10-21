-- ============================================================================
-- Recruiting: durum değişikliğinde not zorunluluğu + "Beklemede" durumu
-- (broker kararı, 2026-10-21, "bilgisayardayım, uygula" onayıyla).
--
-- 1) Bir adayın durumu değiştirilirken en az 30 karakterlik bir
--    recruiting_candidate_notes kaydı ZORUNLU — sadece uygulama katmanında
--    değil, veritabanı seviyesinde de (biri API'den doğrudan not
--    eklemeden durum değiştirmeye kalksa bile engellenir). SADECE BUNDAN
--    SONRAKİ durum değişiklikleri için geçerli, geçmiş kayıtlara dokunmaz.
--    Trigger, durumun değiştiği güncellemeden hemen önceki 5 dakika
--    içinde eklenmiş, en az 30 karakterlik (boşluklar hariç) bir not
--    arar — panel akışı önce notu ekler, sonra durumu günceller, bu
--    yüzden pencere geniş tutuldu (yavaş bağlantı payı).
--
--    "Danışman Olarak Ekle" ve "Yeniden Aktifleştir" butonları da durum
--    değiştiriyordu ama not sormuyordu — bu ikisi bozulmasın diye kod
--    tarafında (Recruiting.jsx) otomatik, sistemin kendi yazdığı birer not
--    eklendi (aynı migration'a dahil değil, ayrı commit).
--
-- 2) Olumsuz sebebi "Diğer" seçilince ayrı bir "sebep açıklaması" alanı
--    (olumsuz_sebebi_aciklama) zorunlu — en az 30 karakter.
--
-- 3) Yeni 3 olumsuz sebebi eklendi (mevcutlar aynen kalıyor, sadece
--    CHECK constraint genişliyor — bkz. 20260928090000 ile aynı desen).
--
-- 4) "Beklemede, ileride tekrar aranacak" artık ayrı bir DURUM (olumsuz
--    sebebi değil) — seçilince tekrar_arama_tarihi zorunlu.
--
-- Hiçbir mevcut satır silinmiyor/değiştirilmiyor — sadece yeni sütun,
-- yeni seçenek ve yeni (sadece gelecekteki değişiklikleri etkileyen) bir
-- kural ekleniyor. Geri alınabilir: trigger ve constraint'ler DROP ile
-- kaldırılabilir, sütunlar veri kaybetmeden durur.
-- ============================================================================

alter table public.recruiting_candidates
  add column olumsuz_sebebi_aciklama text,
  add column tekrar_arama_tarihi date;

-- Durum listesine 'beklemede' eklendi.
alter table public.recruiting_candidates drop constraint recruiting_candidates_durum_check;
alter table public.recruiting_candidates
  add constraint recruiting_candidates_durum_check
  check (durum = any (array[
    'yeni_basvuru'::text, 'yanlis_basvuru'::text, 'ilk_gorusme'::text, 'ikinci_gorusme'::text,
    'olumlu'::text, 'olumsuz'::text, 'beklemede'::text
  ]));

-- Olumsuz sebebi listesine 3 yeni değer eklendi, eskiler aynen kalıyor.
alter table public.recruiting_candidates drop constraint recruiting_candidates_olumsuz_sebebi_check;
alter table public.recruiting_candidates
  add constraint recruiting_candidates_olumsuz_sebebi_check
  check (
    olumsuz_sebebi is null
    or olumsuz_sebebi = any (array[
      'maas_beklentisi', 'profile_uygun_degil', 'baska_emlak_ofisi', 'farkli_sektor_teklifi',
      'randevuya_gelmedi', 'kendi_istegiyle', 'diger',
      'deneyim_yetersiz', 'baska_teklif', 'iletisime_gecilemedi',
      'ulasilamadi', 'baslangic_masrafi_karsilamadi', 'yari_zamanli_istiyor'
    ]::text[])
  );

-- "Diğer" seçilince sebep açıklaması zorunlu, en az 30 karakter.
alter table public.recruiting_candidates
  add constraint recruiting_candidates_olumsuz_sebebi_aciklama_check
  check (
    olumsuz_sebebi is distinct from 'diger'
    or length(trim(coalesce(olumsuz_sebebi_aciklama, ''))) >= 30
  );

-- "Beklemede" seçilince tekrar arama tarihi zorunlu.
alter table public.recruiting_candidates
  add constraint recruiting_candidates_tekrar_arama_tarihi_check
  check (
    durum is distinct from 'beklemede'
    or tekrar_arama_tarihi is not null
  );

-- Durum değişikliğinde yakın zamanda eklenmiş, yeterince uzun bir not
-- arıyor. SECURITY DEFINER değil — recruiting_candidate_notes'u SADECE
-- okuyor (kendi koruduğu tabloyu değil, farklı bir tabloyu), RLS
-- recursion riski yok (bkz. CLAUDE.md RLS kontrol listesi madde 2).
create or replace function public.require_recruiting_status_note()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.durum is distinct from old.durum then
    if not exists (
      select 1 from public.recruiting_candidate_notes
      where candidate_id = new.id
        and created_at > now() - interval '5 minutes'
        and length(trim(not_metni)) >= 30
    ) then
      raise exception 'Durum değiştirilirken en az 30 karakterlik bir not eklenmelidir.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_require_recruiting_status_note
  before update on public.recruiting_candidates
  for each row execute function public.require_recruiting_status_note();
