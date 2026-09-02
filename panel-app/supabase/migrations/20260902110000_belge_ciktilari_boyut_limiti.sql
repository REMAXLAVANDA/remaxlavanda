-- belge-ciktilari bucket boyut sınırı 10 MB -> 25 MB.
-- "PDF kaydedilemedi: The object exceeded the maximum allowed size"
-- hatası devam ediyor — geçici güvenlik payı olarak yükseltiliyor,
-- gerçek sebebi (bir önceki commit'teki teşhis logu) netleşince kesin
-- çözüme gidilecek.
update storage.buckets set file_size_limit = 26214400 where id = 'belge-ciktilari';
