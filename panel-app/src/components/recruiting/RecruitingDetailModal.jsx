import { useMemo, useState } from 'react'
import { RotateCcw, Info, CalendarClock, MessageSquare, Trash2 } from 'lucide-react'
import Modal from '../common/Modal'
import { formatPhoneInput, whatsappHref } from '../../lib/phone'
import { WhatsappIcon } from '../kartvizit/BrandIcons'
import { capitalizeWords, capitalizeFirst, formatDateOnly, formatDateTime } from '../../lib/format'
import {
  RECRUITING_DURUM_SECILEBILIR,
  RECRUITING_DURUM_LABELS,
  RECRUITING_KAYNAKLARI,
  RECRUITING_KAYNAK_LABELS,
  RECRUITING_OLUMSUZ_SEBEPLERI,
  RECRUITING_OLUMSUZ_SEBEP_LABELS,
  candidateInviteMessage,
} from '../../lib/recruiting'

const onlyDigits = (v) => (v ?? '').replace(/\D/g, '')

// interviewEvent.startAt (ISO) -> ayrı date/time input değerleri. Yeni
// aday ya da henüz görüşme tarihi girilmemiş adayda ikisi de boş.
function toDateTimeParts(iso) {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

// Var olan görüşmenin süresini startAt/endAt farkından geri hesaplar —
// düzenlerken süre seçici sessizce 30 dakikaya dönmesin diye. endAt
// eksikse (bu düzeltmeden önce oluşturulmuş eski kayıtlar) ya da
// seçeneklerden biri değilse varsayılan 30 dakikaya düşer.
const DURATION_OPTIONS = [15, 30, 45, 60]
function toDurationMinutes(event) {
  if (!event?.startAt || !event?.endAt) return 30
  const minutes = Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60000)
  return DURATION_OPTIONS.includes(minutes) ? minutes : 30
}

// Hem "+ Yeni Aday" (candidate=null) hem satır tıklaması (candidate=mevcut
// kayıt) AYNI paneli açar. initialValues: Lead Havuzu'ndan "Recruiting'e Dönüştür" ile
// açıldığında ön-dolu alanlar (bkz. Leads.jsx handleConvertToRecruiting).
// Bir gayrimenkul danışmanının işe alım adayına atanması hiçbir bağlamda
// anlamlı değil ("biz herhangi bir gayrimenkul danışmanı da bunu
// atamayacağız" kararı) — bu yüzden atananDanismanId seçimi buradan
// TAMAMEN kaldırıldı (sadece Lead dönüşümünde değil, Recruiting'in kendi
// yönetim ekranında da). Eski kayıtlarda kolon/veri DB'de durabilir,
// RecruitingBoard/RecruitingFilters'taki salt-okunur gösterim ve filtre
// buna dokunmuyor — sadece BURADAN bir daha set edilemiyor.
export default function RecruitingDetailModal({
  candidate,
  initialValues,
  existingCandidates = [],
  interviewEvent,
  onClose,
  onSubmit,
  onReactivate,
  onConvertToDanisman,
  submitting,
  notes = [],
  resolveName,
  onAddNote,
  onDeleteNote,
  noteSubmitting,
  canDeleteNotes,
}) {
  const interviewParts = toDateTimeParts(interviewEvent?.startAt)
  const [newNote, setNewNote] = useState('')
  const [form, setForm] = useState({
    kaynak: candidate?.kaynak ?? initialValues?.kaynak ?? 'diger',
    adSoyad: candidate?.adSoyad ?? initialValues?.adSoyad ?? '',
    telefon: candidate?.telefon ?? initialValues?.telefon ?? '',
    email: candidate?.email ?? initialValues?.email ?? '',
    durum: candidate?.durum ?? 'yeni_basvuru',
    olumsuzSebebi: candidate?.olumsuzSebebi ?? '',
    aciklama: candidate?.aciklama ?? '',
    gorusmeTarih: interviewParts.date,
    gorusmeSaat: interviewParts.time,
    gorusmeSure: toDurationMinutes(interviewEvent),
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.adSoyad.trim().length > 0 && (form.durum !== 'olumsuz' || form.olumsuzSebebi.length > 0)
  const isOlumlu = candidate?.durum === 'olumlu'

  // Aynı numarayla daha önce aday girilmiş mi — sadece YENİ aday eklerken
  // anlamlı (düzenlerken kayıt kendi numarasıyla eşleşip yanlış uyarı
  // verir), o yüzden candidate varken hiç hesaplanmıyor. Engellemiyor,
  // sadece bilgilendiriyor (bkz. "tekrar giriliyorsa uyarı verse" isteği).
  const duplicateMatch = useMemo(() => {
    if (candidate) return null
    const digits = onlyDigits(form.telefon)
    if (digits.length !== 11) return null
    return existingCandidates.find((c) => onlyDigits(c.telefon) === digits) ?? null
  }, [candidate, form.telefon, existingCandidates])

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      ...form,
      adSoyad: capitalizeWords(form.adSoyad.trim()),
      telefon: form.telefon ? formatPhoneInput(form.telefon) : '',
      email: form.email.trim(),
      aciklama: capitalizeFirst(form.aciklama.trim()),
      olumsuzSebebi: form.durum === 'olumsuz' ? form.olumsuzSebebi : null,
      kaynakLeadId: candidate ? undefined : (initialValues?.kaynakLeadId ?? null),
      // Saat girilmeden tarih anlamsız — ikisi birlikte doluysa Takvim'e
      // işleniyor (bkz. Recruiting.jsx handleSave), biri eksikse hiç
      // gönderilmiyor.
      gorusmeTarih: form.gorusmeTarih && form.gorusmeSaat ? form.gorusmeTarih : '',
      gorusmeSaat: form.gorusmeTarih && form.gorusmeSaat ? form.gorusmeSaat : '',
    })
  }

  return (
    <Modal title={candidate ? 'Aday Detayı' : 'Yeni Aday'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Arşivden taşınmış, henüz raporlu sürece alınmamış kayıtlar için
            — kayit_tipi='gecmis' olan HER kayıtta görünür, durum fark
            etmez (bkz. lib/recruiting.js / Recruiting.jsx handleReactivate). */}
        {candidate?.kayitTipi === 'gecmis' && (
          <div className="rounded-lg bg-surface-sunken p-3">
            <button
              type="button"
              onClick={() => onReactivate(candidate)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-raised px-3 py-2 text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-50"
            >
              <RotateCcw size={14} /> Yeniden Aktifleştir
            </button>
          </div>
        )}
        <input
          required
          value={form.adSoyad}
          onChange={(e) => set({ adSoyad: e.target.value })}
          onBlur={(e) => set({ adSoyad: capitalizeWords(e.target.value) })}
          placeholder="Ad Soyad"
          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <input
                type="tel"
                value={form.telefon}
                onChange={(e) => set({ telefon: formatPhoneInput(e.target.value) })}
                placeholder="Telefon"
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              />
              {form.telefon && (
                <a
                  href={whatsappHref(form.telefon, candidateInviteMessage(form))}
                  target="_blank"
                  rel="noreferrer"
                  title="Davet mesajıyla WhatsApp'ta aç"
                  className="shrink-0 text-emerald-600 hover:text-emerald-700"
                >
                  <WhatsappIcon size={16} />
                </a>
              )}
            </div>
            {duplicateMatch && (
              <p className="mt-1 flex items-start gap-1 text-xs text-amber-600">
                <Info size={13} className="mt-0.5 shrink-0" />
                Bu numarayla daha önce aday girilmiş: {duplicateMatch.adSoyad} — {formatDateOnly(duplicateMatch.createdAt)}
              </p>
            )}
          </div>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="E-posta"
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </div>

        <select
          value={form.kaynak}
          onChange={(e) => set({ kaynak: e.target.value })}
          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
        >
          {RECRUITING_KAYNAKLARI.map((k) => (
            <option key={k} value={k}>
              {RECRUITING_KAYNAK_LABELS[k]}
            </option>
          ))}
        </select>

        {/* Durum ("Karar") ve Olumsuz'un Sebebi AYNI satırda/bölümde —
            broker: "karar kısmına taşı, ben oradan yeni menülerden
            seçeyim" (2026-09-28). Sebep artık durumun hemen yanında,
            ayrı bir alt blok değil. */}
        {isOlumlu ? (
          <div className="flex w-full items-center rounded-lg border border-remax-navy/20 bg-remax-navy/5 px-3 py-2 text-sm font-medium text-remax-navy">
            Danışman olarak eklendi ✓
          </div>
        ) : (
          <div>
            <div className={form.durum === 'olumsuz' ? 'grid grid-cols-2 gap-2' : ''}>
              <select
                value={form.durum}
                onChange={(e) => set({ durum: e.target.value, olumsuzSebebi: e.target.value === 'olumsuz' ? form.olumsuzSebebi : '' })}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
              >
                {RECRUITING_DURUM_SECILEBILIR.map((d) => (
                  <option key={d} value={d}>
                    {RECRUITING_DURUM_LABELS[d]}
                  </option>
                ))}
              </select>
              {form.durum === 'olumsuz' && (
                <select
                  required
                  value={form.olumsuzSebebi}
                  onChange={(e) => set({ olumsuzSebebi: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-text-primary ${
                    form.olumsuzSebebi ? 'border-border-default' : 'border-amber-300'
                  }`}
                >
                  <option value="" disabled>
                    Sebep seç...
                  </option>
                  {RECRUITING_OLUMSUZ_SEBEPLERI.map((s) => (
                    <option key={s} value={s}>
                      {RECRUITING_OLUMSUZ_SEBEP_LABELS[s]}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {/* Kaydet butonu sessizce pasif kalmasın diye — broker'ın
                kendisinin "olumsuz seçilince sebep seçilebilsin" isteği
                zorunlu kıldı, ama neden pasif olduğu görünmeyince
                "kaydet çalışmıyor" diye bug sanılabiliyordu (bkz.
                2026-09-28 geri bildirimi). */}
            {form.durum === 'olumsuz' && !form.olumsuzSebebi && (
              <p className="mt-1 flex items-start gap-1 text-xs text-amber-600">
                <Info size={13} className="mt-0.5 shrink-0" />
                Sebep seçilmeden kaydedilemez.
              </p>
            )}
          </div>
        )}

        {candidate && !isOlumlu && (
          <button
            type="button"
            onClick={() => onConvertToDanisman(candidate)}
            className="w-full rounded-lg bg-remax-navy/10 px-3 py-2 text-sm font-medium text-remax-navy hover:bg-remax-navy/20"
          >
            Danışman Olarak Ekle
          </button>
        )}

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <CalendarClock size={13} /> Görüşme / Randevu Tarihi
            <span className="font-normal text-text-muted">(opsiyonel — Takvim'e işlenir)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.gorusmeTarih}
              onChange={(e) => set({ gorusmeTarih: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
            <input
              type="time"
              value={form.gorusmeSaat}
              onChange={(e) => set({ gorusmeSaat: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <select
            value={form.gorusmeSure}
            onChange={(e) => set({ gorusmeSure: Number(e.target.value) })}
            className="mt-2 w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
          >
            {DURATION_OPTIONS.map((dk) => (
              <option key={dk} value={dk}>
                {dk} dakika
              </option>
            ))}
          </select>
        </div>

        {/* Görüşme notları BİLEREK en altta, formun son bloğu (2026-09-29
            broker: "açıklamalar en altta olmalı... artı ile açıklama
            ekleme özelliğini en alta alalım") — eskiden burada hem bu
            birikimli not günlüğü hem de altında ayrı, tek satırlık
            "Açıklama" kutusu vardı; iki ayrı boş kutu kafa karıştırıyordu.
            Kayıtlı bir adayda artık TEK blok var: birikimli notlar + üste
            ekleme kutusu. Yeni not her zaman otomatik created_at alır
            (DB'de default now(), bkz. migration 20260927190000) — burada
            gösterimi relativeTime'ın gün çözünürlüğünden (sadece
            "bugün/dün") formatDateTime'a (gün+saat) geçirildi.
            Eski recruiting_candidates.aciklama (598 kayıttan 499'unda dolu
            — çoğunlukla referans/kaynak bilgisi) SİLİNMEDİ/taşınmadı,
            artık düzenlenemiyor ama veri kaybolmasın diye listenin en
            altına (en eski kayıt olarak) salt-okunur "Genel not"
            şeklinde ekleniyor. SADECE kayıtlı bir adayda görünür — henüz
            kaydedilmemiş yeni adayda not eklenecek bir candidate.id yok,
            o yüzden yeni aday eklerken açıklama kutusu eskisi gibi kalıyor. */}
        {candidate ? (
          <div className="rounded-lg border border-border-default p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <MessageSquare size={13} /> Görüşme Notları
              <span className="font-normal text-text-muted">({notes.length + (form.aciklama.trim() ? 1 : 0)})</span>
            </p>
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Görüşme/randevu notu ekle..."
                rows={2}
                className="w-full rounded-lg border border-border-default px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted"
              />
              <button
                type="button"
                disabled={!newNote.trim() || noteSubmitting}
                onClick={() => {
                  onAddNote(capitalizeFirst(newNote.trim()))
                  setNewNote('')
                }}
                className="shrink-0 self-start rounded-lg bg-surface-sunken px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-border-subtle disabled:opacity-50"
              >
                Ekle
              </button>
            </div>
            {(notes.length > 0 || form.aciklama.trim()) && (
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-lg bg-surface-sunken p-2 text-xs">
                    <div className="mb-1 flex items-center justify-between gap-2 text-text-muted">
                      <span className="font-medium text-text-secondary">{resolveName?.(n.createdBy) ?? '—'}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {formatDateTime(n.createdAt)}
                        {canDeleteNotes && (
                          <button
                            type="button"
                            onClick={() => onDeleteNote(n.id)}
                            title="Notu sil"
                            className="rounded p-0.5 text-text-muted hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-text-primary">{n.notMetni}</p>
                  </div>
                ))}
                {form.aciklama.trim() && (
                  <div className="rounded-lg bg-surface-sunken p-2 text-xs">
                    <div className="mb-1 flex items-center justify-between gap-2 text-text-muted">
                      <span className="font-medium text-text-secondary">Genel not</span>
                      <span className="shrink-0">{formatDateOnly(candidate.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-text-primary">{form.aciklama}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={form.aciklama}
            onChange={(e) => set({ aciklama: e.target.value })}
            placeholder="Açıklama"
            rows={2}
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken"
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
    </Modal>
  )
}
