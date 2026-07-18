-- ============================================================================
-- Rehber kategorilerindeki çakışan sıra numaralarını düzelt
-- ============================================================================
-- BULUNAN HATA: supabase/seed/seed.sql başlangıçta 'docs' kategorilerini
-- sozlesme=1, iban=2, logo=3, hazir-metin=4 olarak oluşturmuştu. Daha sonra
-- 20260717150000_rehber_kategori_yonetimi.sql migration'ı "sirket-bilgileri"
-- ve "is-ortakliklari" kategorilerini EKLERKEN sort_order=2 ve sort_order=3
-- verdi — bunlar sırasıyla iban(2) ve logo(3) ile ÇAKIŞTI. sort_order
-- benzersiz olmadığı için ORDER BY sort_order tek başına eşit değerler
-- arasında kararlı bir sıra garanti etmiyordu — bu da Ayarlar > Kategori'de
-- "ilk ikisi değişmiyor" gibi kararsız/beklenmeyen sıralama davranışına yol
-- açtı (bkz. supabaseProvider.js'e eklenen ikinci created_at sıralama
-- anahtarı — o da bu sınıf hatayı gelecekte önler ama var olan çakışmayı
-- düzeltmez, bu migration onu yapıyor).
--
-- Düzeltme: mevcut altı kategoriyi kullanıcının Ayarlar'da gördüğü sırayla
-- (Sözleşmeler, Şirket Bilgileri, İş Ortaklıkları, IBAN, Logo & Marka,
-- Hazır Metinler) benzersiz 1..6 olarak yeniden numaralandırıyor.
-- ============================================================================

update public.categories set sort_order = 1 where module = 'docs' and key = 'sozlesme';
update public.categories set sort_order = 2 where module = 'docs' and key = 'sirket-bilgileri';
update public.categories set sort_order = 3 where module = 'docs' and key = 'is-ortakliklari';
update public.categories set sort_order = 4 where module = 'docs' and key = 'iban';
update public.categories set sort_order = 5 where module = 'docs' and key = 'logo';
update public.categories set sort_order = 6 where module = 'docs' and key = 'hazir-metin';
