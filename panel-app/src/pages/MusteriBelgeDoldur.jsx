import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, FileText } from 'lucide-react'
import { getDocumentByFillToken, submitDocumentByFillToken } from '../lib/publicFillClient'
import BelgeFieldInput from '../components/rehber/BelgeFieldInput'

// Girişsiz açılan, herkese açık belge doldurma sayfası — /belge-doldur/:token.
// Danışmanın müşteriye attığı link buraya gelir (2026-08-22 broker isteği:
// "danışman link müşterisine atarsa o da doldurabilir"). KartvizitPublic ile
// aynı desen: AppLayout dışında, kendi minimal iskeleti, giriş gerektirmez.
export default function MusteriBelgeDoldur() {
  const { token } = useParams()
  const [state, setState] = useState({ loading: true, doc: null, error: null })
  const [formData, setFormData] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let cancelled = false
    getDocumentByFillToken(token)
      .then((doc) => {
        if (cancelled) return
        setState({ loading: false, doc, error: null })
        setFormData({ ...(doc.data ?? {}) })
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, doc: null, error: err.message ?? 'Belge yüklenemedi.' })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  function handleChange(fieldKey, value) {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await submitDocumentByFillToken(token, formData, state.doc?._mockId)
      setSubmitted(true)
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message ?? 'Gönderilemedi, tekrar dene.' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold text-ink-900">RE/MAX Lavanda</p>
        </div>

        {state.loading && <p className="py-16 text-center text-sm text-ink-400">Yükleniyor…</p>}

        {!state.loading && state.error && (
          <div className="mx-auto max-w-sm rounded-2xl border border-ink-100 bg-white p-8 text-center">
            <p className="text-sm font-medium text-ink-700">{state.error}</p>
          </div>
        )}

        {!state.loading && !state.error && submitted && (
          <div className="mx-auto max-w-sm rounded-2xl border border-ink-100 bg-white p-8 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-sm font-medium text-ink-700">Gönderildi, teşekkürler</p>
            <p className="mt-1 text-xs text-ink-400">Bilgilerin RE/MAX Lavanda'ya ulaştı.</p>
          </div>
        )}

        {!state.loading && !state.error && !submitted && state.doc && (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-ink-100 bg-white p-6">
            <div className="mb-5 flex items-center gap-2.5 border-b border-ink-100 pb-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <FileText size={17} />
              </div>
              <p className="text-sm font-semibold text-ink-900">{state.doc.templateName}</p>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {state.doc.fields.map((field) => (
                <div key={field.fieldKey ?? field.id} className={field.fieldType === 'textarea' ? 'sm:col-span-2' : ''}>
                  <BelgeFieldInput
                    field={field}
                    value={formData[field.fieldKey]}
                    onChange={(v) => handleChange(field.fieldKey, v)}
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'Gönderiliyor…' : 'Gönder'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
