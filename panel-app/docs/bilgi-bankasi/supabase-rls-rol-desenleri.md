# Supabase'de Rol Bazlı RLS İçin Önerilen Desenler

**Araştırma tarihi:** 2026-09-30

## Kısa Cevap
Supabase'in resmi belgeleri rol bazlı RLS için üç ana performans ilkesi
tanımlıyor: (1) `auth.uid()`/`auth.jwt()` gibi yardımcı fonksiyonları ve
özel rol kontrol fonksiyonlarını her zaman `(select ...)` içine sarmak
— bu, fonksiyonun satır başına değil sorgu başına bir kez çalışmasını
sağlıyor; (2) rol/yetki kontrolü gerektiren mantığı `SECURITY DEFINER`
fonksiyonlara taşımak (böylece o fonksiyon kendi içindeki tablo
sorgusunda RLS'e takılmaz); (3) politikalarda filtrelenen sütunlara
index eklemek. Bizim panelimiz bu üç ilkeyi de zaten uyguluyor — bu
araştırma, önceki iki RLS performans düzeltmemizin (2026-09-27) doğru
kalıba oturduğunu resmi kaynakla doğruladı.

## Temel Bulgular (kaynaklı)

- **`(select ...)` sarmalama:** Bir politika `auth.uid() = user_id`
  yerine `(select auth.uid()) = user_id` şeklinde yazılırsa, Postgres
  planlayıcısı bir `initPlan` oluşturup sonucu sorgu başına ÖNBELLEĞE
  alıyor — fonksiyon satır başına değil bir kez çalışıyor. Resmi
  benchmark'ta bu değişiklik `auth.uid()` için 179ms→9ms (%94.97),
  özel bir `is_admin()` fonksiyonu için 11.000ms→7ms (%99.94),
  `has_role()` için 178.000ms→12ms (%99.993) iyileşme sağlamış.
  [Kaynak: Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)

- **`SECURITY DEFINER` fonksiyonlar:** Rol/yetki kontrolü başka bir
  tabloya bakıyorsa (ör. `roles_table`), bu sorguyu `SECURITY DEFINER`
  bir fonksiyona taşımak, o fonksiyonun KENDİ İÇİNDEKİ sorgunun RLS
  kontrolünden muaf (bypass) çalışmasını sağlıyor — hem güvenli hem
  hızlı. Resmi uyarı: bu fonksiyonlar API'ye açık (exposed) şemaya
  KONULMAMALI. [Kaynak: Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security#use-security-definer-functions)

- **Index:** Politikada kullanılan ve zaten primary key/unique olmayan
  her sütuna index eklenmeli. Resmi benchmark'ta bu tek başına
  171ms→<0.1ms (%99.94) iyileşme sağlamış — tam bugün Lig modülünde
  kendi başımıza tespit edip uyguladığımız düzeltmeyle (`period_id`
  index'leri) birebir aynı desen. [Kaynak: Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security#add-indexes)

- **`TO authenticated` belirtmek:** Politikaya rol belirtilmezse
  (`to` ifadesi olmadan) Postgres, `anon` rolü için bile politika
  koşulunu değerlendirir — bu gereksiz yük. `to authenticated`
  eklemek, `anon` isteklerini politika hiç çalışmadan eleyerek
  170ms→<0.1ms iyileşme sağlıyor. [Kaynak: Supabase — RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

- **Join'lerden kaçınma:** Politika başka bir tabloyla join yapıyorsa,
  bunun yerine ilgili değerleri bir küme/array'e çekip `IN`/`ANY` ile
  karşılaştırmak, veya join'i bir `SECURITY DEFINER` fonksiyona
  taşımak öneriliyor — benchmark'ta 9.000ms→20ms (%99.78) iyileşme.
  [Kaynak: Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security#minimize-joins)

- **Her sorguya filtre eklemek:** RLS "örtük WHERE" gibi davransa da,
  istemci tarafında (JS client) ayrıca `.eq('user_id', userId)` gibi
  bir filtre eklemek Postgres'in daha iyi bir sorgu planı kurmasını
  sağlıyor — RLS'in YERİNE değil, RLS'e EK olarak. [Kaynak: Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security#add-filters-to-every-query)

## Bizim Panele Uygulanabilirlik: **Zaten büyük ölçüde uygun**

`current_user_role()`, `is_active()`, `is_manager()` fonksiyonlarını
koddan (`pg_proc`) inceledim:

```sql
CREATE FUNCTION public.current_user_role()
 RETURNS user_role
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$ select rol from public.users where id = auth.uid() and durum = 'aktif'; $$
```

- **Zaten uygun:** `SECURITY DEFINER` + `STABLE` + sabit `search_path`
  — resmi belgedeki "security definer fonksiyon" desenine birebir
  uyuyor. Bu fonksiyonlar tüm politikalarda `(select current_user_role())`
  şeklinde sarmalı çağrılıyor (bkz. 2026-09-27 tarihli iki RLS
  düzeltmesi, AI_NOTLARI.md) — resmi "call functions with select"
  önerisiyle birebir örtüşüyor.
- **Zaten uygun:** Politikalarımız `to authenticated` belirtiyor (bkz.
  migration dosyaları, ör. `for select to authenticated using (...)`)
  — resmi öneriyle örtüşüyor.
- **Zaten uygun (bugün düzeltildi):** Politikalarda filtrelenen
  sütunlara index — bugünkü Lig `period_id` düzeltmesi tam bu ilkeyi
  uyguladı, ama bu FK check'i RLS politikası değil (foreign key
  constraint check'iydi) — yine de aynı kök prensip (filtrelenen
  sütuna index) geçerli.
- **Farklı bir desen — [Görüş], acil değil:** Resmi belgeler rol
  bilgisini `auth.jwt()` üzerinden (JWT'nin `app_metadata`'sında)
  okumayı da bir ALTERNATİF olarak sunuyor — bu, `public.users`
  tablosuna hiç sorgu atmadan rolü JWT'den okumayı sağlar (teorik
  olarak biraz daha hızlı, çünkü tablo sorgusu bile gerekmez). Bizim
  yaklaşımımız (tablo sorgusu + security definer + select sarmalama)
  resmi benchmark'ta zaten mikrosaniyeler seviyesinde (~12ms→sonrasında
  daha da düşük) performans gösteriyor, bu yüzden JWT'ye geçiş ACİL bir
  ihtiyaç değil — ama `durum='aktif'` gibi SIK DEĞİŞEN bir alan zaten
  tabloda tutulduğu için JWT yaklaşımı burada pratik değil (JWT
  yenilenene kadar taze olmaz, resmi belgede de bu risk ayrıca
  belirtiliyor). Sonuç: mevcut tablo-tabanlı yaklaşım bizim için daha
  doğru, değişiklik önerilmiyor.

## Denetçilere Önerilen Kurallar (taslak — onaysız uygulanmadı)

- **kod-guvenlik-denetci için [Görüş]:** Yeni bir tablo/RLS politikası
  eklenirken kontrol listesi olarak resmi 5 ilke (select sarmalama,
  security definer, index, `to authenticated`, join'den kaçınma)
  kullanılabilir — bu proje zaten bu ilkelere uyuyor, yeni eklenen
  politikaların da aynı kalıba uyup uymadığını denetlerken referans
  olarak bu bulguyu kullansın.
- **veri-zinciri-analisti için not (uygulanmadı, sadece bilgi):**
  `current_user_role()`/`is_active()`/`is_manager()` deseni zaten
  resmi best-practice ile örtüşüyor — [İhlal]/[Sapma] değil, iyi
  örnek olarak not edilebilir.

## Kaynak Listesi
- [Supabase — Row Level Security (resmi belge)](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — RLS Performance and Best Practices (resmi troubleshooting belgesi)](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase — Database Advisor: Lint 0003_auth_rls_initplan (resmi belge)](https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0003_auth_rls_initplan)

**Not:** Bu araştırma `mcp__Supabase__search_docs` (resmi Supabase
belge arama aracı) ile yapıldı — kaynak önceliği listesindeki EN ÜST
tier (resmi belgeler), önceki iki araştırmadan farklı olarak ağ
erişim kısıtı sorunu yaşanmadı, doğrudan birincil kaynaktan alındı.
