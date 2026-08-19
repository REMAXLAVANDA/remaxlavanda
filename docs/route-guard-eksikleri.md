# Route Guard Eksikleri — Tespit Raporu

**Tarih:** 2026-08-16
**Kapsam:** Sadece tespit. Hiçbir route, RLS politikası veya uygulama kodu değiştirilmedi.
**Yöntem:** `panel-app/src/App.jsx`'teki TÜM route tanımları tek tek çıkarıldı; her route'un hedeflediği sayfa bileşeni açılıp (a) route/sayfa seviyesinde bir rol kontrolü (`Navigate` ile yönlendirme veya kilit ekranı) var mı, (b) o route'a menüde/iş mantığında rol bazlı bir erişim kısıtı **beklenip beklenmediği** (`lib/modules.js`, `lib/kartvizit.js`, `lib/roles.js` içindeki tanımlarla) karşılaştırıldı.

---

## 1. Tam Route Listesi ve Guard Durumu

`panel-app/src/App.jsx:64-105`'teki tüm route'lar:

| Route | Bileşen | Menüde beklenen erişim | Route/sayfa seviyesi guard | Durum |
|---|---|---|---|---|
| `/login` | `Login` | Herkese açık (public), giriş yapılmadan erişilir | Guard gerekmiyor (kasıtlı public) | Gap değil |
| `/k/:userId` | `KartvizitPublic` | Herkese açık (public), dijital kartvizit paylaşım linki | Guard gerekmiyor (kasıtlı public) | Gap değil |
| `/pano` | `Pano` | Menüde hiç yer almıyor (Sidebar/ProfileMenu'de link yok, sadece direkt URL ile — ofis TV'si) | Sadece `ProtectedRoute` (oturum var mı), rol kontrolü yok | **Bkz. §3 — gap değil, gerekçeli** |
| `/panel` | `Panel` | `ALL_ROLES` (`modules.js:36`) | Yok, gerekmiyor | Gap değil |
| `/firsatlar` | `Firsatlar` | `ALL_ROLES` (`modules.js:45`) | Yok, gerekmiyor | Gap değil |
| `/takvim` | `Takvim` (→ TakvimTab+GorevlerTab) | `ALL_ROLES` (`modules.js:78`) | Yok, gerekmiyor | Gap değil |
| `/gorevler` | `Takvim` (aynı bileşen) | `ALL_ROLES` | Yok, gerekmiyor | Gap değil |
| `/operasyon` | `Firsatlar` (aynı bileşen) | `ALL_ROLES` | Yok, gerekmiyor | Gap değil |
| `/leads` | `Leads` | **`LEADS_ROLES`** = broker/owner (`modules.js:56`) | **VAR** — `Leads.jsx:244`: `if (!canManageLeads(role)) return <Navigate to="/panel" replace />` | Guard mevcut |
| `/recruiting` | `Recruiting` | **`MANAGE_ROLES`** = broker/owner/ofis (`modules.js:67`) | **VAR** — `Recruiting.jsx:161`: `if (!canManageRecruiting(role)) return <Navigate to="/panel" replace />` | Guard mevcut |
| `/takip` | `Takip` (→ TakipTab+EgitimTab) | `ALL_ROLES` (`modules.js:91`) — sayfa herkese açık, içerik role göre uyarlanıyor | Yok, gerekmiyor (içerik zaten TakipTab/EgitimTab içinde role göre filtreleniyor) | Gap değil |
| `/egitim` | `Takip` (aynı bileşen) | `ALL_ROLES` | Yok, gerekmiyor | Gap değil |
| `/lig` | `Lig` | `ALL_ROLES` (`modules.js:100`) | Yok, gerekmiyor | Gap değil |
| `/rehber` | `Rehber` | `ALL_ROLES` (`modules.js:109`) | Yok, gerekmiyor | Gap değil |
| `/kartvizitim` | `Kartvizitim` | **`KARTVIZIT_ROLES`** = broker/owner/danışman (`kartvizit.js:19`) — **ofis kasıtlı olarak hariç** | **YOK** — dosyanın tamamında `role`/`Navigate` ile yapılan hiçbir kontrol yok | **TESPİT EDİLEN GAP** |
| `/ayarlar` | `Ayarlar` | `canManageUsers` = broker/owner (`roles.js`, `ProfileMenu.jsx:78`) | **VAR** — `Ayarlar.jsx:332-340`: `canManage` false ise kilit ekranı (yönlendirme değil, erişim engelleyen ayrı bir ekran) | Guard mevcut |
| `*` (bilinmeyen path) | → `/panel`'e yönlendirme | — | `Navigate to="/panel"` | Gap değil (davranış kasıtlı) |

---

## 2. Tespit Edilen Gerçek Boşluk

### `/kartvizitim` — Route guard YOK, beklenen erişim kısıtı uygulanmıyor

**Beklenen davranış:** `panel-app/src/lib/kartvizit.js:17-22`:
```js
// Rol bazlı: kartvizit sadece fiilen müşteriyle muhatap olan roller için
// anlamlı — ofis (sadece veri girişi yapan personel) hariç tutuluyor.
export const KARTVIZIT_ROLES = [ROLES.BROKER, ROLES.OWNER, ROLES.DANISMAN]
export function hasKartvizit(role) {
  return KARTVIZIT_ROLES.includes(role)
}
```
Bu, **açık ve kasıtlı bir iş kuralı**: ofis rolünün dijital kartvizit özelliğine erişimi olmaması gerekiyor. Bu kural sadece menü linkinin gizlenmesinde uygulanıyor: `panel-app/src/components/layout/ProfileMenu.jsx:66` — `hasKartvizit(role)` false ise "Kartvizitim" linki menüde hiç gösterilmiyor.

**Gerçek durum:** `panel-app/src/pages/Kartvizitim.jsx` dosyasının tamamında `role` değişkeni hiçbir yerde erişim kontrolü için okunmuyor (dosyada `role` sadece `profile.role` şeklinde, kartvizit kartına basılacak unvanı belirlemek için bir veri alanı olarak geçiyor — bir yetki kontrolü değil). `App.jsx`'te de `/kartvizitim` route'u sadece genel `ProtectedRoute` (oturum var mı) şemsiyesi altında, ayrıca bir rol kontrolü yok.

**Sonuç:** Bir ofis kullanıcısı, menüde linki görmese bile tarayıcı adres çubuğuna `#/kartvizitim` yazarak sayfayı doğrudan açabilir. Sayfa normal şekilde render olur, kendi profil bilgilerini (telefon, sosyal medya linkleri, avatar) görüntüleyip düzenleyebilir ve kaydedebilir.

**Bunu neyin sınırladığı / sınırlamadığı:** Veri tabanı seviyesinde (RLS) bu işlemi engelleyen bir kural da yok — `users_update_self_or_broker` politikası (`panel-app/supabase/migrations/20260716230000_owner_can_manage_users.sql:14-17`) `auth.uid() = id` şartıyla her aktif kullanıcının **kendi** satırını güncellemesine izin veriyor, rol ayrımı yapmıyor. Yani hem UI hem RLS seviyesinde ofis'in kendi kartvizitini düzenlemesini engelleyen hiçbir mekanizma yok — sadece "iş kuralı" (`KARTVIZIT_ROLES`) menü linkini gizliyor.

**Kapsam/ciddiyet notu:** Bu bir veri sızıntısı değil (kullanıcı sadece **kendi** profilini görüp düzenleyebiliyor, başkasının verisine erişmiyor) — ama tanımlanmış bir iş kuralının (ofis'in bu özelliği kullanmaması gerektiği) hem UI hem RLS seviyesinde fiilen uygulanmadığı, sadece menüden gizlendiği bir tutarsızlıktır.

---

## 3. İncelenip "Gap Değil" Olarak Sınıflandırılan `/pano`

`/pano` route'u hiçbir rol kontrolü içermiyor (`Pano.jsx` dosyasının tamamında `role`/`useAuth`/`Navigate` referansı sıfır). Ancak bunu bir "eksik" olarak listelemedim, çünkü:

1. **Menüde hiç yer almıyor** — `Sidebar.jsx`, `ProfileMenu.jsx`, `MobileBottomNav.jsx` dahil hiçbir navigasyon bileşeninde `/pano`'ya bir link yok (grep ile doğrulandı, sıfır sonuç). Bu route sadece doğrudan URL ile (ofis duvarındaki TV'ye bir kere yazılıp kalıcı açık bırakılması amacıyla) erişiliyor.
2. **`lib/modules.js`, `lib/kartvizit.js`, `lib/roles.js` içinde bu route için tanımlanmış herhangi bir rol kısıtı yok** — yani "beklenen ama uygulanmayan" bir kural değil, hiç böyle bir kural tanımlanmamış.
3. **İçeriği zaten RLS'e tabi** — sayfa sadece `calendarEvents.list()` çağırıyor, bu da `calendar_events_select` RLS politikasına tabi; kim açarsa açsın (danışman dahil) sadece kendi görme yetkisi olan etkinlikleri görür.

Bu nedenle `/pano` "rol bazlı erişim beklenip de uygulanmayan" kategorisine girmiyor — kasıtlı olarak herkese (giriş yapmış olmak kaydıyla) açık bir kiosk ekranı.

---

## 4. Özet

| Kategori | Route sayısı |
|---|---|
| Toplam tanımlı route (public'ler dahil) | 17 |
| Rol bazlı erişim kısıtı **beklenen ve doğru uygulanan** | 3 (`/leads`, `/recruiting`, `/ayarlar`) |
| Rol bazlı erişim kısıtı **beklenmeyen** (ALL_ROLES veya public, guard gerekmez) | 13 |
| Rol bazlı erişim kısıtı **beklenen ama uygulanmayan (GAP)** | **1 — `/kartvizitim`** |

Hiçbir düzeltme yapılmadı — bu rapor sadece tespit amaçlıdır.
