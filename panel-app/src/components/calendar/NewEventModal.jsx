import { useState } from 'react'
import Modal from '../common/Modal'
import { EVENT_TYPE_LABELS, KATILIM_TIPI_OPTIONS, KATILIM_TIPI_LABELS } from '../../lib/calendar'
import { capitalizeFirst, capitalizeWords } from '../../lib/format'

const EMPTY_FORM = {
  type: 'toplanti',
  title: '',
  description: '',
  location: '',
  date: '',
  startTime: '10:00',
  endTime: '11:00',
  // { [userId]: 'zorunlu'|'onerilen'|'istege_bagli' } — davetli listesi bu
  // sözlüğün anahtarları. "Davet Edilmedi" ayrı bir değer DEĞİL, burada hiç
  // olmamak demek (bkz. broker isteği: 4. seçenek aslında yokluk).
  katilimTipleri: {},
  // Aylık Etkinlik Panosu'na (WhatsApp/TV görseli) dahil edilsin mi — bkz.
  // brief: "yönetici sadece ... gibi etkinlikleri seçecek".
  panoGoster: false,
}

// Select'in kendi rengi de katılım tipini yansıtsın diye (bkz. broker
// isteği: 🔴🟡⚪ renk kodlaması) — KATILIM_TIPI_STYLES rozet (bg+text) için,
// bu ise sade metin rengi için ayrı tutuluyor.
const SELECT_TEXT_STYLES = {
  yok: 'text-ink-400',
  zorunlu: 'text-red-600',
  onerilen: 'text-amber-700',
  istege_bagli: 'text-ink-600',
}

const BULK_ACTIONS = [
  { value: 'zorunlu', label: 'Zorunlu Yap', className: 'bg-red-50 text-red-600 hover:bg-red-100' },
  { value: 'onerilen', label: 'Önerilen Yap', className: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { value: 'istege_bagli', label: 'İsteğe Bağlı Yap', className: 'bg-ink-100 text-ink-600 hover:bg-ink-200' },
]

export default function NewEventModal({ onClose, onSubmit, submitting, inviteeOptions }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [checkedIds, setCheckedIds] = useState([])
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const canSubmit = form.title.trim().length > 0 && form.date
  const inviteeCount = Object.keys(form.katilimTipleri).length

  function setKatilimTipi(userId, value) {
    setForm((f) => {
      const next = { ...f.katilimTipleri }
      if (value === 'yok') delete next[userId]
      else next[userId] = value
      return { ...f, katilimTipleri: next }
    })
  }

  function toggleChecked(userId) {
    setCheckedIds((prev) => (prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]))
  }

  // Yönetici Deneyimi madde 4: "gerekirse toplu seçim yapabilir" — birden
  // fazla kişiyi işaretleyip tek tıkla aynı katılım tipine geçirir (ör.
  // önce yeni başlayanları işaretle → Zorunlu Yap, sonra ilk yılı
  // dolmayanları işaretle → Önerilen Yap).
  function applyBulk(value) {
    setForm((f) => {
      const next = { ...f.katilimTipleri }
      for (const userId of checkedIds) next[userId] = value
      return { ...f, katilimTipleri: next }
    })
    setCheckedIds([])
  }

  return (
    <Modal title="Yeni Etkinlik" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({
            ...form,
            title: capitalizeFirst(form.title.trim()),
            location: capitalizeWords(form.location.trim()),
            description: capitalizeFirst(form.description.trim()),
          })
        }}
        className="space-y-3"
      >
        <select
          value={form.type}
          onChange={(e) => set({ type: e.target.value })}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <input
          required
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          onBlur={(e) => set({ title: capitalizeFirst(e.target.value) })}
          placeholder="Başlık"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <div className="flex gap-2">
          <input
            required
            type="date"
            value={form.date}
            onChange={(e) => set({ date: e.target.value })}
            className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          />
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => set({ startTime: e.target.value })}
            className="w-24 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          />
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => set({ endTime: e.target.value })}
            className="w-24 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          />
        </div>

        <input
          value={form.location}
          onChange={(e) => set({ location: e.target.value })}
          onBlur={(e) => set({ location: capitalizeWords(e.target.value) })}
          placeholder="Konum"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <textarea
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          onBlur={(e) => set({ description: capitalizeFirst(e.target.value) })}
          placeholder="Açıklama"
          rows={2}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <label className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.panoGoster}
            onChange={(e) => set({ panoGoster: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-ink-300"
          />
          Aylık Etkinlik Panosunda göster
          <span className="text-xs text-ink-400">(WhatsApp/TV için indirilebilir görsel)</span>
        </label>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
            <p className="text-xs font-medium text-ink-400">
              Davetliler ve Katılım Tipi {inviteeCount > 0 && <span className="text-ink-300">({inviteeCount})</span>}
            </p>
            {checkedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-ink-400">{checkedIds.length} kişi seçili:</span>
                {BULK_ACTIONS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => applyBulk(a.value)}
                    className={`rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${a.className}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-ink-100 p-1.5">
            {inviteeOptions.map((u) => {
              const value = form.katilimTipleri[u.id] ?? 'yok'
              return (
                <div key={u.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-ink-50">
                  <input
                    type="checkbox"
                    checked={checkedIds.includes(u.id)}
                    onChange={() => toggleChecked(u.id)}
                    className="h-3.5 w-3.5 shrink-0 rounded border-ink-300"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{u.name}</span>
                  <select
                    value={value}
                    onChange={(e) => setKatilimTipi(u.id, e.target.value)}
                    className={`shrink-0 rounded-lg border border-ink-200 px-2 py-1 text-xs font-medium ${SELECT_TEXT_STYLES[value]}`}
                  >
                    <option value="yok">Davet Edilmedi</option>
                    {KATILIM_TIPI_OPTIONS.map((key) => (
                      <option key={key} value={key}>
                        {KATILIM_TIPI_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
