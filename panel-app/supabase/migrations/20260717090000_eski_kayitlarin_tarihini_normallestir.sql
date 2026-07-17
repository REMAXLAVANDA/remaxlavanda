-- ============================================================================
-- RE/MAX Lavanda Portal — eski kayıtların tarihini toplu normalleştirme
--
-- Kural: son 15 günün içindeki kayıtlara dokunulmaz; ondan eski "kayıt/
-- oluşturulma" tarihleri 01.01.2025 yapılır — böylece hiçbir eski/legacy
-- veri, tarih sıralı listelerde güncel verinin önüne geçmez.
--
-- SADECE "ne zaman girildi" tarihleri (created_at / uploaded_at / earned_at)
-- düzeltiliyor. "Dönüş yapıldı", "tamamlandı", "katılım cevaplandı" gibi
-- durum tarihlerine VE takvim etkinliklerinin kendi planlanan tarihine
-- (start_at/end_at) kasıtlı olarak dokunulmuyor — bunlar boşsa "henüz
-- olmadı" anlamına geliyor, doldurmak yanlış bilgi üretir; doluysa
-- kullanıcının bilerek seçtiği gerçek bir tarihtir.
-- ============================================================================

update public.call_logs
  set created_at = '2025-01-01T00:00:00Z'
  where created_at < now() - interval '15 days';

update public.opportunities
  set created_at = '2025-01-01T00:00:00Z'
  where created_at < now() - interval '15 days';

update public.calendar_events
  set created_at = '2025-01-01T00:00:00Z'
  where created_at < now() - interval '15 days';

update public.score_entries
  set created_at = '2025-01-01T00:00:00Z'
  where created_at < now() - interval '15 days';

update public.social_activity_log
  set created_at = '2025-01-01T00:00:00Z'
  where created_at < now() - interval '15 days';

update public.docs
  set created_at = '2025-01-01T00:00:00Z'
  where created_at < now() - interval '15 days';

update public.doc_versions
  set uploaded_at = '2025-01-01T00:00:00Z'
  where uploaded_at < now() - interval '15 days';

update public.user_badges
  set earned_at = '2025-01-01T00:00:00Z'
  where earned_at < now() - interval '15 days';
