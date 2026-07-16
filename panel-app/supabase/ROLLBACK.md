# Migration / Rollback Rehberi

Bu dosya `supabase/migrations/` altındaki her migration için: ne yaptığını,
geri alınıp alınamayacağını ve geri alma adımlarını listeler. Supabase CLI
migration'ları otomatik geri almaz (`supabase db reset` tüm veritabanını
sıfırdan kurar) — bu yüzden production'da bir migration'ı geri almak
gerekirse, aşağıdaki elle yazılmış rollback SQL'leri kullanılmalı.

Migration sırası (uygulama sırasıyla, değiştirilmemeli):

1. `20260715072704_init_schema.sql`
2. `20260715091035_attendance_status_extra_values.sql`
3. `20260715120000_active_user_enforcement.sql`
4. `20260715130000_storage_docs_bucket.sql`

---

## 1) `20260715072704_init_schema.sql`

**Ne yapar:** Tüm şemayı kurar — enum tipleri, `public.users` ve diğer 15
tablo, temel RLS policy'leri, `current_user_role()`/`is_manager()` yardımcı
fonksiyonları, `claim_opportunity()`/`get_opportunity_contact()` RPC'leri.

**Geri alınabilir mi:** Hayır, pratikte değil. Bu, temel şemadır — geri
almak tüm verinin silinmesi anlamına gelir. Production'da bu migration'ı
"geri almak" yerine, sorunlu kısmı düzelten YENİ bir migration yazılmalı
(bu proje boyunca izlenen yaklaşım budur — bkz. migration #3).

**Eğer gerçekten sıfırdan başlanacaksa (sadece dev/test ortamı):**
```sql
drop schema public cascade;
create schema public;
-- ardından tüm migration'lar ve seed yeniden çalıştırılır.
```

---

## 2) `20260715091035_attendance_status_extra_values.sql`

**Ne yapar:** `attendance_status` enum'ına `'gec'` ve `'mazeretli'` değerlerini
ekler.

**Geri alınabilir mi:** Kısmen. PostgreSQL enum'lardan değer SİLMEYİ
desteklemez (`DROP VALUE` yoktur). Geri almak için:

```sql
-- 1) Bu değerleri kullanan satır var mı kontrol et
select count(*) from public.event_attendance where status in ('gec', 'mazeretli');

-- 2) Varsa önce başka bir değere taşı (örn. 'katilmadi')
update public.event_attendance set status = 'katilmadi' where status in ('gec', 'mazeretli');

-- 3) Enum'ı yeniden oluştur (eski değerlerle) — DİKKAT: tüm bağımlı
--    kolonların tipini geçici olarak değiştirmek gerekir, aşağıdaki
--    Postgres'in standart "enum değeri silme" desenidir:
alter type attendance_status rename to attendance_status_old;
create type attendance_status as enum ('davetli', 'onayladi', 'katildi', 'katilmadi');
alter table public.event_attendance
  alter column status type attendance_status using status::text::attendance_status;
drop type attendance_status_old;
```

---

## 3) `20260715120000_active_user_enforcement.sql`

**Ne yapar:** `is_active()` fonksiyonunu ekler, `current_user_role()`'ü
`durum != 'aktif'` iken NULL dönecek şekilde günceller, 18 RLS policy'sini
`is_active()` kontrolüyle sarmalar, `calendar_events_select` /
`event_attendance_select` arasındaki RLS sonsuz döngü hatasını
(`is_invited_to_event()` / `is_event_creator()` yardımcı fonksiyonlarıyla)
düzeltir, `claim_opportunity()`/`get_opportunity_contact()` içine
`is_active()` kontrolü ekler.

**Geri alınabilir mi:** Evet — bu migration sadece fonksiyon/policy
TANIMLARINI değiştiriyor, veri şemasını değiştirmiyor. Geri almak için
önceki (init_schema.sql'deki) tanımları yeniden `create or replace` /
`create policy` ile uygulamak yeterli:

```sql
-- current_user_role()'ü eski haline döndür (durum kontrolü olmadan)
create or replace function public.current_user_role()
returns user_role
language sql stable security definer set search_path = public
as $$ select rol from public.users where id = auth.uid(); $$;

-- is_active(), is_invited_to_event(), is_event_creator() fonksiyonlarını sil
drop function if exists public.is_active();
drop function if exists public.is_invited_to_event(uuid);
drop function if exists public.is_event_creator(uuid);

-- Not: DROP FUNCTION önce o fonksiyonu kullanan policy'lerin DROP edilmesi
-- gerekir. init_schema.sql'deki orijinal 18 policy tanımını sırayla
-- yeniden çalıştırmak en güvenli yoldur.
```

**ÖNEMLİ UYARI:** Bu migration'ı geri almak, `durum='pasif'` kullanıcıların
tekrar veri görebilmesine yol açar — bu bilinen, kasıtlı olmayan bir
güvenlik regresyonudur. Sadece geçici hata ayıklama için, kısa süreliğine
ve mutlaka geri uygulanacağı bilinerek yapılmalı.

---

## 4) `20260715130000_storage_docs_bucket.sql`

**Ne yapar:** Private `docs` storage bucket'ı ve 4 RLS policy'si oluşturur.

**Geri alınabilir mi:** Evet:

```sql
drop policy if exists docs_bucket_select on storage.objects;
drop policy if exists docs_bucket_insert on storage.objects;
drop policy if exists docs_bucket_update on storage.objects;
drop policy if exists docs_bucket_delete on storage.objects;

-- Bucket'ı silmek İÇİNDEKİ TÜM DOSYALARI da siler — önce boşaltılmalı:
-- select storage.foldername(name) from storage.objects where bucket_id = 'docs';
delete from storage.objects where bucket_id = 'docs';
delete from storage.buckets where id = 'docs';
```

**NOT:** Bu migration yerel Postgres'te test EDİLEMEDİ (`storage.*` şemaları
sadece gerçek Supabase projesinde var) — PART-5B'de ilk uygulanacak migration
bu olmalı ve orada gerçek doğrulaması yapılmalı.

---

## Seed dosyası (`supabase/seed/seed.sql`)

**Rollback değil, "temizleme":** Seed dev-only veri eklediği için "geri
alma" değil "temizleme" kavramı geçerli. Aşağıdaki script seed'in eklediği
TÜM veriyi siler (sabit UUID'li 5 dev kullanıcısı dahil):

```sql
delete from public.doc_versions;
delete from public.docs;
delete from public.score_entries;
delete from public.periods where ad = '2026 - Dönem 2 (May-Ağu)';
delete from public.call_logs;
delete from public.onboarding_checklist_items;
delete from public.badges;
delete from public.education_modules;
delete from public.event_attendance;
delete from public.calendar_events;
delete from public.opportunities;
delete from public.categories;
delete from public.users where id in (
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005'
);
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005'
);
```

**İdempotency notu:** `seed.sql` artık birden fazla kez çalıştırılabilir
(PART-5A'da düzeltildi ve gerçek Postgres'e karşı 3 kez art arda
çalıştırılarak doğrulandı — satır sayıları hiç değişmedi). Önceden
`opportunities`, `calendar_events`, `education_modules`, `badges`,
`onboarding_checklist_items`, `call_logs`, `score_entries`, `docs`,
`doc_versions` tabloları için doğal bir "iş anahtarı" kontrolü yoktu, ikinci
çalıştırma satırları çoğaltıyordu — bu artık `where not exists (...)` /
mevcut `unique` kısıtları ile engelleniyor.
