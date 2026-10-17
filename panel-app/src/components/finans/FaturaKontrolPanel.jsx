import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { bankaHareketleri as bankaHareketleriProvider } from '../../lib/dataProvider'
import { BANKA_HAREKETI_DURUM_LABELS, BANKA_HAREKETI_DURUM_STYLES } from '../../lib/bankaHareketleri'
import { formatDateOnly } from '../../lib/format'
import { LoadingState, ErrorState } from '../common/AsyncState'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

async function loadAll() {
  return { hareketler: await bankaHareketleriProvider.list() }
}

// Finans > Raporlar > Dekont Kontrol — broker, 2026-10-11: "muhasebeye bir
// kullanıcı açalım ve sadece kesmesi gereken ve danışmanın kestiği
// faturaları görsün, bunları kontrol etsin" olarak doğdu, ama fatura
// tarafı (danışman faturası teyidi, ofis faturası, MyRemax/tamamlandı
// işaretleri) 2026-10-17'de broker isteğiyle Ciro Raporları ekranının
// içine taşındı ("fatura kontrolü de ciro ekranına al içine yerleştir")
// — artık ayrı sekmeye gitmeye gerek yok. Burada sadece banka
// dekontlarının (giriş/çıkış, tüm kaynaklardan) teyidi kaldı; bu, tek bir
// ciro raporuna bağlı olmayabileceği için (masraf, elle giriş vb.) ayrı
// bir liste olarak kalmaya devam ediyor.
export default function FaturaKontrolPanel() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])

  const dekontlar = data?.hareketler ?? []

  async function handleDekontTeyit(hareketId, deger) {
    try {
      await bankaHareketleriProvider.teyitEt(hareketId, user.id, deger)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-text-primary">Dekontlar</h2>
      <p className="mb-3 text-xs text-text-muted">Danışmanların ve broker'ın girdiği tüm banka dekontları.</p>
      {dekontlar.length === 0 ? (
        <p className="text-sm text-text-muted">Henüz dekont yok.</p>
      ) : (
        <div className="space-y-2">
          {dekontlar.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle p-3">
              <div className="min-w-0 text-xs text-text-secondary">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${h.tip === 'cikis' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                  {h.tip === 'cikis' ? 'Çıkış' : 'Giriş'}
                </span>{' '}
                <span className="font-medium text-text-primary">{tl(h.tutar)}</span> — {h.gonderenAdi || 'belirtilmemiş'}
                {h.tip !== 'cikis' && (
                  <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${BANKA_HAREKETI_DURUM_STYLES[h.durum]}`}>
                    {BANKA_HAREKETI_DURUM_LABELS[h.durum]}
                  </span>
                )}
                <p className="mt-0.5 text-text-muted">
                  {formatDateOnly(h.tarih)}
                  {h.referansNo && ` · Referans No: ${h.referansNo}`}
                  {h.dekontTarihi && ` · Dekont Tarihi: ${formatDateOnly(h.dekontTarihi)}`}
                </p>
              </div>
              <button
                onClick={() => handleDekontTeyit(h.id, !h.teyitEdildi)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  h.teyitEdildi ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {h.teyitEdildi ? 'Teyit Edildi' : 'Teyit Et'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
