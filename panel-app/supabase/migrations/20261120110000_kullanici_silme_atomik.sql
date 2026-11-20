-- /kurul, 2026-11-20 (veri-zinciri-analisti, YAYINA ENGEL): kullanıcı silme
-- işlemi (delete-user edge function) 11 ayrı veritabanı adımıyla
-- çalışıyordu — biri hata verse bile öncekiler GERİ ALINMIYORDU. Ayrıca
-- edge function yazıldığından sonra eklenen birçok tabloda ("kim yaptı"
-- ve "kimin hesabı/geçmişi" alanları) hiç temizleme yoktu — bu yüzden
-- gerçek işlem geçmişi olan bir danışmanı silmeye çalışmak, önceki
-- atamaları (fırsat/çağrı/lead) sessizce boşaltıp SONRA hata verebiliyordu.
--
-- Bu fonksiyon hepsini TEK bir veritabanı işlemine (transaction) alıyor:
-- içindeki adımlardan biri hata verirse HİÇBİRİ uygulanmaz, hiçbir şey
-- yarıda kalmaz. İki gruba ayrıldı:
--
-- 1) Finansal/kayıt geçmişi olan alanlar (kimin parası/komisyonu/anlaşması
--    olduğu bilgisi) BOŞALTILMIYOR — bunlar varsa silme işlemi başında
--    açık bir hatayla durduruluyor: "önce pasif yap" deniyor. Bu alanlar
--    zaten çoğu yerde veritabanı seviyesinde NOT NULL (boşaltılamaz),
--    ciro_raporu_katilimcilari.danisman_id ve islem_masraflari.danisman_id
--    ise teknik olarak boşaltılabilir ama "kimin komisyonu/masrafı"
--    bilgisini kaybetmek finansal geçmişi bozar, bu yüzden bilinçli olarak
--    bu gruba eklendi.
-- 2) Sadece "kim yaptı/kim girdi" türü iz bırakan alanlar (ör. kim
--    eşleştirdi, kim not aldı) — kayıt kalıyor, sadece kim yaptığı bilgisi
--    boşalıyor. Edge function'daki ESKİ 11 adım + o zamandan beri eklenen
--    ve hiç kapsanmamış tüm benzer alanlar.
-- Yetki notu: bu fonksiyon SADECE delete-user edge function'ından
-- service_role anahtarıyla çağrılıyor — o fonksiyon broker/owner
-- kontrolünü ve "kendi hesabını silemezsin" kontrolünü ZATEN kendi
-- içinde yapıyor (gerçek kullanıcı oturumunu doğrulayıp). Edge function
-- service_role ile çağırdığında auth.uid() boş gelir (kullanıcıya özel
-- oturum yok), bu yüzden burada auth.uid() bazlı bir yetki kontrolü
-- YANLIŞ olurdu — ya hep hata verir ya da hiç anlamlı kontrol etmez.
-- Bunun yerine PUBLIC/authenticated'den yetki tamamen geri alınıp SADECE
-- service_role'e veriliyor (aşağıda) — normal bir oturumdan bu fonksiyon
-- hiç çağrılamaz.
create or replace function public.delete_user_cleanup(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if exists (select 1 from cari_hareketler where danisman_id = p_user_id)
     or exists (select 1 from cari_hesap_odemeleri where danisman_id = p_user_id)
     or exists (select 1 from danisman_anlasmalari where danisman_id = p_user_id)
     or exists (select 1 from coaching_notes where danisman_id = p_user_id or yazan_id = p_user_id)
     or exists (select 1 from ciro_raporlari where olusturan_id = p_user_id)
     or exists (select 1 from ciro_raporu_katilimcilari where danisman_id = p_user_id)
     or exists (select 1 from islem_masraflari where danisman_id = p_user_id)
     or exists (select 1 from document_instances where created_by = p_user_id)
     or exists (select 1 from genel_giderler where created_by = p_user_id)
     or exists (select 1 from kasa_transferleri where created_by = p_user_id)
     or exists (select 1 from ortak_hesabi_hareketleri where created_by = p_user_id or ortak_id = p_user_id)
     or exists (select 1 from tedarikci_odemeleri where created_by = p_user_id)
     or exists (select 1 from harita_manuel_kayitlar where ekleyen_id = p_user_id)
  then
    raise exception 'Bu kişinin finans/kayıt geçmişi var, bu yüzden silinemez. Önce pasif yap.';
  end if;

  -- Fırsatlar: kayıt silinmiyor, sadece "kime ait" alanı boşalıyor. "claimed"
  -- durumundaki bir fırsatın sahibi ayrılırsa havuza geri düşsün diye status
  -- da 'acik'ya, claimed_at da null'a çekiliyor.
  update opportunities set owner_id = null where owner_id = p_user_id;
  update opportunities
    set claimer_id = null, claimed_at = null, status = 'acik'
    where claimer_id = p_user_id and status = 'claimed';
  update opportunities set claimer_id = null where claimer_id = p_user_id and status <> 'claimed';
  update opportunities set closed_by = null where closed_by = p_user_id;
  update opportunities set onceki_sahip_id = null where onceki_sahip_id = p_user_id;

  -- Çağrı kayıtları, lead havuzu, recruiting atamaları: kayıt kalıyor,
  -- sadece atama boşalıyor.
  update call_logs set assigned_to = null where assigned_to = p_user_id;
  update call_logs set onceki_sahip_id = null where onceki_sahip_id = p_user_id;
  update leads set atanan_danisman_id = null where atanan_danisman_id = p_user_id;
  update recruiting_candidates set atanan_danisman_id = null where atanan_danisman_id = p_user_id;
  update recruiting_candidates set sorumlu_id = null where sorumlu_id = p_user_id;
  update recruiting_candidate_notes set created_by = null where created_by = p_user_id;

  -- Rehber (dokümanlar), audit log, kararlar, takvim ve "kim girdi/kim
  -- onayladı/kim eşleştirdi" türü iz alanları: kayıt kalıyor, sadece kim
  -- yaptığı bilgisi boşalıyor.
  update docs set created_by = null where created_by = p_user_id;
  update doc_versions set uploaded_by = null where uploaded_by = p_user_id;
  update audit_log set actor_id = null where actor_id = p_user_id;
  update onboarding_checklist_status set done_by = null where done_by = p_user_id;
  update score_entries set entered_by = null where entered_by = p_user_id;
  update ciro_musterileri set entered_by = null where entered_by = p_user_id;
  update ciro_girisleri set entered_by = null where entered_by = p_user_id;
  update social_activity_log set entered_by = null where entered_by = p_user_id;
  update event_attendance set mazeret_reviewed_by = null where mazeret_reviewed_by = p_user_id;
  update calendar_events set creator_id = null where creator_id = p_user_id;
  update kararlar set created_by = null where created_by = p_user_id;
  update kararlar set karar_alan_id = null where karar_alan_id = p_user_id;
  update banka_hareketleri set olusturan_id = null where olusturan_id = p_user_id;
  update banka_hareketleri set eslestiren_id = null where eslestiren_id = p_user_id;
  update banka_hareketleri set teyit_eden_id = null where teyit_eden_id = p_user_id;
  update ciro_raporlari set muhasebe_tamamlayan_id = null where muhasebe_tamamlayan_id = p_user_id;
  update ciro_raporlari set onaylayan_id = null where onaylayan_id = p_user_id;
  update ciro_raporu_katilimcilari set teyit_eden_id = null where teyit_eden_id = p_user_id;
  update emanet_hareketleri set created_by = null where created_by = p_user_id;
  update emanet_hareketleri set islemi_yapan_id = null where islemi_yapan_id = p_user_id;
  update emanetler set created_by = null where created_by = p_user_id;
  update islem_masraflari set created_by = null where created_by = p_user_id;
  update harita_manuel_kayitlar set danisman_id = null where danisman_id = p_user_id;
end;
$$;

revoke all on function public.delete_user_cleanup(uuid) from public;
grant execute on function public.delete_user_cleanup(uuid) to service_role;
