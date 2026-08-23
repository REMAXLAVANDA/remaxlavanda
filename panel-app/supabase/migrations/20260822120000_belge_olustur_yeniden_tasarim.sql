-- ============================================================================
-- Belge Oluştur yeniden tasarımı (2026-08-22 broker isteği) — sözleşmeler
-- yenilendi, akış değişti: ofis ARTIK ana kullanıcı + tek PDF'e çevirme
-- yetkisi ofis'te; danışman dolduŕup gönderiyor ama çevirmeyi görmüyor;
-- danışman müşteriye link atarsa müşteri de girişsiz doldurabiliyor; broker/
-- owner sadece izleyici (oluşturmaz, çevirmez). Bu migration:
--
-- 1) document_instances.status'a 'sent' ekliyor (draft -> sent -> completed).
-- 2) document_instances'a müşteri linki için fill_token/fill_expires_at
--    ekliyor (download_token ile AYNI mantık, ayrı amaç: biri "PDF'i indir",
--    diğeri "girişsiz doldur").
-- 3) document_templates'e is_favorite ekliyor (ekranda direkt görünen az
--    sayıda "sık kullanılan" belge, gerisi açılır pencerede).
-- 4) document_instances select/update/delete politikalarını ofis rolünü de
--    kapsayacak şekilde genişletiyor — ŞU AN sadece dolduran + broker/owner
--    görebiliyor, ofis danışmanın/müşterinin gönderdiği kaydı görüp PDF'e
--    çeviremiyor. Aynı zamanda broker/owner'ı update/delete'ten çıkarıyor
--    ("sadece izleyici" — bkz. broker'ın 2026-08-22 talimatı), select'te
--    bırakıyor (izleme/gözetim).
--
-- Broker onayı: "bilgisayardayım uygula" (2026-08-22) — erişim genişleten
-- bir RLS değişikliği içerdiği için CLAUDE.md kuralı gereği bu ifade
-- alındıktan sonra uygulanıyor.
-- ============================================================================

alter table public.document_instances
  drop constraint document_instances_status_check;
alter table public.document_instances
  add constraint document_instances_status_check check (status in ('draft', 'sent', 'completed'));

alter table public.document_instances
  add column fill_token text unique,
  add column fill_expires_at timestamptz;
create index idx_document_instances_fill_token on public.document_instances (fill_token);

alter table public.document_templates
  add column is_favorite boolean not null default false;
update public.document_templates set is_favorite = true
  where slug in ('yetki-belgesi', 'yer-gosterme-belgesi', 'teklif-formu', 'baglanma-parasi-alici', 'kira-sozlesmesi', 'hizmet-bedeli-alici', 'hizmet-bedeli-satici');

drop policy document_instances_select on public.document_instances;
create policy document_instances_select on public.document_instances
  for select to authenticated
  using (public.is_active() and (created_by = auth.uid() or public.current_user_role() in ('broker', 'owner', 'ofis')));

drop policy document_instances_update on public.document_instances;
create policy document_instances_update on public.document_instances
  for update to authenticated
  using (public.is_active() and (created_by = auth.uid() or public.current_user_role() = 'ofis') and locked_at is null)
  with check (public.is_active() and (created_by = auth.uid() or public.current_user_role() = 'ofis'));

drop policy document_instances_delete on public.document_instances;
create policy document_instances_delete on public.document_instances
  for delete to authenticated
  using (public.is_active() and (created_by = auth.uid() or public.current_user_role() = 'ofis') and locked_at is null);
