-- Yeni rol: "muhasebe" (broker, 2026-11-07: "muhasebe de açalım faturaları
-- kessin paraları kontrol etsin kesilen faturaları kontrol etsin şimdilik" —
-- sonra netleşti: "kontrol ettiğini de beyan etsin kontrol ettim
-- eşleştirmeleri yapsın. ben aylık son olarak incelemek istiyorum").
--
-- Bu dosya SADECE enum değerini ekliyor — ayrı bir migration olmak
-- ZORUNDA (Postgres: yeni bir enum değeri eklendiği transaction İÇİNDE
-- o değer kullanılamıyor, "unsafe use of new value" hatası verir).
-- Yetki/RLS değişiklikleri bir SONRAKİ migration'da (20261107080100).
alter type user_role add value 'muhasebe';
