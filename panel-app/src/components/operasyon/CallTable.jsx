import { useState } from 'react'
import { ChevronRight, Eye, EyeOff, Target, StickyNote, Pencil, Circle, Check, X, AlertTriangle } from 'lucide-react'
import { CALL_SOURCE_CODES, GORUSULDU_CYCLE, PORTFOY_CYCLE, canEditCallDetails, cycleValue, maskPhone } from '../../lib/callLogs'
import { telHref, whatsappHref } from '../../lib/phone'
import { WhatsappIcon } from '../kartvizit/BrandIcons'

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
      {revealed ? (
        <>
          <a href={telHref(phone)} className="text-brand-700 hover:underline">
            {phone}
          </a>
          <a href={whatsappHref(phone)} target="_blank" rel="noreferrer" title="WhatsApp'ta aç" className="text-emerald-600 hover:text-emerald-700">
            <WhatsappIcon size={13} />
          </a>
        </>
      ) : (
        maskPhone(phone)
      )}
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

// Görüşüldü/Portföy/Satıldı — sürecin üç aşaması, aralarında ok ile
// bağlanan bir zincir olarak gösterilir (bkz. "aşama aşama takip
// etmeliyiz" isteği). İlk ikisi tek tıkla döngülenen üç durumlu rozet,
// üçüncüsü (Satıldı) sadece portföy alındıktan sonra anlamlı olduğu için
// ancak o zaman zincire eklenir.
const STATUS_VARIANTS = {
  pending: { icon: Circle, iconProps: { size: 9, fill: 'currentColor' } },
  warn: { icon: AlertTriangle, iconProps: { size: 12 } },
  yes: { icon: Check, iconProps: { size: 12, strokeWidth: 3 } },
  no: { icon: X, iconProps: { size: 12, strokeWidth: 3 } },
}

const PILL_VARIANTS = {
  pending: 'border border-dashed border-ink-300 bg-white text-ink-500',
  warn: 'border border-amber-300 bg-amber-50 text-amber-700',
  yes: 'border border-emerald-300 bg-emerald-50 text-emerald-700',
  no: 'border border-red-300 bg-red-50 text-red-700',
}

// Mobilde hover/tooltip çalışmadığı için ikon tek başına yetmiyordu
// ("süreci takip edemiyoruz" geri bildirimi) — durumun adı da yazıyla
// görünüyor, dokunmadan/açıklama beklemeden okunabiliyor.
function StatusPill({ variant, label, title, onClick }) {
  const { icon: Icon, iconProps } = STATUS_VARIANTS[variant]
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      title={title}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${PILL_VARIANTS[variant]}`}
    >
      <Icon {...iconProps} />
      {label}
    </Tag>
  )
}

function Arrow() {
  return <ChevronRight size={14} className="shrink-0 text-ink-300" />
}

function gorusuldeVariant(value) {
  if (value === true) return { variant: 'yes', label: 'Görüşüldü', title: "Görüşüldü — tıklayınca Bekliyor'a döner" }
  if (value === false) return { variant: 'warn', label: 'Ulaşılamadı', title: 'Ulaşılamadı — tıklayınca Görüşüldü olur' }
  return { variant: 'pending', label: 'Bekliyor', title: 'Bekliyor — henüz aranmadı, tıklayınca Ulaşılamadı olur' }
}

function portfoyVariant(value) {
  if (value === true) return { variant: 'yes', label: 'Alındı', title: 'Alındı — tıklayınca Almadık olur' }
  if (value === false) return { variant: 'no', label: 'Almadık', title: "Almadık — tıklayınca Bekliyor'a döner" }
  return { variant: 'pending', label: 'Bekliyor', title: 'Bekliyor — tıklayınca Alındı olur' }
}

// Süreci baştan sona TEK bir zincir olarak gösterir: Arandı -> Portföy ->
// (varsa) Satış. İki tıklanabilir aşama (Görüşüldü/Portföy) mevcut
// üç-durumlu döngü mantığını aynen kullanır, Satış sadece portföy
// alındıktan sonra zincire eklenen bilgi amaçlı bir adımdır (kendi
// düzenleme akışı zaten EditCallDetailsModal'da).
function CallProgressSteps({ call, canEdit, onToggle }) {
  const gorusuldu = gorusuldeVariant(call.donusYapildiMi)
  const portfoy = portfoyVariant(call.portfoyAlindiMi)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusPill
        variant={gorusuldu.variant}
        label={gorusuldu.label}
        title={gorusuldu.title}
        onClick={canEdit ? () => onToggle(call.id, 'donusYapildiMi', cycleValue(call.donusYapildiMi, GORUSULDU_CYCLE)) : undefined}
      />
      <Arrow />
      <StatusPill
        variant={portfoy.variant}
        label={portfoy.label}
        title={portfoy.title}
        onClick={canEdit ? () => onToggle(call.id, 'portfoyAlindiMi', cycleValue(call.portfoyAlindiMi, PORTFOY_CYCLE)) : undefined}
      />
      {call.portfoyAlindiMi && (
        <>
          <Arrow />
          {call.satildiMi ? (
            <StatusPill variant="yes" label="Satıldı" title={satisTarihiLabel(call.satisTarihi)} />
          ) : (
            <StatusPill variant="pending" label="Satış bekliyor" title="Portföy satılınca Bilgileri Düzenle'den işaretlenir" />
          )}
        </>
      )}
      {call.portfoyNo && (
        <span className="whitespace-nowrap text-xs text-ink-400" title="Portföy no">
          {call.portfoyNo}
        </span>
      )}
    </div>
  )
}

function AssignedCell({ call, isManager, inviteeOptions, resolveName, onAssign }) {
  if (!isManager) {
    return <span className="whitespace-nowrap text-xs text-ink-500">{call.assignedTo ? resolveName(call.assignedTo) : 'Atanmadı'}</span>
  }
  return (
    <select
      value={call.assignedTo ?? ''}
      onChange={(e) => {
        const newId = e.target.value || null
        const newName = newId ? inviteeOptions.find((u) => u.id === newId)?.name : 'Atanmadı'
        // Tek satırlık native select, yanlışlıkla (fare tekerleği/yanlış
        // tık) farklı bir kişiye atamayı çok kolaylaştırıyor — onay
        // olmadan doğrudan kaydediyordu.
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
  )
}

// Operasyon listesi satır/sütun mantığıyla, alt alta sıralı tablo olarak
// gösterilir — kutu kutu kart yerine tek bakışta tarama yapılabilsin diye.
// Süreç takibi TEK amaç: danışman müşteriyle görüştü mü (gecikme var mı),
// portföy aldı mı — bu yüzden "Sonuç" diye ayrı bir serbest seçim YOK,
// sadece bu iki net üç-durumlu ikon (bkz. "iki tane seçim olsun" isteği).
// Görüşüldü/Portföy/Satış artık ayrı sütunlar değil, tek bir "Süreç"
// zinciri (CallProgressSteps) — aşama aşama ilerleme tek bakışta,
// danışman dahil herkes için aynı şekilde görünsün diye (bkz. "aşama
// aşama takip etmeliyiz danışmana" isteği).
//
// Masaüstünde tablo, mobilde etiketli kart listesi — tablo mobilde yatay
// kaydırma gerektiriyordu ve ikonlar hover olmadan (dokunmatik ekranda) ne
// anlama geldiği belli olmuyordu (bkz. "süreci düzgün takip edemiyoruz"
// geri bildirimi).
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
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-white sm:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-ink-100 bg-ink-50 text-xs font-medium text-ink-400">
              {isManager && <th className="px-3 py-2.5">Kynk</th>}
              <th className="max-w-[140px] px-3 py-2.5">Arayan</th>
              <th className="px-3 py-2.5">Telefon</th>
              <th className="px-3 py-2.5">Süreç</th>
              <th className="px-3 py-2.5">Atanan</th>
              <th className="px-3 py-2.5">Tarih</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => {
              // Süreç alanları BİLEREK yönetime değil, sadece atanan
              // kişiye açık — bu bilgiyi fiilen sahada işi üstlenen kişi
              // işaretlesin istendi (broker dahil yönetim bir çağrı
              // atanmadan bu alanları değiştiremiyor). Atama (kime
              // verileceği) ayrı bir yetki (bkz. "Atanan" sütunu, isManager).
              const canEditResult = call.assignedTo === currentUserId
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
                    <CallProgressSteps call={call} canEdit={canEditResult} onToggle={onToggle} />
                  </td>
                  <td className="px-3 py-3">
                    <AssignedCell call={call} isManager={isManager} inviteeOptions={inviteeOptions} resolveName={resolveName} onAssign={onAssign} />
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

      <div className="space-y-2 sm:hidden">
        {calls.map((call) => {
          const canEditResult = call.assignedTo === currentUserId
          return (
            <div key={call.id} className="rounded-xl border border-ink-100 bg-white p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isManager && <KaynakBadge kaynak={call.kaynak} />}
                    <span className="truncate font-medium text-ink-900">{call.arayanAd}</span>
                    {call.opportunityId && <Target size={13} className="shrink-0 text-brand-600" title="Fırsata dönüştü" />}
                  </div>
                  <div className="mt-1 text-sm text-ink-600">
                    <PhoneCell phone={call.arayanTelefon} />
                  </div>
                  {call.notlar && (
                    <div className="mt-1 flex items-start gap-1 text-xs text-ink-500">
                      <StickyNote size={12} className="mt-0.5 shrink-0 text-ink-400" />
                      <span>{call.notlar}</span>
                    </div>
                  )}
                </div>
                {canEditCallDetails(currentRole, call.createdAt) && (
                  <button
                    onClick={() => onEditDetails(call)}
                    className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    title="Bilgileri düzenle"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>

              <div className="mt-3">
                <CallProgressSteps call={call} canEdit={canEditResult} onToggle={onToggle} />
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-ink-50 pt-2">
                <AssignedCell call={call} isManager={isManager} inviteeOptions={inviteeOptions} resolveName={resolveName} onAssign={onAssign} />
                <span className="text-xs text-ink-400">{callDateLabel(call.createdAt)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
