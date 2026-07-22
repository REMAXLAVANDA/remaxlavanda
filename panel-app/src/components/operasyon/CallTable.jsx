import { useState } from 'react'
import { Eye, EyeOff, Target, StickyNote, Pencil } from 'lucide-react'
import { CALL_RESULT_LABELS, CALL_RESULT_STYLES, canEditCallDetails, maskPhone } from '../../lib/callLogs'
function satisTarihiLabel(satisTarihi) {
  if (!satisTarihi) return 'Satış tarihi'
  return `Satış: ${new Date(satisTarihi).toLocaleDateString('tr-TR')}`
}

// "bugün/dün" gibi göreceli değil, gerçek tarih+saat — "hangi çağrı ne
// zaman girilmiş" net görülsün diye (bkz. "tarih kısmında bugün yazıyor,
// orada tarih yazmalı" isteği).
function callDateLabel(createdAt) {
  if (!createdAt) return '—'
  return new Date(createdAt).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PhoneCell({ phone }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {revealed ? phone : maskPhone(phone)}
      <button
        onClick={() => setRevealed((v) => !v)}
        className="text-ink-400 hover:text-brand-700"
        title={revealed ? 'Gizle' : 'Göster'}
      >
        {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </span>
  )
}

// Operasyon listesi satır/sütun mantığıyla, alt alta sıralı tablo olarak
// gösterilir — kutu kutu kart yerine tek bakışta tarama yapılabilsin diye.
export default function CallTable({
  calls,
  currentUserId,
  currentRole,
  isManager,
  inviteeOptions,
  resolveName,
  onAssign,
  onSetResult,
  onToggle,
  onEditDetails,
}) {
  if (calls.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-sm text-ink-400">
        Bu filtrelere uyan çağrı yok.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="sticky top-0 z-10 border-b border-ink-100 bg-ink-50 text-xs font-medium text-ink-400">
            {isManager && <th className="px-4 py-2.5">Kaynak</th>}
            <th className="px-4 py-2.5">Arayan</th>
            <th className="px-4 py-2.5">Telefon</th>
            <th className="px-4 py-2.5">Sonuç</th>
            <th className="px-4 py-2.5">Portföy</th>
            <th className="px-4 py-2.5">Dönüş</th>
            <th className="px-4 py-2.5">Atanan</th>
            <th className="px-4 py-2.5">Tarih</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => {
            // Sonuç/Portföy/Dönüş alanları BİLEREK yönetime değil, sadece
            // atanan kişiye açık — "portföy alındı" fiilen sahada işi
            // üstlenen kişi tarafından işaretlensin istendi (broker dahil
            // yönetim artık bir çağrı atanmadan bu alanları değiştiremiyor).
            // Atama (kime verileceği) ayrı bir yetki (bkz. "Atanan" sütunu,
            // isManager) — bu kısıt sadece SONUÇ girişini etkiliyor.
            const canEditResult = call.assignedTo === currentUserId
            return (
              <tr key={call.id} className="border-b border-ink-50 align-middle last:border-0 hover:bg-ink-50">
                {isManager && (
                  <td className="px-4 py-3">
                    <span className="whitespace-nowrap rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
                      {call.kaynak}
                    </span>
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-ink-900">
                  <span className="flex items-center gap-1.5">
                    {call.arayanAd}
                    {call.opportunityId && <Target size={13} className="shrink-0 text-brand-600" title="Fırsata dönüştü" />}
                  </span>
                  {/* Tooltip yerine doğrudan metin — telefonda hover olmadığı
                      için danışman notu göremiyordu (bkz. "ne için aradığını
                      da yazmamız lazım" isteği). */}
                  {call.notlar && (
                    <span className="mt-0.5 flex items-start gap-1 text-xs font-normal text-ink-500">
                      <StickyNote size={12} className="mt-0.5 shrink-0 text-ink-400" />
                      {call.notlar}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-600">
                  <PhoneCell phone={call.arayanTelefon} />
                </td>
                <td className="px-4 py-3">
                  {canEditResult ? (
                    <select
                      value={call.sonuc ?? ''}
                      onChange={(e) => onSetResult(call.id, e.target.value || null)}
                      className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-600"
                    >
                      <option value="">Sonuç seç</option>
                      {Object.entries(CALL_RESULT_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : call.sonuc ? (
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${CALL_RESULT_STYLES[call.sonuc]}`}>
                      {CALL_RESULT_LABELS[call.sonuc]}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-500">
                      Değerlendirilmedi
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {canEditResult ? (
                      <button
                        onClick={() => onToggle(call.id, 'portfoyAlindiMi')}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                          call.portfoyAlindiMi ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-500'
                        }`}
                      >
                        {call.portfoyAlindiMi ? 'Alındı' : 'Alınmadı'}
                        {call.satildiMi && (
                          <span className="text-brand-700" title={satisTarihiLabel(call.satisTarihi)}>
                            · Satıldı
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                        call.portfoyAlindiMi ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-500'
                      }`}>
                        {call.portfoyAlindiMi ? 'Alındı' : 'Alınmadı'}
                        {call.satildiMi && (
                          <span className="text-brand-700" title={satisTarihiLabel(call.satisTarihi)}>
                            · Satıldı
                          </span>
                        )}
                      </span>
                    )}
                    {call.portfoyNo && (
                      <span className="whitespace-nowrap text-xs text-ink-400" title="Portföy no">
                        {call.portfoyNo}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {canEditResult ? (
                    <button
                      onClick={() => onToggle(call.id, 'donusYapildiMi')}
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                        call.donusYapildiMi ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {call.donusYapildiMi ? 'Yapıldı' : 'Bekliyor'}
                    </button>
                  ) : (
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                      call.donusYapildiMi ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {call.donusYapildiMi ? 'Yapıldı' : 'Bekliyor'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isManager ? (
                    <select
                      value={call.assignedTo ?? ''}
                      onChange={(e) => {
                        const newId = e.target.value || null
                        const newName = newId ? inviteeOptions.find((u) => u.id === newId)?.name : 'Atanmadı'
                        // Tek satırlık native select, yanlışlıkla (fare
                        // tekerleği/yanlış tık) farklı bir kişiye atamayı çok
                        // kolaylaştırıyor — onay olmadan doğrudan kaydediyordu.
                        if (!window.confirm(`Bu çağrı "${newName}" olarak atansın mı?`)) {
                          e.target.value = call.assignedTo ?? ''
                          return
                        }
                        onAssign(call.id, newId)
                      }}
                      className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-600"
                    >
                      <option value="">Atanmadı</option>
                      {inviteeOptions.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="whitespace-nowrap text-xs text-ink-500">
                      {call.assignedTo ? resolveName(call.assignedTo) : 'Atanmadı'}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-400">{callDateLabel(call.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {canEditCallDetails(currentRole, call.createdAt) && (
                    <button
                      onClick={() => onEditDetails(call)}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                      title="Bilgileri düzenle"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
