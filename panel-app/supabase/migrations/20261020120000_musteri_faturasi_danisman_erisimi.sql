-- Broker (2026-10-20): "danışman müşterisine kesilen faturayı görebilsin"
-- — finans bucket'ındaki ofis fatura dosyası sadece yükleyen (broker/
-- muhasebe) ve yönetim tarafından okunabiliyordu (bkz. migration
-- 20261011100000 finans_bucket_select). Danışman kendi işleminin (kendi
-- katılımcı olduğu ciro raporunun) satıcı/alıcı ofis faturasını da
-- görebilsin istendi — BAŞKA bir danışmanın faturasını GÖREMEZ, kontrol
-- ciro_raporu_katilimcilari üzerinden danisman_id = auth.uid() ile
-- yapılıyor. Mevcut finans_bucket_select politikası DEĞİŞTİRİLMEDİ,
-- ek bir permissive politika (OR mantığıyla birleşir) eklendi.
create policy finans_bucket_select_musteri_faturasi on storage.objects
  for select to authenticated
  using (
    bucket_id = 'finans'
    and public.is_active()
    and exists (
      select 1
      from public.ciro_raporu_katilimcilari k
      join public.ciro_raporlari r on r.id = k.ciro_raporu_id
      where k.danisman_id = (select auth.uid())
        and (r.ofis_fatura_satici_dosya_url = storage.objects.name or r.ofis_fatura_alici_dosya_url = storage.objects.name)
    )
  );
