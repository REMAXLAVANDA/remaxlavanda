-- ============================================================================
-- RE/MAX Lavanda Portal — Lig: skor kayıtlarına son güncelleme zamanı
--
-- score_entries dönem/tip başına TEK satır tutuyor (unique user_id+period_id
-- +type) — yeni bir ciro/memnuniyet girişi genelde var olan satırı UPDATE
-- ediyor, created_at bu yüzden "en son ne zaman güncellendi" sorusuna yanlış
-- cevap veriyordu (hep ilk girişin tarihinde kalıyor). updated_at + trigger
-- ekleniyor ki Panel'deki "Lig Durumu" widget'ı gerçek son güncelleme
-- zamanını gösterebilsin.
-- ============================================================================

alter table public.score_entries add column updated_at timestamptz not null default now();

create trigger trg_score_entries_updated_at
  before update on public.score_entries
  for each row execute function public.set_updated_at();
