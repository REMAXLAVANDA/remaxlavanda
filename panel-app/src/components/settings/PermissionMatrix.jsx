import { Check } from 'lucide-react'
import { ROLES, ROLE_LABELS, ROLE_ORDER } from '../../lib/roles'

// Sistemde ayrı bir "permission" tablosu yok — 4 sabit rol var, her
// yetkinlik kendi domain dosyasındaki bir can*(role) fonksiyonuyla
// kontrol ediliyor (bkz. lib/roles.js, lib/league.js, lib/callLogs.js,
// lib/docs.js, lib/categories.js). Bu tablo o fonksiyonların salt-okunur
// bir özeti — buradan hiçbir şey değiştirilemez, sadece "kim ne yapabilir"
// tek bakışta görülsün diye.
const CAPABILITIES = [
  { label: 'Kullanıcı Ekle/Düzenle', roles: [ROLES.BROKER, ROLES.OWNER] },
  { label: 'Skor Girişi (Ciro)', roles: [ROLES.BROKER, ROLES.OWNER, ROLES.OFIS] },
  { label: 'Lig Dönemi Aç / Sosyal Medya Puanları', roles: [ROLES.BROKER] },
  { label: 'Kategori Yönetimi', roles: [ROLES.BROKER, ROLES.OWNER] },
  { label: 'Çağrı Atama / Yönetimi', roles: [ROLES.BROKER, ROLES.OWNER, ROLES.OFIS] },
  { label: 'Etkinlik Oluştur / Katılım Yönet', roles: [ROLES.BROKER, ROLES.OWNER, ROLES.OFIS] },
  { label: 'Mazeret Kabul / Red', roles: [ROLES.BROKER, ROLES.OWNER, ROLES.OFIS] },
  { label: 'Rehber Doküman Ekle/Sil', roles: [ROLES.BROKER, ROLES.OFIS] },
  { label: 'Ekip Verilerini Görüntüleme (Takip/Panel)', roles: [ROLES.BROKER, ROLES.OWNER, ROLES.OFIS] },
  { label: 'Log Kayıtlarını Görüntüleme', roles: [ROLES.BROKER, ROLES.OWNER] },
]

export default function PermissionMatrix() {
  return (
    <div>
      <p className="mb-4 text-xs text-ink-400">
        Sistemde 4 sabit rol var, ayrı bir yetki tablosu yok — her yetkinlik kodda kontrol ediliyor. Bu tablo salt
        okunur bir özet.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-ink-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50">
              <th className="px-4 py-2.5 text-left font-medium text-ink-500">Yetkinlik</th>
              {ROLE_ORDER.map((r) => (
                <th key={r} className="px-3 py-2.5 text-center font-medium text-ink-500">
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((cap) => (
              <tr key={cap.label} className="border-b border-ink-50 last:border-0">
                <td className="px-4 py-2.5 text-ink-700">{cap.label}</td>
                {ROLE_ORDER.map((r) => (
                  <td key={r} className="px-3 py-2.5 text-center">
                    {cap.roles.includes(r) && <Check size={15} className="mx-auto text-emerald-600" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
