-- "Yer Gösterme Belgesi" PDF'e çevrilirken tekrar tekrar "The object
-- exceeded the maximum allowed size" hatası veriyordu (boyut sınırı 25 MB'a
-- çıkarılmasına rağmen). Broker: "kaldıralım" — kök sebep netleşene kadar
-- şablon listeden pasife alındı, diğer şablonlar etkilenmiyor.
update public.document_templates set is_active = false where slug = 'yer-gosterme-belgesi';
