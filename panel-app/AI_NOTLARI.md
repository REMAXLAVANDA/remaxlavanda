# AI Notları

Bu dosya, AI asistan (Claude) tarafından yapılan yapısal değişikliklerin kısa
bir günlüğüdür — brief'lerdeki "değişiklikleri buraya işle" kuralı gereği.

## 2026-07-26 — Lead Havuzu modülü

Yeni modül: reklam ve diğer kanallardan gelen lead'lerin tek yerde
toplanması/atanması/takibi. Sadece broker/owner/ofis erişebilir.

**Yeni dosyalar:**
- `supabase/migrations/20260726090000_lead_havuzu.sql` — `public.leads`
  tablosu (bigserial id, CHECK constraint'li `tip`/`kaynak`/`durum`), 3
  index, RLS (`leads_manage` — sadece broker/owner/ofis, danışman için
  ayrı select politikası yok).
- `src/lib/leads.js` — sabitler/etiketler, `isStaleLead()`,
  `computeAutoFields()` (ilk_temas_at/sonuc_at otomatik damgalama mantığı,
  client-side — `call_logs`'taki `donusAt`/`satisTarihi` ile aynı desen).
- `src/data/mockLeads.js` — mock seed verisi.
- `src/pages/Leads.jsx` — tek sayfa (tab yok), danışman için
  `<Navigate to="/panel" />` guard'ı.
- `src/components/leads/LeadTable.jsx`, `LeadFilters.jsx`,
  `LeadDetailModal.jsx` — create/edit için TEK modal (brief 3.5).

**Değiştirilen dosyalar:**
- `src/lib/roles.js` — `canManageLeads(role)` eklendi (broker/owner/ofis).
- `src/lib/modules.js` — `leads` modülü eklendi (`roles: [BROKER, OWNER,
  OFIS]`), Sidebar + Topbar başlığı buradan otomatik besleniyor.
- `src/App.jsx` — `/leads` route'u eklendi.
- `src/lib/dataProvider/{supabaseProvider,mockProvider,index}.js` — `leads`
  provider bloğu (`list/create/update`, silme YOK — bu fazın kapsamı dışı).

**Bu fazın DIŞINDA (brief madde 8):** Meta webhook/Edge Function otomatik
bağlantısı, lead durum geçmişi tablosu, raporlama/dönüşüm grafikleri,
danışman bildirimleri.

**Notlar/varsayımlar (kullanıcı onaylı):**
- Atanan danışman listesi: sadece `danisman` rolü, test hesabı hariç
  (uygulama genelindeki diğer listelerle tutarlı olsun diye).
- Uyarı çubuğu ("24 saattir aranmamış") sadece bu sayfada, local state —
  Panel'in "Dikkat Gerekiyor" bölümüne bağlanmadı.
- Detay paneli modal (brief'in ilk sürümü "sağ panel" diyordu, düzeltildi —
  projede sağ panel deseni yok, her yerde `Modal` bileşeni kullanılıyor).
