-- ============================================================================
-- Lig Dönem Görünürlüğü (2026-09-02, broker spesifikasyonu)
--
-- Dönemin 3 hali: acik / kapali / aciklandi.
-- - Bitişe 7 gün kala OTOMATİK "kapali" olur (kimse düğmeye basmaz).
-- - "kapali": danışman VE ofis göremez. Broker/owner görür, skor girmeye
--   devam eder.
-- - Broker/owner "Sonuçları açıkla" der -> "aciklandi" olur, danışman o
--   dönemin TAM sıralamasını görür.
-- - Geçmiş (artık güncel olmayan) dönemlerde danışman/ofis SADECE KENDİ
--   satırını görür, sıralamayı/başkalarının puanını göremez — "aciklandi"
--   sadece GÜNCEL dönem için sıralamayı herkese açar, eski bir dönem
--   kalıcı olarak "aciklandi" kalsa bile yeni dönem başlayınca bu geniş
--   görünürlük otomatik kapanır (varsayım — broker'a soruldu, bkz. sohbet).
--
-- KRİTİK (broker'ın kendi uyarısı, Takvim genel türler hatası
-- 774b12a -> a100a37 emsali): sadece UI'da gizlemek YETMEZ, adresi bilen
-- (Supabase REST API'yi doğrudan çağıran) biri hâlâ görebilir. Bu yüzden
-- SADECE JS/JSX değil, RLS SEVİYESİNDE erişim kapatılıyor — kapalı bir
-- dönemde danışmana o dönemin verisi (score_entries/ciro_girisleri/
-- ciro_musterileri/social_activity_log/periods satırı) SUNUCUDAN HİÇ
-- DÖNMÜYOR, sadece ekranda gizlenmiyor.
--
-- ÇİFT KATMAN — cron'a bağımlı değil: durum kolonu her gece pg_cron ile
-- güncellenir (buton/ekran durumu senkron kalsın diye), AMA asıl erişim
-- kontrolü (RLS) durum kolonuna DEĞİL, period_effective_durum()
-- fonksiyonuna göre çalışır — bu fonksiyon tarihi CANLI hesaplar. Yani
-- cron bir gün çalışmasa/gecikse bile erişim kapanması gecikmez.
-- ============================================================================

-- 1) Dönem durumu kolonu
alter table public.periods
  add column if not exists durum text not null default 'acik'
  check (durum in ('acik', 'kapali', 'aciklandi'));

-- 2) Canlı hesaplanan efektif durum — durum kolonu 'acik' kalsa bile
--    bitişe <=7 gün kaldıysa 'kapali' sayılır.
create or replace function public.period_effective_durum(p_bitis date, p_durum text)
returns text
language sql
stable
as $$
  select case
    when p_durum = 'aciklandi' then 'aciklandi'
    when p_durum = 'kapali' then 'kapali'
    when p_bitis - current_date <= 7 then 'kapali'
    else 'acik'
  end
$$;

-- 3) "Bu dönem GÜNCEL sezon mu" (en son başlayan dönem) — geçmiş dönem
--    ayrımı için. Dönemler tarih aralığı çakışmasın diye zaten broker
--    tarafından sırayla açılıyor (bkz. 2026-09-01 kopya dönem temizliği).
create or replace function public.is_current_period(p_period_id uuid)
returns boolean
language sql
stable
as $$
  select p_period_id = (select id from public.periods order by baslangic desc limit 1)
$$;

-- 4) Bir dönemin KAPALI olup olmadığı (score dışındaki tablolar için —
--    bunlar zaten "aciklandi"da da mahrem kalıyor, sadece kapalı
--    penceresinde ek olarak kapanıyor).
create or replace function public.period_is_kapali(p_period_id uuid)
returns boolean
language sql
stable
as $$
  select public.period_effective_durum(p.bitis, p.durum) = 'kapali'
  from public.periods p
  where p.id = p_period_id
$$;

-- 5) Sıralama (score_entries) görünürlüğü — TEK yer, danışmanın "tam
--    sıralamayı" ne zaman gördüğü burada karar veriliyor.
create or replace function public.can_view_period_ranking(p_period_id uuid, p_row_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_bitis date;
  v_durum text;
  v_status text;
begin
  select bitis, durum into v_bitis, v_durum from public.periods where id = p_period_id;
  if v_bitis is null then
    return false;
  end if;

  if public.is_manager() then
    return true;
  end if;

  v_status := public.period_effective_durum(v_bitis, v_durum);

  if v_status = 'kapali' then
    return false;
  end if;

  if v_status = 'aciklandi' then
    -- Açıklanan dönem GÜNCEL sezon değilse (yeni dönem başlamışsa) artık
    -- herkese açık kalmaz, "geçmiş dönem" kuralına düşer.
    if public.is_current_period(p_period_id) then
      return true;
    end if;
    return p_row_user_id = auth.uid();
  end if;

  -- 'acik': sadece güncel sezon herkese açık.
  if public.is_current_period(p_period_id) then
    return true;
  end if;
  return p_row_user_id = auth.uid();
end;
$$;

grant execute on function public.period_effective_durum(date, text) to authenticated;
grant execute on function public.is_current_period(uuid) to authenticated;
grant execute on function public.period_is_kapali(uuid) to authenticated;
grant execute on function public.can_view_period_ranking(uuid, uuid) to authenticated;

-- 6) score_entries: herkes her şeyi görüyordu (using(is_active()) tek
--    şart), artık döneme göre.
drop policy if exists score_entries_select on public.score_entries;
create policy score_entries_select on public.score_entries
  for select to authenticated
  using (public.is_active() and public.can_view_period_ranking(period_id, user_id));

-- 7) ciro_girisleri: broker/owner her zaman; ofis + kendi satırı SADECE
--    kapalı DEĞİLKEN (kapalıyken ofis de göremez).
drop policy if exists ciro_girisleri_select on public.ciro_girisleri;
create policy ciro_girisleri_select on public.ciro_girisleri
  for select to authenticated
  using (
    public.is_active()
    and (
      public.is_manager()
      or (
        not public.period_is_kapali(period_id)
        and (user_id = auth.uid() or public.current_user_role() = 'ofis')
      )
    )
  );

-- 8) ciro_musterileri: mahrem müşteri isimleri — "aciklandi" bunu
--    GENİŞLETMİYOR (sadece score_entries'teki toplam sıralama açılıyor,
--    isim isim müşteri listesi değil). Sadece "kapalı" penceresinde ek
--    kısıtlama.
drop policy if exists ciro_musterileri_select on public.ciro_musterileri;
create policy ciro_musterileri_select on public.ciro_musterileri
  for select to authenticated
  using (
    public.is_active()
    and (
      public.is_manager()
      or (not public.period_is_kapali(period_id) and user_id = auth.uid())
    )
  );

-- 9) social_activity_log: aynı mantık.
drop policy if exists social_activity_log_select on public.social_activity_log;
create policy social_activity_log_select on public.social_activity_log
  for select to authenticated
  using (
    public.is_active()
    and (
      public.is_manager()
      or (not public.period_is_kapali(period_id) and user_id = auth.uid())
    )
  );

-- 10) periods tablosunun KENDİSİ — "using(true)" idi, yani danışman API'yi
--     doğrudan çağırırsa kapalı bir dönemin başlangıç/bitiş tarihini bile
--     görebiliyordu. Artık satırın kendisi de kapalıyken dönmüyor.
drop policy if exists periods_select on public.periods;
create policy periods_select on public.periods
  for select to authenticated
  using (
    public.is_manager()
    or public.period_effective_durum(bitis, durum) in ('acik', 'aciklandi')
  );

-- 11) "Sonuçları açıkla" broker VE owner'a açık (öncesinde sadece broker'a
--     açıktı) — dönem oluşturma/silme hâlâ sadece broker (app tarafında
--     canManagePeriods() değişmiyor), ama UPDATE (durum değişimi) ikisine
--     de serbest.
drop policy if exists periods_manage on public.periods;
create policy periods_manage on public.periods
  for all to authenticated
  using (public.current_user_role() in ('broker', 'owner'))
  with check (public.current_user_role() in ('broker', 'owner'));

-- 12) Otomatik kapama — SADECE durum kolonunu (ekran/buton senkronu için)
--     güncelliyor, erişim kontrolü zaten yukarıdaki RLS'te tarihe göre
--     canlı hesaplanıyor, bu job'a bağımlı değil.
create or replace function public.auto_close_periods()
returns void
language sql
security definer
set search_path = public
as $$
  update public.periods
  set durum = 'kapali'
  where durum = 'acik' and bitis - current_date <= 7;
$$;

select cron.schedule('lig-donem-otomatik-kapat', '0 3 * * *', $$select public.auto_close_periods()$$);
