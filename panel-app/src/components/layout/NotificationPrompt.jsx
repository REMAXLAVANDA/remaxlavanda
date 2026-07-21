import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { users as usersProvider } from '../../lib/dataProvider'
import { isPushSupported, getNotificationPermission, subscribeToPush } from '../../lib/push'

const DISMISS_KEY = 'push-prompt-dismissed'

// Tüm rollere açık, tek seferlik bir bant — hem havuza düşen yeni
// fırsatlar hem de Operasyon'da kendine yapılan atamalar için bildirim
// almak isteyip istemediğini sorar (bkz. supabase/functions/notify-*).
// İzin zaten verilmiş/reddedilmişse veya kullanıcı daha önce kapatmışsa
// hiç görünmez.
export default function NotificationPrompt() {
  const { user, isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const [visible, setVisible] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (!isPushSupported()) return
    if (getNotificationPermission() !== 'default') return
    if (localStorage.getItem(DISMISS_KEY) === '1') return
    setVisible(true)
  }, [isAuthenticated, user])

  async function handleEnable() {
    setSubscribing(true)
    try {
      const subscription = await subscribeToPush()
      await usersProvider.savePushSubscription(subscription, user.id)
      showToast('Bildirimler açıldı.', 'success')
      setVisible(false)
    } catch (err) {
      showToast(err.message ?? 'Bildirim açılamadı, tekrar dene.', 'error')
    } finally {
      setSubscribing(false)
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
      <Bell size={18} className="shrink-0 text-brand-600" />
      <p className="min-w-0 flex-1 text-sm text-brand-800">
        Yeni bir fırsat veya sana atanan bir çağrı olunca haberin olsun mu?
      </p>
      <button
        onClick={handleEnable}
        disabled={subscribing}
        className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {subscribing ? 'Açılıyor...' : 'Bildirimleri Aç'}
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1.5 text-brand-400 hover:bg-brand-100 hover:text-brand-700"
        title="Kapat"
      >
        <X size={15} />
      </button>
    </div>
  )
}
