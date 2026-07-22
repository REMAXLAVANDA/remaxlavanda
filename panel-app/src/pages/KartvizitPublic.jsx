import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { users as usersProvider } from '../lib/dataProvider'
import KartvizitCard from '../components/kartvizit/KartvizitCard'

// Girişsiz açılan, herkese açık kartvizit sayfası — /k/:userId. AppLayout
// dışında (kenar çubuğu/topbar yok), kendi minimal sayfa iskeletiyle.
// Giriş yapmış bir kullanıcı da açarsa aynı şekilde (kendi oturumundan
// bağımsız) çalışır — dataProvider.getPublicCard her zaman get_kartvizit
// RPC'sini (anon dahil herkese açık) kullanır.
export default function KartvizitPublic() {
  const { userId } = useParams()
  const [state, setState] = useState({ loading: true, card: null, error: false })

  useEffect(() => {
    let cancelled = false
    setState({ loading: true, card: null, error: false })
    usersProvider
      .getPublicCard(userId)
      .then((card) => { if (!cancelled) setState({ loading: false, card, error: false }) })
      .catch(() => { if (!cancelled) setState({ loading: false, card: null, error: true }) })
    return () => { cancelled = true }
  }, [userId])

  return (
    <div className="min-h-screen bg-ink-50 px-4 py-10">
      {state.loading && <p className="text-center text-sm text-ink-400">Yükleniyor...</p>}

      {!state.loading && (state.error || !state.card) && (
        <div className="mx-auto max-w-sm rounded-2xl border border-ink-100 bg-white p-8 text-center">
          <p className="text-sm font-medium text-ink-700">Bu kartvizit bulunamadı.</p>
          <p className="mt-1 text-xs text-ink-400">Link geçersiz olabilir veya kartvizit kapatılmış olabilir.</p>
        </div>
      )}

      {!state.loading && state.card && <KartvizitCard card={state.card} userId={userId} />}
    </div>
  )
}
