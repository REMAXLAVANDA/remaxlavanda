-- Lead Havuzu -> Operasyon: "Danışmana Ata" artık Fırsat oluşturmuyor,
-- doğrudan bir Operasyon çağrısı açıyor (reklam bilgisiyle) — danışman
-- bu kişiyi diğer reklam çağrıları gibi işleyip (Görüşüldü/Portföy Alındı)
-- hazır olunca kendisi Fırsata çeviriyor (bkz. AI_NOTLARI.md). Lead
-- Havuzu'nun "Süreç Durumu" kolonu ve dönüştürülen kaydı bulma mantığı
-- (kaynak_lead_id ile ters tarama) call_logs'ta da çalışsın diye,
-- opportunities/recruiting_candidates'taki AYNI kolon buraya da ekleniyor.
alter table public.call_logs add column kaynak_lead_id bigint references public.leads (id);
create index idx_call_logs_kaynak_lead on public.call_logs (kaynak_lead_id);
