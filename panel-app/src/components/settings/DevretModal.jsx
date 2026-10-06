import { useState } from 'react'
import Modal from '../common/Modal'

// Pasife alınacak danışmanın üzerinde açık/bekleyen iş varsa, pasifleştirme
// öncesi devredilecek kişiyi sorar — bkz. /kurul "danışman takip menüleri"
// denetimi: pasife alma işi hiç devretmiyordu, kayıtlar kimsenin
// göremediği bir danışmanın üzerinde asılı kalıyordu.
// alreadyPasif (2026-10-06, madde 4): bu özellik hayata geçmeden ÖNCE
// pasife alınmış danışmanlarda kalmış "yetim" kayıtlar için AYNI pencere
// isteğe bağlı olarak tekrar açılabiliyor — bu durumda pasifleştirme
// tekrar tetiklenmiyor, metin buna göre değişiyor.
export default function DevretModal({
  targetName,
  pendingCallCount,
  pendingOpportunityCount,
  candidates,
  onSubmit,
  onCancel,
  submitting,
  alreadyPasif = false,
}) {
  const [toUserId, setToUserId] = useState(candidates[0]?.id ?? '')

  return (
    <Modal title="Açık işleri devret" onClose={onCancel} maxWidth="max-w-sm">
      <p className="text-sm text-ink-600">
        <span className="font-medium text-ink-800">{targetName}</span>{' '}
        {alreadyPasif
          ? 'pasif olduğu hâlde üzerinde hâlâ devredilmemiş açık işler var:'
          : 'pasife alınmadan önce üzerindeki açık işlerin başka bir danışmana devredilmesi gerekiyor:'}
      </p>
      <ul className="mt-3 space-y-1 text-sm text-ink-700">
        {pendingCallCount > 0 && (
          <li>
            • <span className="font-medium">{pendingCallCount}</span> dönüş bekleyen çağrı
          </li>
        )}
        {pendingOpportunityCount > 0 && (
          <li>
            • <span className="font-medium">{pendingOpportunityCount}</span> açık/üstlenilmiş fırsat
          </li>
        )}
      </ul>

      {candidates.length === 0 ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          Devredilecek başka aktif danışman yok. Önce başka bir danışman aktifleştir ya da bu kayıtları elle
          Operasyon/Fırsatlar ekranından düzenle.
        </p>
      ) : (
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-ink-400">Kime devredilsin?</span>
          <select
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50">
          Vazgeç
        </button>
        <button
          onClick={() => onSubmit(toUserId)}
          disabled={submitting || candidates.length === 0}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? 'Devrediliyor...' : alreadyPasif ? 'Devret' : 'Devret ve Pasifleştir'}
        </button>
      </div>
    </Modal>
  )
}
