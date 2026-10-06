-- ============================================================================
-- Recruiting Kaynak Raporu — tarih izleme + sorumlu alanı (2026-10-06)
--
-- Rapor "hangi tarihte ne işlem yapıldıysa o aya yazılsın" mantığıyla
-- çalışacak (broker kararı) — ama recruiting_candidates şu ana kadar bir
-- adayın HANGİ TARİHTE hangi aşamaya geçtiğini hiç tutmuyordu, sadece
-- "şu an hangi aşamada" biliniyordu. Bu migration 2 yeni (boşlukla
-- başlayan) tarih alanı + bunları OTOMATİK dolduran bir trigger ekliyor —
-- hiçbir yerde elle yazılmıyor, unutma riski yok. SADECE BUNDAN SONRAKİ
-- değişiklikler için çalışır; geçmişte zaten "Olumlu" vb. olmuş adayların
-- gerçek tarihi geriye dönük bilinemez (broker onayı: kabul edilebilir).
--
-- Ayrıca "sorumlu" alanı eklendi — mevcut atanan_danisman_id MENTOR
-- içindi (RE/MAX ağı danışmanı), recruiter (adayla fiilen görüşen broker/
-- owner/ofis) için uygun değildi, bu yüzden AYRI bir alan.
-- ============================================================================

alter table public.recruiting_candidates
  add column ilk_gorusme_tarihi timestamptz,
  add column sonuc_tarihi timestamptz,
  add column sorumlu_id uuid references public.users(id);

create index idx_recruiting_candidates_sorumlu on public.recruiting_candidates(sorumlu_id);

create or replace function public.stamp_recruiting_milestone_dates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- İlk kez görüşme aşamasına (veya ötesine) geçince, bir daha hiç
  -- değişmeyecek şekilde damgalanır — "görüşmeye kalan" ayı budur.
  if new.durum in ('ilk_gorusme', 'ikinci_gorusme', 'olumlu')
     and old.durum not in ('ilk_gorusme', 'ikinci_gorusme', 'olumlu')
     and new.ilk_gorusme_tarihi is null then
    new.ilk_gorusme_tarihi := now();
  end if;

  -- Sonuç (olumlu/olumsuz/yanlış başvuru) her belirlendiğinde damgalanır.
  if new.durum in ('olumlu', 'olumsuz', 'yanlis_basvuru')
     and old.durum is distinct from new.durum then
    new.sonuc_tarihi := now();
  end if;

  return new;
end;
$$;

create trigger trg_recruiting_milestone_dates
  before update on public.recruiting_candidates
  for each row execute function public.stamp_recruiting_milestone_dates();
