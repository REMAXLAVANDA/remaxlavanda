import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Phone, MessageSquare, Mail, MapPin, Globe, Share2, UserPlus } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { unvanFor, OFIS_MAPS_URL, whatsappLink, kartvizitUrl, downloadVCard } from '../../lib/kartvizit'
import { InstagramIcon, LinkedinIcon, WhatsappIcon } from './BrandIcons'

function initialsFor(name) {
  return (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR')
}

function LinkRow({ icon: Icon, iconClass, label, value, href }) {
  if (!value) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mb-2.5 flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-3.5 py-3 shadow-sm last:mb-0"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${iconClass}`}>
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink-900">{label}</span>
        <span className="block truncate text-xs text-ink-400">{value}</span>
      </span>
    </a>
  )
}

// Danışman/broker'ın dijital kartviziti — hem herkese açık kart sayfasında
// (KartvizitPublic) hem de kendi kartını düzenlerken canlı önizleme olarak
// (Kartvizitim) kullanılır. `card`: { name, telefon, email, avatarUrl, role,
// sosyalMedya }. `userId` yoksa (henüz kaydedilmemiş taslak) QR/link/Rehbere
// Ekle aksiyonları devre dışı kalır.
export default function KartvizitCard({ card, userId }) {
  const { showToast } = useToast()
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const url = userId ? kartvizitUrl(userId) : null

  useEffect(() => {
    if (!url) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    QRCode.toDataURL(url, { width: 160, margin: 1, color: { dark: '#0c2749', light: '#ffffff' } })
      .then((dataUrl) => { if (!cancelled) setQrDataUrl(dataUrl) })
      .catch(() => { if (!cancelled) setQrDataUrl(null) })
    return () => { cancelled = true }
  }, [url])

  async function handleShare() {
    if (!url) return
    if (navigator.share) {
      try {
        await navigator.share({ title: card.name, url })
      } catch {
        // kullanıcı paylaşım penceresini iptal etti — sessizce geç
      }
      return
    }
    await navigator.clipboard.writeText(url)
    showToast('Kartvizit linki kopyalandı.', 'success')
  }

  const social = card.sosyalMedya ?? {}
  const wa = whatsappLink(social.whatsapp)

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[32px] border border-ink-100 bg-white shadow-xl">
      <div className="relative overflow-hidden bg-gradient-to-br from-remax-navy via-remax-navy to-brand-700 px-6 pb-6 pt-8 text-white">
        <img
          src="/panel/remax-balloon.png"
          alt=""
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rotate-12 opacity-10"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle at 88% -6%, rgba(220,28,46,0.55), transparent 50%)' }}
        />

        <div className="relative flex justify-center">
          {card.avatarUrl ? (
            <img
              src={card.avatarUrl}
              alt={card.name}
              className="h-28 w-28 rounded-full border-4 border-white/85 object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/90 bg-gradient-to-br from-brand-500 to-brand-700 text-4xl font-extrabold text-white shadow-lg">
              {initialsFor(card.name)}
            </div>
          )}
        </div>

        <div className="relative mt-4 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">{card.name}</h1>
          <p className="mt-2 inline-block rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
            {unvanFor(card.role)}
          </p>
        </div>

        <div className="relative mt-3 flex items-center justify-center gap-2">
          <img src="/panel/remax-balloon.png" alt="" className="h-6 w-6 object-contain" />
          <span className="text-xs font-bold tracking-wide text-white/90">RE/MAX LAVANDA</span>
        </div>

        <div className="relative mt-5 flex justify-center gap-3.5">
          <a href={card.telefon ? `tel:${card.telefon}` : undefined} className="flex flex-col items-center gap-1.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Phone size={18} />
            </span>
            <span className="text-[10px] font-semibold text-white/75">Ara</span>
          </a>
          <a href={card.telefon ? `sms:${card.telefon}` : undefined} className="flex flex-col items-center gap-1.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <MessageSquare size={18} />
            </span>
            <span className="text-[10px] font-semibold text-white/75">SMS</span>
          </a>
          <a href={card.email ? `mailto:${card.email}` : undefined} className="flex flex-col items-center gap-1.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Mail size={18} />
            </span>
            <span className="text-[10px] font-semibold text-white/75">E-posta</span>
          </a>
          <a href={OFIS_MAPS_URL} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <MapPin size={18} />
            </span>
            <span className="text-[10px] font-semibold text-white/75">Ofis</span>
          </a>
        </div>
      </div>

      <div className="px-4 pb-4 pt-5">
        {(social.instagram || social.linkedin || wa || social.web) && (
          <>
            <p className="mb-2.5 px-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">İletişim &amp; Sosyal</p>
            <LinkRow icon={InstagramIcon} iconClass="bg-gradient-to-br from-amber-500 via-pink-600 to-purple-600" label="Instagram" value={social.instagram} href={social.instagram} />
            <LinkRow icon={LinkedinIcon} iconClass="bg-[#0a66c2]" label="LinkedIn" value={social.linkedin} href={social.linkedin} />
            <LinkRow icon={WhatsappIcon} iconClass="bg-emerald-500" label="WhatsApp" value={social.whatsapp} href={wa} />
            <LinkRow icon={Globe} iconClass="bg-remax-blue" label="Web / İlanlarım" value={social.web} href={social.web} />
          </>
        )}

        {qrDataUrl && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-ink-50 px-3.5 py-3">
            <img src={qrDataUrl} alt="Kartvizit QR kodu" className="h-14 w-14 rounded-md" />
            <span className="text-xs text-ink-500">Bu kartı QR ile paylaş</span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleShare}
            disabled={!url}
            title="Paylaş"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100 disabled:opacity-40"
          >
            <Share2 size={17} />
          </button>
          <button
            onClick={() => downloadVCard(card)}
            disabled={!card.name}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 disabled:opacity-40"
          >
            <UserPlus size={16} /> Rehbere Ekle
          </button>
        </div>
      </div>
    </div>
  )
}
