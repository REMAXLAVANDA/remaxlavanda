-- 2026-10-13 broker onayı — Yönlendirme Durumu'ndaki "ilk 90 gün" kuralı
-- gerçek işe başlama tarihi yerine users.created_at (hesabın portala
-- kaydedildiği/toplu taşındığı tarih) kullanıyordu. Gerçek tarih zaten
-- mentor_primi_baslangic'te tutuluyor ("mentorluk başlangıcı = işe
-- başlama tarihi", broker netleştirmesi) ama bu tablo SADECE broker'a
-- okunabiliyordu (migration 20261008110000) — owner'ın da açtığı Takip/
-- atama ekranlarında Yönlendirme Durumu'nun doğru hesaplanması için
-- owner'a da SADECE OKUMA izni ekleniyor. Yazma (ekleme/değiştirme/
-- silme) hâlâ sadece broker'da (mentor_primi_baslangic_manage policy'si
-- dokunulmadı) — "sadece sen görürsün" (CreateUserModal) formdaki
-- yazma/düzenleme ekranı için geçerli, bu okuma izni ayrı.
create policy mentor_primi_baslangic_select_owner on public.mentor_primi_baslangic
  for select to authenticated
  using (
    (select is_active())
    and (select current_user_role()) = 'owner'
  );
