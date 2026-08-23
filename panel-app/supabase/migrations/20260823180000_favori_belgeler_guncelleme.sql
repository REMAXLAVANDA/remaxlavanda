-- ============================================================================
-- Broker isteği (2026-08-23): favori belge listesi değişti + "Danışmanlık ve
-- Yetki Belgesi" adı sadeleşiyor. Sadece document_templates tablosunda veri
-- güncellemesi (UPDATE) — hiçbir yeni tablo/kolon/politika yok.
--
-- Yeni favori liste (ekranda direkt kart olarak görünecek): Yetki Belgesi,
-- Bağlanma Parası Sözleşmesi (Alıcı), Cayma Parası Sözleşmesi (Satıcı),
-- Kira Sözleşmesi, Tahliye Taahhütnamesi. Eskiden favori olan Yer Gösterme
-- Belgesi, Teklif Formu, Hizmet Bedeli Protokolü (Alıcı/Satıcı) artık
-- "Diğer Belgeler" penceresine düşüyor.
-- ============================================================================

update public.document_templates set is_favorite = false;
update public.document_templates set is_favorite = true
  where slug in ('yetki-belgesi', 'baglanma-parasi-alici', 'cayma-parasi-satici', 'kira-sozlesmesi', 'tahliye-taahhutnamesi');

update public.document_templates set name = 'Yetki Belgesi' where slug = 'yetki-belgesi';
