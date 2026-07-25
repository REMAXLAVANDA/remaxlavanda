-- ============================================================================
-- Bulgu: ciro_musterileri_select RLS'i (bkz. 20260718200000) bir danışmanın
-- SADECE kendi girdiği müşterileri görmesine izin veriyor — bu doğru ve
-- korunuyor (mahremiyet: bir danışman başka danışmanın müşteri isimlerini
-- görmemeli). Ama Memnuniyet (Wilson skoru) sıralaması tarayıcıda, herkesin
-- bu ham veriden hesaplanan hakSayisi/alinanSayisi'sına bakarak hesaplanıyor
-- — danışman girişinde bu sayılar SADECE kendi verisi için doğru, diğer
-- herkes için sıfırlanmış gibi görünüyor, sıralama yanlış çıkıyor
-- (broker/owner/ofis herkesi görebildiği için onlarda doğru).
--
-- Düzeltme: list_user_activity() ile aynı desen — sadece TOPLAM sayıları
-- (müşteri ismi/detayı YOK) döndüren, RLS'i bypass eden bir fonksiyon.
-- Sıralama artık buradan besleniyor, mahremiyet bozulmuyor (isim dönmüyor).
-- ============================================================================

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
    group by cm.user_id, cm.period_id;
end;
$$;

grant execute on function public.list_musteri_review_counts() to authenticated;
