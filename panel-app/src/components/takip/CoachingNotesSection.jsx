import { useState } from 'react'
import { Plus, Check, RotateCcw } from 'lucide-react'
import { GORUSME_TURU_LABELS, DURUM_LABELS, DURUM_STYLES } from '../../lib/coachingNotes'
import { formatDateOnly } from '../../lib/format'

function emptyForm() {
  return { gorusmeTuru: 'birebir', konusulanlar: '', hedefAksiyon: '', takipTarihi: '' }
}

// Kaldırılan "Broker Notları"nın (hiç gerçek veriye bağlı olmayan mock
// özellik) yerine — sadece broker/owner'a açık, gerçek bir tabloya yazan
// bölüm (bkz. migration 20261006090000, lib/coachingNotes.js).
// "Konuşulanlar" SADECE bu ekranda (yönetimde) görünür — danışmanın kendi
// Panel'i bu alanı hiç çekmiyor bile (ayrı, dar bir görünümden geliyor).
export default function CoachingNotesSection({ notes, onAdd, onToggleDurum, submitting }) {
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.konusulanlar.trim().length > 0

  const sorted = [...notes].sort((a, b) => new Date(b.gorusmeTarihi) - new Date(a.gorusmeTarihi))

  return (
    <div className="mt-5 border-t border-ink-100 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-ink-400">Koçluk Notları ({notes.length})</p>
        {!formOpen && (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            <Plus size={13} /> Not Ekle
          </button>
        )}
      </div>

      {formOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSubmit) return
            onAdd({ ...form, konusulanlar: form.konusulanlar.trim(), hedefAksiyon: form.hedefAksiyon.trim() || null })
            setForm(emptyForm())
            setFormOpen(false)
          }}
          className="mb-4 space-y-2 rounded-xl border border-ink-100 bg-ink-50/60 p-3"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="cn-tur">
              Görüşme türü
            </label>
            <select
              id="cn-tur"
              value={form.gorusmeTuru}
              onChange={(e) => set({ gorusmeTuru: e.target.value })}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800"
            >
              {Object.entries(GORUSME_TURU_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="cn-konusulan">
              Konuşulanlar <span className="text-red-600">*</span>
              <span className="ml-1 font-normal text-ink-400">— sadece yönetim görür</span>
            </label>
            <textarea
              id="cn-konusulan"
              required
              value={form.konusulanlar}
              onChange={(e) => set({ konusulanlar: e.target.value })}
              placeholder="Görüşmede ne konuşuldu, hangi kararlar alındı..."
              rows={3}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="cn-hedef">
              Hedef / Aksiyon
              <span className="ml-1 font-normal text-ink-400">— danışman kendi Panel'inde de görür</span>
            </label>
            <textarea
              id="cn-hedef"
              value={form.hedefAksiyon}
              onChange={(e) => set({ hedefAksiyon: e.target.value })}
              placeholder="Danışmandan beklenen somut aksiyon (opsiyonel)"
              rows={2}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="cn-takip">
              Takip tarihi
            </label>
            <input
              id="cn-takip"
              type="date"
              value={form.takipTarihi}
              onChange={(e) => set({ takipTarihi: e.target.value })}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setFormOpen(false)
                setForm(emptyForm())
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-500 hover:bg-ink-100"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-ink-400">Henüz koçluk notu yok.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((n) => (
            <div key={n.id} className="rounded-xl border border-ink-100 bg-white p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium text-ink-700">{formatDateOnly(n.gorusmeTarihi)}</span>
                <span className="text-ink-400">· {GORUSME_TURU_LABELS[n.gorusmeTuru] ?? n.gorusmeTuru}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 font-medium ${DURUM_STYLES[n.durum]}`}>
                  {DURUM_LABELS[n.durum]}
                </span>
              </div>
              <p className="text-ink-700">{n.konusulanlar}</p>
              {n.hedefAksiyon && (
                <p className="mt-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs text-brand-700">
                  <span className="font-medium">Hedef:</span> {n.hedefAksiyon}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-ink-400">
                  {n.takipTarihi ? `Takip: ${formatDateOnly(n.takipTarihi)}` : ''}
                </span>
                {n.durum === 'acik' ? (
                  <button
                    onClick={() => onToggleDurum(n.id, 'tamamlandi')}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    <Check size={13} /> Tamamlandı işaretle
                  </button>
                ) : (
                  <button
                    onClick={() => onToggleDurum(n.id, 'acik')}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-500 hover:bg-ink-100"
                  >
                    <RotateCcw size={13} /> Yeniden aç
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
