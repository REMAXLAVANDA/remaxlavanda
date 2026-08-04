import { useState } from 'react'
import Modal from '../common/Modal'
import {
  ALWAYS_VISIBLE_EVENT_TYPES,
  ATTENDANCE_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  KATILIM_TIPI_LABELS,
  KATILIM_TIPI_OPTIONS,
} from '../../lib/calendar'
import { capitalizeFirst, capitalizeWords } from '../../lib/format'

function toDateInput(iso) {
  return iso ? iso.slice(0, 10) : ''
}
function toTimeInput(iso) {
  return iso ? new Date(iso).toTimeString().slice(0, 5) : ''
}

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

// Yeni Etkinlik formunun aksine burada davetli SİLİNEMEZ/değiştirilemez —
// zaten yanıt vermiş biri için katılım tipini geriye almak veri
// tutarsızlığına yol açar. Sadece henüz davet edilmemiş kişileri EKLEMEK
// mümkün — broker'ın asıl ihtiyacı buydu: "otomatik görünür" diye davetsiz
// kurulmuş zorunlu toplantı/eğitime sonradan davetli eklenebilsin ki
// mazeret bildirme + puanlama o kişi için de çalışsın.
export default function EditEventModal({
  event,
  attendees,
  inviteeOptions,
  onClose,
  onSubmit,
  submitting,
  onAddInvitees,
  addingInvitees,
}) {
  const [form, setForm] = useState({
    type: event.type,
    title: event.title,
    description: event.description ?? '',
    location: event.location ?? '',
    date: toDateInput(event.startAt),
    startTime: toTimeInput(event.startAt),
    endTime: toTimeInput(event.endAt),
    gorunurluk: event.gorunurluk ?? 'davetliler',
  })
  const [newKatilimTipleri, setNewKatilimTipleri] = useState({})
  const [checkedIds, setCheckedIds] = useState([])
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.title.trim().length > 0 && form.date

  const addableOptions = inviteeOptions.filter((u) => !attendees.some((a) => a.userId === u.id))
  const newInviteeCount = Object.keys(newKatilimTipleri).length

  function setKatilimTipi(userId, value) {
    setNewKatilimTipleri((prev) => {
      const next = { ...prev }
      if (value === 'yok') delete next[userId]
      else next[userId] = value
      return next
    })
  }

  function toggleChecked(userId) {
    setCheckedIds((prev) => (prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]))
  }

  function selectAllAddable() {
    setCheckedIds(addableOptions.map((u) => u.id))
  }

  function applyBulk(value) {
    setNewKatilimTipleri((prev) => {
      const next = { ...prev }
      for (const userId of checkedIds) next[userId] = value
      return next
    })
    setCheckedIds([])
  }

  async function handleAddInvitees() {
    if (newInviteeCount === 0) return
    await onAddInvitees(newKatilimTipleri)
    setNewKatilimTipleri({})
  }

  return (
    <Modal title="Etkinliği Düzenle" onClose={onClose}>
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

        {ALWAYS_VISIBLE_EVENT_TYPES.includes(form.type) ? (
          <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
            {EVENT_TYPE_LABELS[form.type]} türü zaten her danışmana otomatik görünür (bilgi amaçlı okunabilir). Ama
            mazeret bildirme ve puanlamaya yansıması için katılması gereken kişileri aşağıdan davet et.
          </p>
        ) : (
          <label className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.gorunurluk === 'herkese_acik'}
              onChange={(e) => set({ gorunurluk: e.target.checked ? 'herkese_acik' : 'davetliler' })}
              className="h-3.5 w-3.5 rounded border-ink-300"
            />
            Herkese açık
            <span className="text-xs text-ink-400">(davet edilmeyen danışmanlar da görüp katılabilir)</span>
          </label>
        )}

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
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>

      <div className="mt-4 border-t border-ink-100 pt-3">
        {attendees.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-ink-400">Davetliler ({attendees.length})</p>
            <div className="max-h-32 space-y-0.5 overflow-y-auto rounded-lg border border-ink-100 p-1.5">
              {attendees.map((a) => (
                <div key={a.userId} className="flex items-center justify-between gap-2 px-1.5 py-1 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink-700">{a.name}</span>
                  <span className={`shrink-0 text-xs font-medium ${SELECT_TEXT_STYLES[a.katilimTipi] ?? SELECT_TEXT_STYLES.yok}`}>
                    {KATILIM_TIPI_LABELS[a.katilimTipi] ?? '—'}
                  </span>
                  <span className="shrink-0 text-xs text-ink-400">{ATTENDANCE_STATUS_LABELS[a.status] ?? a.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
          <p className="text-xs font-medium text-ink-400">
            Davetli Ekle {newInviteeCount > 0 && <span className="text-ink-300">({newInviteeCount})</span>}
          </p>
          {checkedIds.length > 0 ? (
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
              <button
                type="button"
                onClick={() => setCheckedIds([])}
                className="rounded-full bg-ink-50 px-2 py-1 text-[11px] font-medium text-ink-500 hover:bg-ink-100"
              >
                Seçimi Temizle
              </button>
            </div>
          ) : (
            addableOptions.length > 0 && (
              <button
                type="button"
                onClick={selectAllAddable}
                className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-100"
              >
                Tüm Ofis
              </button>
            )
          )}
        </div>

        {addableOptions.length === 0 ? (
          <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-400">
            Eklenebilecek herkes zaten davetli.
          </p>
        ) : (
          <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-ink-100 p-1.5">
            {addableOptions.map((u) => {
              const value = newKatilimTipleri[u.id] ?? 'yok'
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
        )}

        {newInviteeCount > 0 && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleAddInvitees}
              disabled={addingInvitees}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {addingInvitees ? 'Ekleniyor...' : `${newInviteeCount} kişiyi davet et`}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
