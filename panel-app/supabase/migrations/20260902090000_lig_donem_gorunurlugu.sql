-- ============================================================================
-- Lig Dönem Görünürlüğü (2026-09-02, broker spesifikasyonu, sohbette
-- netleştirilen kararlarla birlikte)
--
-- Dönemin 3 hali: acik / kapali / aciklandi.
-- - Bitişe 7 gün kala OTOMATİK "kapali" olur (kimse düğmeye basmaz) —
--   SADECE güncel (en son başlayan) dönem için geçerli bir "kör yargılama"
--   penceresi.
-- - "kapali" (güncel dönem): danışman VE ofis hiçbir şey göremez (kendi
--   satırı dahil). Broker/owner görür + skor girmeye devam eder; ofis'in
--   giriş yetkisi de bu pencerede donuyor.
-- - Broker/owner "Sonuçları açıkla" der -> "aciklandi" olur, danışman o
--   dönemin TAM sıralamasını (score_entries) görür — bu KALICI, yeni
--   dönem başlasa bile daralmaz (broker onayı, 2026-09-02).
-- - "Açıklanmamış" geçmiş dönem (güncel değil, hiç 'aciklandi' olmamış):
--   danışman/ofis SADECE KENDİ satırını görür.
-- - Müşteri isimleri (ciro_musterileri) ve sosyal medya detay kaydı
--   (social_activity_log) "aciklandi"dan ETKİLENMEZ — o zaten mahrem
--   kalmaya devam ediyor (sadece toplam sıralama açılıyor), tek değişen
--   güncel dönemin "kapalı" penceresinde bunların da tamamen kapanması.
--
-- KRİTİK (broker'ın kendi uyarısı, Takvim genel türler hatası
-- 774b12a -> a100a37 emsali): sadece UI'da gizlemek YETMEZ, adresi bilen
-- (Supabase REST API'yi doğrudan çağıran) biri hâlâ görebilir. Bu yüzden
-- SADECE JS/JSX değil, RLS SEVİYESİNDE kapatılıyor.
--
-- ÇİFT KATMAN — cron'a bağımlı değil: durum kolonu her gece pg_cron ile
-- güncellenir (buton/ekran durumu senkron kalsın diye), AMA asıl erişim
-- kontrolü period_effective_durum()'a göre TARİHTEN CANLI hesaplanır —
-- cron bir gün gecikse/çalışmasa bile erişim kapanması gecikmez.
-- ============================================================================

-- 1) Dönem durumu kolonu
alter table public.periods
  add column if not exists durum text not null default 'acik'
  check (durum in ('acik', 'kapali', 'aciklandi'));

-- 2) Canlı hesaplanan efektif durum.
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

-- 3) "Bu dönem GÜNCEL sezon mu" (en son başlayan dönem).
create or replace function public.is_current_period(p_period_id uuid)
returns boolean
language sql
stable
as $$
  select p_period_id = (select id from public.periods order by baslangic desc limit 1)
$$;

-- 4) "Kör yargılama" penceresi — SADECE güncel dönem kapalıyken true.
--    Geçmiş bir dönem hiç açıklanmadan kapalıda kalmış olsa bile (yeni
--    dönem başladığı için artık "güncel" değil) bu false döner — o durum
--    "açıklanmamış geçmiş dönem" kuralına düşer (own-only, tam blackout
--    değil).
create or replace function public.period_is_blackout(p_period_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_current_period(p.id)
    and public.period_effective_durum(p.bitis, p.durum) = 'kapali'
  from public.periods p
  where p.id = p_period_id
$$;

-- 5) Sıralama (score_entries) görünürlüğü.
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
begin
  select bitis, durum into v_bitis, v_durum from public.periods where id = p_period_id;
  if v_bitis is null then
    return false;
  end if;

  if public.is_manager() then
    return true;
  end if;

  -- "aciklandi" KALICI — hangi dönem olursa olsun, ne zaman bakılırsa
  -- bakılsın tam sıralama açık (broker onayı, 2026-09-02).
  if v_durum = 'aciklandi' then
    return true;
  end if;

  if public.is_current_period(p_period_id) then
    return public.period_effective_durum(v_bitis, v_durum) = 'acik';
  end if;

  -- Açıklanmamış geçmiş dönem: sadece kendi satırı.
  return p_row_user_id = auth.uid();
end;
$$;

grant execute on function public.period_effective_durum(date, text) to authenticated;
grant execute on function public.is_current_period(uuid) to authenticated;
grant execute on function public.period_is_blackout(uuid) to authenticated;
grant execute on function public.can_view_period_ranking(uuid, uuid) to authenticated;

-- 6) score_entries: herkes her şeyi görüyordu (using(is_active()) tek
--    şart), artık döneme göre.
drop policy if exists score_entries_select on public.score_entries;
create policy score_entries_select on public.score_entries
  for select to authenticated
  using (public.is_active() and public.can_view_period_ranking(period_id, user_id));

drop policy if exists score_entries_manage on public.score_entries;
create policy score_entries_manage on public.score_entries
  for all to authenticated
  using (
    public.is_manager()
    or (public.current_user_role() = 'ofis' and not public.period_is_blackout(period_id))
  )
  with check (
    public.is_manager()
    or (public.current_user_role() = 'ofis' and not public.period_is_blackout(period_id))
  );

-- 7) ciro_girisleri: broker/owner her zaman; ofis + kendi satırı SADECE
--    güncel dönem kapalı DEĞİLKEN (kapalıyken ofis de giremez/göremez).
drop policy if exists ciro_girisleri_select on public.ciro_girisleri;
create policy ciro_girisleri_select on public.ciro_girisleri
  for select to authenticated
  using (
    public.is_active()
    and (
      public.is_manager()
      or (
        not public.period_is_blackout(period_id)
        and (user_id = auth.uid() or public.current_user_role() = 'ofis')
      )
    )
  );

drop policy if exists ciro_girisleri_manage on public.ciro_girisleri;
create policy ciro_girisleri_manage on public.ciro_girisleri
  for all to authenticated
  using (
    public.is_active()
    and (
      public.is_manager()
      or (public.current_user_role() = 'ofis' and not public.period_is_blackout(period_id))
    )
  )
  with check (
    public.is_active()
    and (
      public.is_manager()
      or (public.current_user_role() = 'ofis' and not public.period_is_blackout(period_id))
    )
  );

-- 8) ciro_musterileri: mahrem müşteri isimleri — "aciklandi" bunu
--    GENİŞLETMİYOR (sadece score_entries'teki toplam sıralama açılıyor).
--    Sadece güncel dönemin "kapalı" penceresinde ek kısıtlama.
drop policy if exists ciro_musterileri_select on public.ciro_musterileri;
create policy ciro_musterileri_select on public.ciro_musterileri
  for select to authenticated
  using (
    public.is_active()
    and (
      public.is_manager()
      or (not public.period_is_blackout(period_id) and user_id = auth.uid())
    )
  );

drop policy if exists ciro_musterileri_manage on public.ciro_musterileri;
create policy ciro_musterileri_manage on public.ciro_musterileri
  for all to authenticated
  using (
    public.is_active()
    and (
      public.is_manager()
      or (public.current_user_role() = 'ofis' and not public.period_is_blackout(period_id))
    )
  )
  with check (
    public.is_active()
    and (
      public.is_manager()
      or (public.current_user_role() = 'ofis' and not public.period_is_blackout(period_id))
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
      or (not public.period_is_blackout(period_id) and user_id = auth.uid())
    )
  );

drop policy if exists social_activity_log_manage on public.social_activity_log;
create policy social_activity_log_manage on public.social_activity_log
  for all to authenticated
  using (
    public.is_active()
    and (
      public.is_manager()
      or (public.current_user_role() = 'ofis' and not public.period_is_blackout(period_id))
    )
  )
  with check (
    public.is_active()
    and (
      public.is_manager()
      or (public.current_user_role() = 'ofis' and not public.period_is_blackout(period_id))
    )
  );

-- 10) periods tablosunun KENDİSİ — "using(true)" idi, yani danışman API'yi
--     doğrudan çağırırsa güncel kapalı dönemin başlangıç/bitiş tarihini
--     bile görebiliyordu. Sadece güncel+kapalı dönem satırı gizleniyor;
--     geçmiş dönemler (açıklanmış olsun olmasın) satır olarak görünür
--     kalır — "kendi sonucu" bağlamı için dönem adı/aralığı gerekebilir,
--     ayrıca artık "sürpriz" kaygısı geçmiş bir dönem için geçerli değil.
drop policy if exists periods_select on public.periods;
create policy periods_select on public.periods
  for select to authenticated
  using (public.is_manager() or not public.period_is_blackout(id));

-- 11) "Sonuçları açıkla" broker VE owner'a açık (öncesinde sadece
--     broker'a açıktı) — dönem oluşturma UI'da hâlâ sadece broker
--     (app tarafında canManagePeriods() değişmiyor), ama bu RLS ikisine
--     de serbest (UPDATE/announce dahil).
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

-- 13) list_musteri_review_counts() SECURITY DEFINER olduğu için
--     ciro_musterileri'nin RLS'ini bypass ediyordu — yani Memnuniyet
--     sıralaması (hak/alınan sayısı, isim olmadan) yukarıdaki RLS
--     değişikliklerine RAĞMEN kapalı dönemde sızmaya devam ederdi. Bu
--     RPC de aynı can_view_period_ranking kuralına tabi kılınıyor
--     (tam olarak broker'ın uyardığı "sadece bir yeri kapat, diğerini
--     unut" hatası — bu RPC unutulmasın diye ayrıca burada).
create or replace function public.list_musteri_review_counts()
returns table (user_id uuid, period_id uuid, hak_sayisi bigint, alinan_sayisi bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active() then
    return;
  end if;

  return query
    select cm.user_id, cm.period_id, count(*)::bigint, count(*) filter (where cm.alindi_mi)::bigint
    from public.ciro_musterileri cm
    where public.can_view_period_ranking(cm.period_id, cm.user_id)
    group by cm.user_id, cm.period_id;
end;
$$;
