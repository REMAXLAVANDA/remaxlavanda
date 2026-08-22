import { useState } from 'react'
import { Info, Lock, Download, Copy, Check, Send, MessageCircle, Link as LinkIcon } from 'lucide-react'
import Modal from '../common/Modal'
import ConfirmDialog from '../common/ConfirmDialog'
import { SUPABASE_URL } from '../../lib/env'
import { formatDateOnly } from '../../lib/format'
import BelgeFieldInput from './BelgeFieldInput'

function fillLinkUrl(fillToken) {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/belge-doldur/${fillToken}`
}

function ShareLinkPanel({ fillToken, templateName }) {
  const [copied, setCopied] = useState(false)
  const link = fillLinkUrl(fillToken)
  const message = `Merhaba, RE/MAX Lavanda "${templateName}" belgesi için lütfen bilgilerini bu linkten doldurup gönder: ${link}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Panoya erişim izni yoksa sessizce vazgeçiyoruz — link zaten görünür/seçilebilir.
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-brand-700">
        <LinkIcon size={13} /> Müşteri linki hazır
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 truncate rounded-lg border border-border-default bg-white px-2.5 py-1.5 text-xs text-text-secondary"
        />
        <button
          onClick={handleCopy}
          title="Kopyala"
          className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-text-secondary shadow-sm hover:bg-surface-sunken"
        >
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
          title="WhatsApp'ta Paylaş"
          className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
        >
          <MessageCircle size={13} />
        </a>
      </div>
      <p className="text-xs text-text-disabled">Müşteri doldurup gönderince kayıt otomatik ofis kuyruğuna düşer.</p>
    </div>
  )
}

export default function BelgeDoldurForm({
  template,
  fields,
  instance,
  viewerOnly,
  canConvert,
  isOwner,
  onClose,
  onSaveDraft,
  onSend,
  onGenerate,
  onCreateShareLink,
  saving,
  sending,
  generating,
  sharing,
}) {
  const [formData, setFormData] = useState(() => ({ ...(instance?.data ?? {}) }))
  const [confirmingGenerate, setConfirmingGenerate] = useState(false)
  const isLocked = instance?.status === 'completed'
  const isSent = instance?.status === 'sent'
  const canEditNow = !isLocked && !viewerOnly && (isOwner || canConvert)

  function handleChange(fieldKey, value) {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }))
  }

  if (isLocked) {
    const downloadUrl = `${SUPABASE_URL}/functions/v1/download-document?token=${instance.downloadToken}`
    return (
      <Modal title={template.name} onClose={onClose} maxWidth="max-w-md">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Lock size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Bu belge kilitlendi</p>
            <p className="mt-1 text-xs text-text-secondary">
              Artık düzenlenemez. Karşı tarafa aşağıdaki linki paylaşarak indirmesini sağlayabilirsin — link{' '}
              {instance.downloadExpiresAt ? formatDateOnly(instance.downloadExpiresAt) : '7 gün'} tarihine kadar geçerli.
            </p>
          </div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Download size={15} /> PDF'i İndir
          </a>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={template.name} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        {isSent && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              {canConvert
                ? 'Bu belge gönderildi, PDF\'e çevirmeyi bekliyor.'
                : 'Bu belge gönderildi, ofis PDF\'e çevirecek. Artık düzenleyemezsin.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.id} className={field.fieldType === 'textarea' ? 'sm:col-span-2' : ''}>
              <BelgeFieldInput
                field={field}
                value={formData[field.fieldKey]}
                onChange={(v) => handleChange(field.fieldKey, v)}
                disabled={!canEditNow}
              />
            </div>
          ))}
        </div>

        {canEditNow && !canConvert && instance?.fillToken && instance.status === 'draft' && (
          <ShareLinkPanel fillToken={instance.fillToken} templateName={template.name} />
        )}

        {canEditNow && canConvert && (
          <div className="flex items-start gap-2 rounded-lg bg-surface-sunken px-3 py-2.5 text-xs text-text-secondary">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>"Oluştur ve Kilitle" ile üretilen PDF artık değiştirilemez — yanlışsa yeni bir kayıt açman gerekir.</span>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border-default pt-3.5">
          <button
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken"
          >
            {canEditNow ? 'Vazgeç' : 'Kapat'}
          </button>

          {canEditNow && (
            <button
              onClick={() => onSaveDraft(formData)}
              disabled={saving || sending || generating || sharing}
              className="rounded-lg border border-border-default px-3.5 py-2 text-sm font-medium text-text-primary hover:bg-surface-sunken disabled:opacity-60"
            >
              {saving ? 'Kaydediliyor…' : 'Taslağı Kaydet'}
            </button>
          )}

          {canEditNow && !canConvert && !isSent && (
            <button
              onClick={() => onCreateShareLink(formData)}
              disabled={saving || sending || generating || sharing}
              className="flex items-center gap-1.5 rounded-lg border border-border-default px-3.5 py-2 text-sm font-medium text-text-primary hover:bg-surface-sunken disabled:opacity-60"
            >
              <LinkIcon size={14} /> {sharing ? 'Link hazırlanıyor…' : 'Müşteriye Link Gönder'}
            </button>
          )}

          {canEditNow && !canConvert && !isSent && (
            <button
              onClick={() => onSend(formData)}
              disabled={saving || sending || generating || sharing}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <Send size={14} /> {sending ? 'Gönderiliyor…' : 'Gönder'}
            </button>
          )}

          {canEditNow && canConvert && (
            <button
              onClick={() => setConfirmingGenerate(true)}
              disabled={saving || sending || generating || sharing}
              className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {generating ? 'Oluşturuluyor…' : 'Oluştur ve Kilitle'}
            </button>
          )}
        </div>
      </div>

      {confirmingGenerate && (
        <ConfirmDialog
          title="Belgeyi oluşturup kilitleyelim mi?"
          message="PDF üretildikten sonra bu kayıt artık düzenlenemez. Alanları kontrol ettin mi?"
          confirmLabel="Evet, oluştur"
          onConfirm={() => {
            setConfirmingGenerate(false)
            onGenerate(formData)
          }}
          onCancel={() => setConfirmingGenerate(false)}
        />
      )}
    </Modal>
  )
}
