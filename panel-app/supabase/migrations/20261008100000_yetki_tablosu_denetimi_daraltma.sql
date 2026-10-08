-- 2026-10-08 broker kararı (Ayarlar > Yetki tablosu denetimi): dört ayrı
-- yetkiyi daraltıyoruz. Hepsi NARROWING (bir rolü çıkarma), hiçbiri yeni
-- erişim açmıyor.
--
-- 1) Ciro TL girişi/silme: broker/owner/ofis -> broker/owner (ofis çıktı).
--    ciro_girisleri_select'e BİLEREK dokunulmadı — ofis hâlâ görüntüleyebilir,
--    sadece ekleme/silme/düzenleme kapandı. score_entries_manage/
--    social_activity_log_manage gibi PAYLAŞILAN fonksiyonlara da BİLEREK
--    dokunulmadı — aynı altyapı ofis'in sosyal medya girişinde kullanılıyor
--    (bkz. src/lib/dataProvider/supabaseProvider.js recomputeSocialTotal),
--    ciro_girisleri kendi başına ayrı/daha dar bir kapı zaten.
alter policy ciro_girisleri_manage on public.ciro_girisleri
  using (
    (select is_active())
    and (select is_manager())
  )
  with check (
    (select is_active())
    and (select is_manager())
  );

-- 2) Mazeret kabul/red (etkinlik katılım durumu düzeltme): broker/owner/ofis
--    -> broker/owner (ofis çıktı). 2026-10-04'teki "ofis'e 7 günlük düzeltme
--    hakkı" kararı, 2026-10-08'de broker tarafından bilinçli olarak geri
--    alındı.
alter policy event_attendance_update_manager on public.event_attendance
  using (
    (select is_active())
    and (
      (select current_user_role()) = 'broker'::user_role
      or (
        (select current_user_role()) = 'owner'::user_role
        and exists (
          select 1 from public.calendar_events ce
          where ce.id = event_attendance.event_id
            and coalesce(ce.end_at, ce.start_at) >= now() - interval '7 days'
        )
      )
    )
  )
  with check (
    (select is_active())
    and (
      (select current_user_role()) = 'broker'::user_role
      or (
        (select current_user_role()) = 'owner'::user_role
        and exists (
          select 1 from public.calendar_events ce
          where ce.id = event_attendance.event_id
            and coalesce(ce.end_at, ce.start_at) >= now() - interval '7 days'
        )
      )
    )
  );

-- 3) Rehber klasör (kategori) yönetimi: broker/owner -> sadece broker.
alter policy categories_manage on public.categories
  using ((select current_user_role()) = 'broker'::user_role)
  with check ((select current_user_role()) = 'broker'::user_role);

-- 4) Rehber doküman ekle/sil: broker/owner/ofis -> sadece broker. Metadata
--    tablolarıyla (docs/doc_versions) AYNI anda storage.objects'teki gerçek
--    dosya yükleme/silme izni de daraltılıyor — aksi halde owner/ofis
--    doküman kaydı oluşturamasa da dosyayı doğrudan storage'a yükleyebilirdi.
alter policy docs_manage on public.docs
  using ((select current_user_role()) = 'broker'::user_role)
  with check ((select current_user_role()) = 'broker'::user_role);

alter policy doc_versions_manage on public.doc_versions
  using ((select current_user_role()) = 'broker'::user_role)
  with check ((select current_user_role()) = 'broker'::user_role);

alter policy docs_bucket_insert on storage.objects
  with check (
    (bucket_id = 'docs'::text)
    and (select is_active())
    and (select current_user_role()) = 'broker'::user_role
  );

alter policy docs_bucket_update on storage.objects
  using (
    (bucket_id = 'docs'::text)
    and (select is_active())
    and (select current_user_role()) = 'broker'::user_role
  )
  with check (
    (bucket_id = 'docs'::text)
    and (select is_active())
    and (select current_user_role()) = 'broker'::user_role
  );

alter policy docs_bucket_delete on storage.objects
  using (
    (bucket_id = 'docs'::text)
    and (select is_active())
    and (select current_user_role()) = 'broker'::user_role
  );
