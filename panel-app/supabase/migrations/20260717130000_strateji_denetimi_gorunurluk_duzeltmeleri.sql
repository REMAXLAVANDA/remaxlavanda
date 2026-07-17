-- ============================================================================
-- RE/MAX Lavanda Portal — platform stratejisi denetimi: görünürlük düzeltmeleri
--
-- Strateji: admin (broker) her şeyi gözlemler; owner her şeyi takip eder;
-- ofis veri girer/yönlendirir; danışman kendine atananları + takvimi takip
-- eder ve ofis'in gücünden faydalanarak müşteriye hizmet verir.
--
-- Bu denetimde bulunan somut hata:
--
-- score_entries_select ve review_credits_select SADECE kendi satırını +
-- broker/owner'ı görmeye izin veriyordu. Ama Lig sayfası TÜM danışmanların
-- sıralamasını (1.-2.-3. ve ardışık fark) ve tüm danışmanların yorum hakkı
-- durumunu göstermek üzere tasarlandı — danışman prod ortamında kendi
-- satırından başka hiçbir şey GÖREMİYORDU, sıralama/yorum hakkı tabloları
-- ona boş/eksik görünüyordu. Mock modda bu fark edilmedi çünkü mock katman
-- RLS'i simüle etmiyor. Mutlak ciro değeri zaten UI'da hiç basılmıyor
-- (sadece ardışık fark) — satır görünürlüğünü herkese açmak güvenlik riski
-- değil, bu tasarımın zaten var olan bir parçası.
-- ============================================================================

drop policy if exists score_entries_select on public.score_entries;
create policy score_entries_select on public.score_entries
  for select to authenticated
  using (public.is_active());

drop policy if exists review_credits_select on public.review_credits;
create policy review_credits_select on public.review_credits
  for select to authenticated
  using (public.is_active());
