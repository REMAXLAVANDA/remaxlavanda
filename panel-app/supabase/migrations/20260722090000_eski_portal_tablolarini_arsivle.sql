-- ============================================================================
-- Eski portal/recruiting/Santral prototipinden kalma, mevcut React
-- uygulamasının HİÇ kullanmadığı tablolar — "public" şemasından "archive"
-- şemasına taşınıyor. Veri SİLİNMİYOR, sadece PostgREST API'sinden (Supabase
-- varsayılan olarak sadece "public" şemayı dışa açar) ve kod tabanından
-- görünmez hale geliyor. Geri almak gerekirse: alter table archive.X set
-- schema public;
--
-- Kod tabanında (src/, supabase/) bu tablolara HİÇBİR referans yok —
-- doğrulandı (grep). legacy_records de aynı kategoride: RLS'i daha önce
-- (ayrı bir security advisory sonrası) kapalıyken açılmıştı ama kod hiç
-- kullanmıyor, o da buraya taşınıyor.
-- ============================================================================

create schema if not exists archive;

alter table public.santral_calls set schema archive;
alter table public.leads set schema archive;
alter table public.assignments set schema archive;
alter table public.gd_leads set schema archive;
alter table public.recruiting_candidates set schema archive;
alter table public.danismanlar set schema archive;
alter table public.havuz set schema archive;
alter table public.danisman_notlar set schema archive;
alter table public.arayislar set schema archive;
alter table public.dis_portfolyo set schema archive;
alter table public.eslesmeler set schema archive;
alter table public.islem_log set schema archive;
alter table public.etkinlikler set schema archive;
alter table public.bilgi_merkezi set schema archive;
alter table public.timeline set schema archive;
alter table public.cagri_log set schema archive;
alter table public.dan_toplanti set schema archive;
alter table public.dan_egitim set schema archive;
alter table public.dan_memnuniyet set schema archive;
alter table public.dan_recruiting_katki set schema archive;
alter table public.skor_events set schema archive;
alter table public.skor_event_attendance set schema archive;
alter table public.gd_onboarding_progress set schema archive;
alter table public.training_programs set schema archive;
alter table public.training_modules set schema archive;
alter table public.training_attendance set schema archive;
alter table public.gd_badges set schema archive;
alter table public.app_credentials set schema archive;
alter table public.checklist_maddeler set schema archive;
alter table public.dan_ayrilis_progress set schema archive;
alter table public.legacy_records set schema archive;
