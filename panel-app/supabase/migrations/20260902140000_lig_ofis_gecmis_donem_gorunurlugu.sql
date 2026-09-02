-- Bug: "Lig Dönem Görünürlüğü" migration'ında (20260902090000) ofis'in
-- YAZMA erişimi (ciro_girisleri_manage / social_activity_log_manage /
-- ciro_musterileri_manage) is_current_period() kontrolü yapmadan, sadece
-- blackout'a bakıyordu — yani ofis geçmiş (güncel olmayan) döneme veri
-- girmeye devam edebiliyordu (doğru). AMA aynı verinin OKUMA/GÖRME
-- tarafı simetrik değildi:
--
--   - can_view_period_ranking() (score_entries + list_musteri_review_counts
--     için kullanılıyor): sadece is_manager() (broker/owner) tam görür;
--     ofis bu fonksiyonda hiç ayrı tutulmamış, "güncel olmayan dönem"
--     durumunda "sadece kendi satırı" kuralına düşüyor — ofis'in kendi
--     satırı olmadığı için (danışman değil) o dönem için HİÇBİR ŞEY
--     görmüyor.
--   - ciro_musterileri_select / social_activity_log_select: ofis'i hiç
--     ayrı tutmuyordu (ciro_girisleri_select'te bu satır zaten vardı,
--     buradan unutulmuş).
--
-- Sonuç: ofis, artık güncel olmayan (Mayıs-Ağu) döneme geçmişe dönük
-- doğru veri giriyor (yazma çalışıyor) ama girdiği veriyi o dönemde
-- kendisi göremiyor — sanki veri "kayboldu / yeni döneme gitti" gibi
-- görünüyor. Broker'ın 2026-09-02 raporu bu.
--
-- Fix: ofis'in GÖRME hakkını YAZMA hakkıyla simetrik yap — ofis, kendi
-- yazabildiği her şeyi (blackout olmayan her dönem, güncel olsun ya da
-- olmasın) görebilsin. Danışmanın "geçmiş dönemde sadece kendi satırını
-- görür" kuralı DEĞİŞMİYOR — bu sadece ofis'i is_manager() ile aynı geniş
-- görünürlüğe (blackout hariç) çıkarıyor.

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

  -- Ofis, yazabildiği her şeyi görebilsin (blackout hariç) — yazma
  -- politikalarıyla (ciro_girisleri_manage vb.) simetrik.
  if public.current_user_role() = 'ofis' and not public.period_is_blackout(p_period_id) then
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

-- ciro_musterileri_select ve social_activity_log_select: ofis için
-- ciro_girisleri_select'teki ile aynı ek şart eksikti, ekleniyor.
drop policy if exists ciro_musterileri_select on public.ciro_musterileri;
create policy ciro_musterileri_select on public.ciro_musterileri
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

drop policy if exists social_activity_log_select on public.social_activity_log;
create policy social_activity_log_select on public.social_activity_log
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
