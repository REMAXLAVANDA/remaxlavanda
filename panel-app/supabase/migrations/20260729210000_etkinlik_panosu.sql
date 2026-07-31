-- Aylık Etkinlik Panosu (WhatsApp/TV için indirilebilir görsel) — hangi
-- etkinliklerin panoda gösterileceğini yönetici Yeni/Düzenle Etkinlik
-- formunda işaretliyor (bkz. brief: "yönetici sadece ... gibi etkinlikleri
-- seçecek"). calendar_events'e tek bir boolean yeterli — pano her zaman o
-- ayın işaretli etkinliklerini gösteriyor, ayrı bir "pano seçimi" tablosuna
-- gerek yok.
alter table public.calendar_events add column pano_goster boolean not null default false;
