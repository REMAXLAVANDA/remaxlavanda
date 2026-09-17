import { Fragment, useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Target,
  Send,
  StickyNote,
  Tag,
  Pencil,
  Trash2,
  Circle,
  Check,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { CALL_SOURCE_CODES, callNeedsTracking, canEditCallDetails, maskPhone } from '../../lib/callLogs'
import { ISLEM_TIPI_CODES, ISLEM_TIPI_STYLES, ISLEM_TIPI_LABELS } from '../../lib/opportunities'
import { ROLES } from '../../lib/roles'
import { telHref, whatsappHref } from '../../lib/phone'
import { WhatsappIcon } from '../kartvizit/BrandIcons'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import ConfirmDialog from '../common/ConfirmDialog'

// Fırsata dönüşen çağrının yanında ne gösterilsin — biliniyorsa
// (islemTipiByOpportunityId'de varsa) KaynakBadge ile aynı desende kısa
// harf kodu (SAT/KİR — ilk denemedeki ikon "hiç anlaşılmıyor" bulgusu
// üzerine), RLS izin vermiyorsa (bkz. OperasyonTab.jsx notu) genel
// "dönüştü" ikonuna düşer. İkisi birden gösterilmiyor — aynı bilgiyi iki
// kez tekrar edip satırı kalabalıklaştırmasın diye.
function ConvertedIcon({ opportunityId, islemTipiByOpportunityId }) {
  if (!opportunityId) return null
  const islemTipi = islemTipiByOpportunityId?.[opportunityId]
  if (islemTipi) {
    return (
      <span
        title={`Fırsata dönüştü — ${ISLEM_TIPI_LABELS[islemTipi] ?? ISLEM_TIPI_LABELS.satilik}`}
        className={`inline-flex h-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${ISLEM_TIPI_STYLES[islemTipi] ?? ISLEM_TIPI_STYLES.satilik}`}
      >
        {ISLEM_TIPI_CODES[islemTipi] ?? ISLEM_TIPI_CODES.satilik}
      </span>
    )
  }
  return <Target size={13} className="shrink-0 text-brand-600" title="Fırsata dönüştü" />
}

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
// etmeliyiz" isteği). İlk ikisi (Görüşüldü/Portföy) tıklanınca olası
// durumları listeleyen bir menü açan üç durumlu rozet (bkz.
// StatusPickerPill), üçüncüsü (Satıldı) sadece portföy alındıktan sonra
// anlamlı olduğu için ancak o zaman zincire eklenir ve hiç tıklanamaz.
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
function StatusPill({ variant, label, title }) {
  const { icon: Icon, iconProps } = STATUS_VARIANTS[variant]
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${PILL_VARIANTS[variant]}`}
    >
      <Icon {...iconProps} />
      {label}
    </span>
  )
}

function Arrow() {
  return <ChevronRight size={14} className="shrink-0 text-ink-300" />
}

function gorusuldeVariant(value) {
  if (value === true) return { variant: 'yes', label: 'Görüşüldü' }
  if (value === false) return { variant: 'warn', label: 'Ulaşılamadı' }
  return { variant: 'pending', label: 'Bekliyor' }
}

function portfoyVariant(value) {
  if (value === true) return { variant: 'yes', label: 'Alındı' }
  if (value === false) return { variant: 'no', label: 'Almadık' }
  return { variant: 'pending', label: 'Bekliyor' }
}

// Olası durumlar, döngüdeki eski sırayla aynı (Bekliyor önce, sonra
// "olumsuz/ara" durum, sonra "olumlu" durum) — kullanıcının zaten alışık
// olduğu sırayı koruyor, sadece döngülemek yerine hepsini birden gösteriyor.
const GORUSULDU_OPTIONS = [null, false, true].map((value) => ({ value, ...gorusuldeVariant(value) }))
const PORTFOY_OPTIONS = [null, true, false].map((value) => ({ value, ...portfoyVariant(value) }))

// Süreç rozetleri eskiden tek tıkla döngülenen tek bir kontroldü — "tıklamadan
// önce ne olacağını kestiremiyorum" geri bildirimi üzerine değiştirildi:
// rozete tıklayınca olası durumları (2-3 seçenek) açıkça listeleyen küçük bir
// menü açılıyor, aktif olan işaretli görünüyor, birine tıklamak DİREKT o
// değeri yazıyor — döngüleme/tahmin etme yok. Chevron ikonu rozetin salt
// bilgi değil, tıklanabilir bir kontrol olduğunu görsel olarak da belli
// ediyor (Satıldı/Satış bekliyor adımlarında chevron yok, onlar gerçekten
// tıklanamaz — bkz. StatusPill). Popover mekanizması SourceLegendInfo.jsx
// ile aynı desen (dışarı tıklayınca/ESC ile kapanır).
function StatusPickerPill({ variant, label, title, options, currentValue, description, canEdit, onSelect }) {
  const [open, setOpen] = useState(false)
  useEscapeKey(() => setOpen(false))

  if (!canEdit) return <StatusPill variant={variant} label={label} title={title} />

  const { icon: Icon, iconProps } = STATUS_VARIANTS[variant]

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={title}
        className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${PILL_VARIANTS[variant]}`}
      >
        <Icon {...iconProps} />
        {label}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1.5 w-44 rounded-xl border border-ink-100 bg-white p-1.5 shadow-lg">
            {description && <p className="px-2 pb-1.5 pt-1 text-[11px] text-ink-400">{description}</p>}
            {options.map((opt) => {
              const { icon: OptIcon, iconProps: optIconProps } = STATUS_VARIANTS[opt.variant]
              const active = opt.value === currentValue
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onSelect(opt.value)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium ${
                    active ? 'bg-ink-50 text-ink-900' : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  <OptIcon {...optIconProps} />
                  {opt.label}
                  {active && <Check size={12} className="ml-auto shrink-0 text-brand-600" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// Süreci baştan sona TEK bir zincir olarak gösterir: Arandı -> Portföy ->
// (varsa) Satış. İki tıklanabilir aşama (Görüşüldü/Portföy) mevcut
// üç-durumlu döngü mantığını aynen kullanır, Satış sadece portföy
// alındıktan sonra zincire eklenen bilgi amaçlı bir adımdır (kendi
// düzenleme akışı zaten EditCallDetailsModal'da).
//
// Santral çağrısı portföy talebi değilse (callNeedsTracking=false) zincir
// hiç gösterilmez — danışmandan hiçbir işaretleme beklenmiyor, sadece
// kendisine aktarılmış çağrıyı bilgi amaçlı görüyor (bkz. "portföy çağrısı
// değilse danışman bilgi girmesi gerekmesin" isteği).
function CallProgressSteps({ call, canEdit, onToggle }) {
  if (!callNeedsTracking(call)) {
    return (
      <span
        title="Bu çağrı portföy talebi değil — bilgi amaçlı aktarıldı, işlem yapman gerekmiyor"
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-ink-200 px-2.5 py-1 text-xs text-ink-400"
      >
        <Info size={12} /> Bilgi amaçlı
      </span>
    )
  }

  const gorusuldu = gorusuldeVariant(call.donusYapildiMi)
  const portfoy = portfoyVariant(call.portfoyAlindiMi)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusPickerPill
        variant={gorusuldu.variant}
        label={gorusuldu.label}
        title={canEdit ? `${gorusuldu.label} — değiştirmek için tıkla` : gorusuldu.label}
        options={GORUSULDU_OPTIONS}
        currentValue={call.donusYapildiMi}
        description="Görüşme durumunu değiştirmek için birini seç."
        canEdit={canEdit}
        onSelect={(value) => onToggle(call.id, 'donusYapildiMi', value)}
      />
      <Arrow />
      <StatusPickerPill
        variant={portfoy.variant}
        label={portfoy.label}
        title={canEdit ? `${portfoy.label} — değiştirmek için tıkla` : portfoy.label}
        options={PORTFOY_OPTIONS}
        currentValue={call.portfoyAlindiMi}
        description="Portföy durumunu değiştirmek için birini seç."
        canEdit={canEdit}
        onSelect={(value) => onToggle(call.id, 'portfoyAlindiMi', value)}
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
    </div>
  )
}

function AssignedCell({ call, isManager, inviteeOptions, resolveName, onAssign }) {
  // Tek satırlık native select, yanlışlıkla (fare tekerleği/yanlış tık)
  // farklı bir kişiye atamayı çok kolaylaştırıyor — onay olmadan doğrudan
  // kaydediyordu. Native window.confirm() yerine portalın kendi
  // ConfirmDialog'u kullanılıyor; select zaten kontrollü (value=
  // call.assignedTo) olduğu için onay bekleyen state değişikliği bile
  // ekranda seçimi otomatik eski haline döndürüyor, ayrı bir "geri al" kodu
  // gerekmiyor.
  const [pendingAssign, setPendingAssign] = useState(null)

  if (!isManager) {
    return <span className="whitespace-nowrap text-xs text-ink-500">{call.assignedTo ? resolveName(call.assignedTo) : 'Atanmadı'}</span>
  }
  return (
    <>
      <select
        value={call.assignedTo ?? ''}
        onChange={(e) => {
          const newId = e.target.value || null
          const newName = newId ? inviteeOptions.find((u) => u.id === newId)?.name : 'Atanmadı'
          setPendingAssign({ id: newId, name: newName })
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
      {pendingAssign && (
        <ConfirmDialog
          title="Çağrıyı ata"
          message={`Bu çağrı "${pendingAssign.name}" olarak atansın mı?`}
          confirmLabel="Evet, ata"
          onConfirm={() => {
            onAssign(call.id, pendingAssign.id)
            setPendingAssign(null)
          }}
          onCancel={() => setPendingAssign(null)}
        />
      )}
    </>
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
  onEditNote,
  onDelete,
  onConvertToOpportunity,
  islemTipiByOpportunityId,
}) {
  // Reklam kodu (hangi reklamdan geldiği) sadece broker/owner'a görünsün
  // — ofis/danışman girer ama bu bilgiyi görmesine gerek yok (bkz.
  // Recruiting'deki AYNI kısıt, "broker ve owner görsün sadece" isteği).
  const showReklamKodu = currentRole === ROLES.BROKER || currentRole === ROLES.OWNER

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
              <th className="px-3 py-2.5">{isManager ? 'Kynk' : 'Talep No'}</th>
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
              // Açıklama (notlar) dar "Arayan" sütununa sıkışıp 2 satırla
              // kesilmesin diye (bkz. "açıklama görünmüyor, boydan boya
              // olsa" isteği) ayrı, tüm genişlikte bir alt satırda tam
              // metin gösteriliyor — sadece not varsa ikinci <tr> render
              // edilir, yoksa satır tek kalır.
              return (
                <Fragment key={call.id}>
                  <tr className={`align-middle hover:bg-ink-50 ${call.notlar ? '' : 'border-b border-ink-50 last:border-0'}`}>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-0.5">
                        {isManager && <KaynakBadge kaynak={call.kaynak} />}
                        {call.portfoyNo && (
                          <span className="whitespace-nowrap text-[11px] text-ink-400" title="Talep no">
                            {call.portfoyNo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[140px] px-3 py-3 font-medium text-ink-900">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{call.arayanAd}</span>
                        <ConvertedIcon opportunityId={call.opportunityId} islemTipiByOpportunityId={islemTipiByOpportunityId} />
                      </span>
                      {showReklamKodu && call.reklamKodu && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-ink-500" title="Reklam kodu">
                          <Tag size={12} className="shrink-0 text-ink-400" />
                          {call.reklamKodu}
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
                      <div className="flex items-center justify-end gap-1">
                        {!call.opportunityId && (canEditResult || isManager) && (
                          <button
                            onClick={() => onConvertToOpportunity(call)}
                            className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                            title="Fırsata Çevir"
                          >
                            <Send size={13} /> Fırsata Çevir
                          </button>
                        )}
                        {canEditResult && !canEditCallDetails(currentRole, call.createdAt) && (
                          <button
                            onClick={() => onEditNote(call)}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                            title={call.notlar ? 'Notu düzenle' : 'Not ekle'}
                          >
                            <StickyNote size={14} />
                          </button>
                        )}
                        {canEditCallDetails(currentRole, call.createdAt) && (
                          <button
                            onClick={() => onEditDetails(call)}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                            title="Bilgileri düzenle"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {isManager && (
                          <button
                            onClick={() => onDelete(call)}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                            title="Çağrıyı sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {call.notlar && (
                    <tr className="border-b border-ink-50 align-middle last:border-0 hover:bg-ink-50">
                      <td />
                      <td colSpan={6} className="px-3 pb-3 text-xs text-ink-500">
                        <span className="flex items-start gap-1">
                          <StickyNote size={12} className="mt-0.5 shrink-0 text-ink-400" />
                          <span>{call.notlar}</span>
                        </span>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
                    {call.portfoyNo && (
                      <span className="whitespace-nowrap text-[11px] text-ink-400" title="Talep no">
                        {call.portfoyNo}
                      </span>
                    )}
                    <span className="truncate font-medium text-ink-900">{call.arayanAd}</span>
                    <ConvertedIcon opportunityId={call.opportunityId} islemTipiByOpportunityId={islemTipiByOpportunityId} />
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
                  {showReklamKodu && call.reklamKodu && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-ink-500">
                      <Tag size={12} className="shrink-0 text-ink-400" />
                      <span>{call.reklamKodu}</span>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!call.opportunityId && (canEditResult || isManager) && (
                    <button
                      onClick={() => onConvertToOpportunity(call)}
                      className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                      title="Fırsata Çevir"
                    >
                      <Send size={13} /> Fırsata Çevir
                    </button>
                  )}
                  {canEditResult && !canEditCallDetails(currentRole, call.createdAt) && (
                    <button
                      onClick={() => onEditNote(call)}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                      title={call.notlar ? 'Notu düzenle' : 'Not ekle'}
                    >
                      <StickyNote size={14} />
                    </button>
                  )}
                  {canEditCallDetails(currentRole, call.createdAt) && (
                    <button
                      onClick={() => onEditDetails(call)}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                      title="Bilgileri düzenle"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {isManager && (
                    <button
                      onClick={() => onDelete(call)}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                      title="Çağrıyı sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
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
