-- Takvim modülü FullCalendar entegrasyonuna geçerken katılım durumuna iki
-- yeni değer eklendi: 'gec' (geç katıldı) ve 'mazeretli'. Eski değerler
-- (davetli, onayladi, katildi, katilmadi) korunuyor, geriye dönük uyumlu.
--
-- Not: enum'a yeni değer eklemek Postgres'te ayrı bir migration/transaction
-- olarak yapılmalı (ADD VALUE aynı transaction içinde daha önce eklenmiş bir
-- enum'la birlikte kullanılamaz), bu yüzden bilinçli olarak ayrı dosyada.

alter type attendance_status add value if not exists 'gec';
alter type attendance_status add value if not exists 'mazeretli';
