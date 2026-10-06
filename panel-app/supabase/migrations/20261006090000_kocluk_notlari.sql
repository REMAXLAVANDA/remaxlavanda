-- ============================================================================
-- Koçluk Notları (2026-10-06, broker onayı)
--
-- Kaldırılan "Broker Notları"nın (hiç gerçek veriye bağlı olmayan, mock
-- veriden okuyan özellik) yerine — gerçek bir tablo, gerçek yetkilerle.
--
-- İki görünürlük:
--   - konusulanlar: SADECE broker/owner görür/yazar — ofis rolü (çağrı/
--     veri işleyen kişi) BİLEREK dışarıda bırakıldı, bu rolün genel
--     sınırıyla (sadece veri girer, yönetmez) tutarlı olsun diye
--     (2026-10-06 broker netleştirmesi: Selen owner, ofis ayrı bir kişi).
--   - hedef_aksiyon: danışmanın kendisi de görür — ama tam satıra değil,
--     aşağıdaki dar `coaching_note_hedefleri` görünümüne erişir (sadece
--     kendi id'si, sadece hedef_aksiyon dolu satırlar, sadece aktifken).
--
-- Not asla silinmez (DELETE RLS politikası YOK, Postgres varsayılan
-- olarak reddeder). Her ekleme/değişiklik, zaten kurulu olan genel
-- log_audit_event() trigger'ıyla audit_log'a düşer (aynı desen: users,
-- opportunities, score_entries).
-- ============================================================================

create table public.coaching_notes (
  id uuid primary key default gen_random_uuid(),
  danisman_id uuid not null references public.users(id),
  yazan_id uuid not null references public.users(id),
  gorusme_tarihi date not null default current_date,
  gorusme_turu text not null check (gorusme_turu in ('birebir', 'telefon', 'toplanti_sonrasi')),
  konusulanlar text not null,
  hedef_aksiyon text,
  takip_tarihi date,
  durum text not null default 'acik' check (durum in ('acik', 'tamamlandi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_coaching_notes_danisman on public.coaching_notes(danisman_id);
create index idx_coaching_notes_yazan on public.coaching_notes(yazan_id);
create index idx_coaching_notes_takip_tarihi on public.coaching_notes(takip_tarihi) where takip_tarihi is not null;

create trigger trg_coaching_notes_updated_at
  before update on public.coaching_notes
  for each row execute function public.set_updated_at();

create trigger trg_audit_coaching_notes
  after insert or update or delete on public.coaching_notes
  for each row execute function public.log_audit_event();

alter table public.coaching_notes enable row level security;

-- Sadece broker/owner okuyabilir/yazabilir/güncelleyebilir — DELETE
-- politikası hiç yok, yani kimse (broker dahil) bir notu silemez.
create policy coaching_notes_manage on public.coaching_notes
  for all
  using (
    (select public.is_active())
    and (select public.current_user_role()) = any (array['broker', 'owner']::user_role[])
  )
  with check (
    (select public.is_active())
    and (select public.current_user_role()) = any (array['broker', 'owner']::user_role[])
    and yazan_id = (select auth.uid())
  );

-- Danışmanın kendi "hedef/aksiyon"unu görebileceği dar pencere — geri kalan
-- (konuşulanlar, kim yazdı vb.) bu görünümde hiç yok. Görünüm, sahibi olan
-- (tablo sahibiyle aynı, RLS'i bypass eden) rolün yetkisiyle çalışır —
-- fırsat detayındaki "müşteri bilgisi gizle/göster" ile AYNI desen
-- (sunucu tarafında gerçek bir sınır, sadece arayüzde gizleme değil).
create view public.coaching_note_hedefleri
with (security_invoker = false) as
select id, danisman_id, gorusme_tarihi, hedef_aksiyon, takip_tarihi, durum
from public.coaching_notes
where hedef_aksiyon is not null
  and danisman_id = auth.uid()
  and (select public.is_active());

revoke all on public.coaching_note_hedefleri from public, anon;
grant select on public.coaching_note_hedefleri to authenticated;
