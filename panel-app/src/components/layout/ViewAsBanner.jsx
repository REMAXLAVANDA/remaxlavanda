import { Eye, Undo2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useViewAs } from '../../context/ViewAsContext'
import { ROLE_LABELS } from '../../lib/roles'

// 2026-11-07 broker: "kullanıcılar arası geçiş yapabilir miyim ... onların
// ekranını görebilir miyim" — bu şerit her sayfada SABİT görünür (profil
// menüsünü açmaya gerek kalmadan) ki broker hangi kimlikle baktığını asla
// unutmasın ve her zaman tek tıkla kendi hesabına dönebilsin. Salt okunur
// olduğunu da burada açıkça söylüyor — lib/viewAsGuard.js yazma
// isteklerini zaten engelliyor, bu metin sadece beklenti yönetimi.
export default function ViewAsBanner() {
  const { isViewingAs, user, role, realUser } = useAuth()
  const { stopViewAs } = useViewAs()

  if (!isViewingAs) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-tint-amber px-4 py-2 text-sm text-tint-amber-text lg:px-8">
      <span className="flex items-center gap-2">
        <Eye size={16} className="shrink-0" />
        <strong>{user.name}</strong> ({ROLE_LABELS[role]}) olarak görüntülüyorsun — salt okunur, değişiklik kaydedilmez.
      </span>
      <button
        onClick={stopViewAs}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-medium text-text-primary hover:bg-surface-sunken"
      >
        <Undo2 size={13} />
        Kendi hesabına dön ({realUser?.name})
      </button>
    </div>
  )
}
