import { useState } from 'react'
import { Eye, EyeOff, Target, StickyNote, Pencil, Circle, Check, X, AlertTriangle } from 'lucide-react'
import { CALL_SOURCE_CODES, GORUSULDU_CYCLE, PORTFOY_CYCLE, canEditCallDetails, cycleValue, maskPhone } from '../../lib/callLogs'

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

function KaynakBadge({ kaynak }) {
  const info = CALL_SOURCE_CODES[kaynak] ?? { code: '?', style: 'bg-ink-100 text-ink-500' }
  return (
    <span
      title={kaynak}
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${info.style}`}
    >
      {info.code}
    </span>
  )
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

// Görüşüldü/Portföy — ikisi de üç durumlu, tek tıkla döngülenen bir ikon.
// Görüşüldü: Bekliyor (nokta) -> Ulaşılamadı (turuncu !) -> Görüşüldü (yeşil tik)
// Portföy:   Bekliyor (nokta) -> Alındı (yeşil tik) -> Almadık (kırmızı çarpı)
const STATUS_VARIANTS = {
  pending: { icon: Circle, className: 'border-dashed border-ink-300 text-ink-400', iconProps: { size: 9, fill: 'currentColor' } },
  warn: { icon: AlertTriangle, className: 'border-amber-500 bg-amber-500 text-white', iconProps: { size: 12 } },
  yes: { icon: Check, className: 'border-emerald-600 bg-emerald-600 text-white', iconProps: { size: 14, strokeWidth: 3 } },
  no: { icon: X, className: 'border-red-600 bg-red-600 text-white', iconProps: { size: 12, strokeWidth: 3 } },
}

function StatusIcon({ variant, title, onClick }) {
  const { icon: Icon, className, iconProps } = STATUS_VARIANTS[variant]
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      title={title}
      className={`inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] ${className}`}
    >
      <Icon {...iconProps} />
    </Tag>
  )
}

function gorusuldeVariant(value) {
  if (value === true) return { variant: 'yes', title: 'Görüşüldü — tıklayınca Bekliyor\'a döner' }
  if (value === false) return { variant: 'warn', title: 'Ulaşılamadı — tıklayınca Görüşüldü olur' }
  return { variant: 'pending', title: 'Bekliyor — henüz aranmadı, tıklayınca Ulaşılamadı olur' }
}

function portfoyVariant(value) {
  if (value === true) return { variant: 'yes', title: 'Alındı — tıklayınca Almadık olur' }
  if (value === false) return { variant: 'no', title: 'Almadık — tıklayınca Bekliyor\'a döner' }
  return { variant: 'pending', title: 'Bekliyor — tıklayınca Alındı olur' }
}

// Operasyon listesi satır/sütun mantığıyla, alt alta sıralı tablo olarak
// gösterilir — kutu kutu kart yerine tek bakışta tarama yapılabilsin diye.
// Süreç takibi TEK amaç: danışman müşteriyle görüştü mü (gecikme var mı),
// portföy aldı mı — bu yüzden "Sonuç" diye ayrı bir serbest seçim YOK,
// sadece bu iki net üç-durumlu ikon (bkz. "iki tane seçim olsun" isteği).
export default function CallTable({
  calls,
  currentUserId,
  currentRole,
  isManager,
  inviteeOptions,
  resolveName,
  onAssign,
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
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead>
          <tr className="sticky top-0 z-10 border-b border-ink-100 bg-ink-50 text-xs font-medium text-ink-400">
            {isManager && <th className="px-3 py-2.5">Kynk</th>}
            <th className="max-w-[140px] px-3 py-2.5">Arayan</th>
            <th className="px-3 py-2.5">Telefon</th>
            <th className="px-3 py-2.5">Görüşüldü</th>
            <th className="px-3 py-2.5">Portföy</th>
            <th className="px-3 py-2.5">Atanan</th>
            <th className="px-3 py-2.5">Tarih</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => {
            // Görüşüldü/Portföy alanları BİLEREK yönetime değil, sadece
            // atanan kişiye açık — bu bilgiyi fiilen sahada işi üstlenen
            // kişi işaretlesin istendi (broker dahil yönetim bir çağrı
            // atanmadan bu alanları değiştiremiyor). Atama (kime verileceği)
            // ayrı bir yetki (bkz. "Atanan" sütunu, isManager).
            const canEditResult = call.assignedTo === currentUserId
            const gorusuldu = gorusuldeVariant(call.donusYapildiMi)
            const portfoy = portfoyVariant(call.portfoyAlindiMi)
            return (
              <tr key={call.id} className="border-b border-ink-50 align-middle last:border-0 hover:bg-ink-50">
                {isManager && (
                  <td className="px-3 py-3">
                    <KaynakBadge kaynak={call.kaynak} />
                  </td>
                )}
                <td className="max-w-[140px] px-3 py-3 font-medium text-ink-900">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="truncate">{call.arayanAd}</span>
                    {call.opportunityId && <Target size={13} className="shrink-0 text-brand-600" title="Fırsata dönüştü" />}
                  </span>
                  {/* Tooltip yerine doğrudan metin — telefonda hover olmadığı
                      için danışman notu göremiyordu (bkz. "ne için aradığını
                      da yazmamız lazım" isteği). */}
                  {call.notlar && (
                    <span className="mt-0.5 flex items-start gap-1 text-xs font-normal text-ink-500">
                      <StickyNote size={12} className="mt-0.5 shrink-0 text-ink-400" />
                      <span className="line-clamp-2">{call.notlar}</span>
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-ink-600">
                  <PhoneCell phone={call.arayanTelefon} />
                </td>
                <td className="px-3 py-3">
                  <StatusIcon
                    variant={gorusuldu.variant}
                    title={gorusuldu.title}
                    onClick={
                      canEditResult
                        ? () => onToggle(call.id, 'donusYapildiMi', cycleValue(call.donusYapildiMi, GORUSULDU_CYCLE))
                        : undefined
                    }
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <StatusIcon
                      variant={portfoy.variant}
                      title={portfoy.title}
                      onClick={
                        canEditResult
                          ? () => onToggle(call.id, 'portfoyAlindiMi', cycleValue(call.portfoyAlindiMi, PORTFOY_CYCLE))
                          : undefined
                      }
                    />
                    {call.satildiMi && (
                      <span className="whitespace-nowrap text-xs font-medium text-brand-700" title={satisTarihiLabel(call.satisTarihi)}>
                        Satıldı
                      </span>
                    )}
                    {call.portfoyNo && (
                      <span className="whitespace-nowrap text-xs text-ink-400" title="Portföy no">
                        {call.portfoyNo}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
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
                <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-400">{callDateLabel(call.createdAt)}</td>
                <td className="px-3 py-3 text-right">
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
