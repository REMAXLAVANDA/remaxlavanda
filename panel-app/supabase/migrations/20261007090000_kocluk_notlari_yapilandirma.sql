-- ============================================================================
-- Koçluk Notları — raporlanabilir yapı (2026-10-07, broker onayı)
--
-- Serbest metin tek başına rapor üretemiyordu ("bu danışmana hangi konuda
-- kaç kere koçluk yapıldı, sonuç ne oldu" sorusu cevaplanamıyordu). Dört
-- yeni alan ekleniyor — eski hedef_aksiyon kolonu SİLİNMİYOR (sadece 4
-- satır var, hiçbiri dolu değil — risksiz ama yine de veri kaybı riski
-- almıyoruz), yeni kodda artık yazılmıyor/okunmuyor.
--
--   - konu: raporlama için basit kategori (serbest metnin YERİNE değil,
--     EK — "konuşulanlar" aynen kalıyor).
--   - portfoy_hedefi / portfoy_sayisi_o_an: HER görüşmede (konu ne olursa
--     olsun) tutulan, broker'ın özellikle istediği tek somut sayı. Sayı
--     o_an notu yazan tarafından elle girilmez — uygulama kodu o anki
--     gerçek portföy sayısını (opportunities, type=satici, status
--     acik/claimed, owner_id veya claimer_id=danışman) okuyup buraya
--     yazar; bir sonraki not girildiğinde "geçen hedef X'ti, şimdi Y" diye
--     kendiliğinden karşılaştırılabilir.
--   - sonuc: not "tamamlandı" yapılırken (broker'ın "abartı
--     detaylandırmayalım" isteği üzerine 3 basit değer).
-- ============================================================================

alter table public.coaching_notes
  add column konu text check (konu in ('toplanti_katilimi', 'lead_donus', 'portal_kullanimi', 'ciro', 'portfoy', 'genel')),
  add column portfoy_hedefi integer,
  add column portfoy_sayisi_o_an integer,
  add column sonuc text check (sonuc in ('gerceklesti', 'kismen', 'gerceklesmedi'));

-- Danışmanın kendi görünümü artık eski hedef_aksiyon yerine portföy
-- hedefini gösteriyor — aynı dar pencere deseni (sadece bu kolonlar,
-- konuşulanlar/sonuç/kim yazdı yok).
create or replace view public.coaching_note_hedefleri
with (security_invoker = false) as
select id, danisman_id, gorusme_tarihi, konu, portfoy_hedefi, portfoy_sayisi_o_an, takip_tarihi, durum
from public.coaching_notes
where portfoy_hedefi is not null
  and danisman_id = auth.uid()
  and (select public.is_active());
