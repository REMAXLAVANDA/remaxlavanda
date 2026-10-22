-- ============================================================================
-- Çağrı notu girilirken Görüşüldü/Ulaşılamadı durumu da zorunlu (broker
-- kararı, 2026-10-22, "hem ekranda hem veritabanında zorunlu kıl" onayı).
--
-- Sebep: lead dönüş oranı (Yönlendirme Puanı + Sağlık Skoru) sadece
-- donus_yapildi_mi alanına bakıyor, notlar'a hiç bakmıyor — danışman not
-- yazıp durumu işaretlemeyi unutunca gerçekte aranmış bir çağrı "dönüş
-- yapılmadı" gibi görünüyordu.
--
-- Kural SADECE "takip edilmesi gereken" çağrılarda geçerli — callLogs.js
-- callNeedsTracking() ile AYNI mantık burada SQL'e çevrildi: fırsata
-- dönüşmüş, portföy alınmış, ya da kaynağı Santral DIŞINDA bir şey.
-- Santral kaynaklı, hiçbir işleme dönüşmemiş "bilgi amaçlı" çağrılarda not
-- hâlâ serbestçe yazılabiliyor (broker: "santral bilgi amaçlı çağrılarda
-- not yine serbestçe yazılabilsin").
--
-- NOT VALID: broker onayıyla, mevcut 16 eski kayıt (Ağustos-Ekim arası, 6
-- danışmanda) bu kuralı zaten ihlal ediyor — migration bunları geriye
-- dönük DÜZELTMİYOR/SİLMİYOR, olduğu gibi duruyorlar. Sadece BUNDAN SONRA
-- o satırlardan biri tekrar güncellenmeye çalışılırsa (hangi alan olursa
-- olsun) kural o an devreye girer, danışman/ofis durumu işaretlemek
-- zorunda kalır.
-- ============================================================================

alter table public.call_logs
  add constraint call_logs_notlar_durum_gerekli_check
  check (
    not (
      (opportunity_id is not null or portfoy_alindi_mi is true or kaynak <> 'Santral')
      and notlar is not null and trim(notlar) <> ''
      and donus_yapildi_mi is null
    )
  ) not valid;
