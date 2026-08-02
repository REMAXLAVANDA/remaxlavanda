-- GÜVENLİK: avatars_bucket_select politikası kaldırılıyor (Supabase
-- security advisor: public_bucket_allows_listing). avatars public bir
-- bucket (storage.buckets.public=true) — obje URL erişimi bu policy
-- olmadan da çalışır, public bucket'larda RLS'i zaten bypass eder. Bu
-- policy sadece storage.objects tablosunu SELECT ile SORGULAMAYI (yani
-- bucket'taki TÜM dosyaları listelemeyi) mümkün kılıyordu — gereksiz bir
-- veri ifşası riski.
--
-- Orijinal ekleme gerekçesi (20260722231500 migration'ı) "bazı Storage API
-- sürümleri upload sırasında authenticated'ten dahili bir SELECT
-- yapabiliyor" varsayımıydı — uygulamanın avatar upload akışı
-- (lib/storage.js uploadAvatarFile) upsert:false ve her yükleme için
-- benzersiz (Date.now() bazlı) path kullanıyor, "zaten var mı" kontrolüne
-- ihtiyaç duyan upsert:true deseni hiç kullanılmıyor — yani bu policy'nin
-- upload'u koruyan bir işlevi yoktu.

drop policy if exists avatars_bucket_select on storage.objects;
