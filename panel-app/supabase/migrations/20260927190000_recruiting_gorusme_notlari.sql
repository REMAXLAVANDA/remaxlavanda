-- ============================================================================
-- Recruiting: birikimli "Görüşme Notları" günlüğü (broker kararı, 2026-09-27):
-- "bir danışmanla yapılan görüşmelerin randevuların notlarını parça parça
-- ekleyelim, ne yaptı kaç görüşme yapıldı görülmeli" — mevcut tek satırlık
-- recruiting_candidates.aciklama her düzenlemede ÜZERİNE YAZILIYORDU, bu yeni
-- tablo YERİNE geçmiyor, EK bir append-only günlük: her randevu/temas için
-- ayrı bir satır, eskiler SİLİNMEDEN listeye ekleniyor. Kanban kartında ve
-- aday detayında "kaç görüşme yapıldığı" bu tablodaki satır sayısından
-- görünür.
--
-- Erişim recruiting_candidates ile AYNI (recruiting_manage RLS'i, sadece
-- broker/owner/ofis) — ama silme daha dar: ofis not ekleyebilir/görebilir
-- ama SADECE broker/owner silebilir (broker onaylı: "yanlışlıkla eklenmiş
-- bir notu sadece broker/owner silebilir").
-- ============================================================================

create table public.recruiting_candidate_notes (
  id           bigserial primary key,
  candidate_id bigint not null references public.recruiting_candidates (id) on delete cascade,
  not_metni    text not null,
  created_by   uuid references public.users (id),
  created_at   timestamptz not null default now()
);

create index idx_recruiting_notes_candidate on public.recruiting_candidate_notes (candidate_id, created_at desc);

alter table public.recruiting_candidate_notes enable row level security;

-- Görme + ekleme: recruiting_manage ile AYNI desen (broker/owner/ofis).
-- (select ...) sarmalaması BAŞTAN doğru yazıldı — bkz. migration
-- 20260927160000_rls_initplan_performans_duzeltmesi.sql (aynı hatayı
-- tekrarlamamak için).
create policy recruiting_notes_select on public.recruiting_candidate_notes
  for select to authenticated
  using ((select current_user_role()) = any (array['broker'::user_role, 'owner'::user_role, 'ofis'::user_role]));

create policy recruiting_notes_insert on public.recruiting_candidate_notes
  for insert to authenticated
  with check (
    (select current_user_role()) = any (array['broker'::user_role, 'owner'::user_role, 'ofis'::user_role])
    and created_by = auth.uid()
  );

-- Silme SADECE broker/owner — ofis yanlışlıkla eklediği bir notu kendi
-- başına silemesin, moderasyon broker/owner'da kalsın.
create policy recruiting_notes_delete on public.recruiting_candidate_notes
  for delete to authenticated
  using ((select current_user_role()) = any (array['broker'::user_role, 'owner'::user_role]));
