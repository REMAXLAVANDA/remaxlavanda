import { useMemo, useState } from 'react'
import { KeyRound, Pencil, Trash2, CreditCard } from 'lucide-react'
import { ROLES, ROLE_LABELS } from '../../lib/roles'
import { relativeTime } from '../../lib/format'
import { hasKartvizit, kartvizitUrl } from '../../lib/kartvizit'

const ASSIGNABLE_ROLES = [ROLES.DANISMAN, ROLES.OFIS, ROLES.OWNER, ROLES.BROKER]
const SORT_OPTIONS = [
  { key: 'ad', label: 'İsme göre' },
  { key: 'rol', label: 'Role göre' },
  { key: 'kayit', label: 'Kayıt tarihine göre (yeni önce)' },
]

function sortRows(rows, sortKey) {
  const list = [...rows]
  if (sortKey === 'rol') return list.sort((a, b) => a.role.localeCompare(b.role))
  if (sortKey === 'kayit') return list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  return list.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}

export default function UsersTable({
  rows,
  canManage,
  currentUserId,
  onChangeRole,
  onToggleDurum,
  onToggleTestHesabi,
  onEdit,
  onDeleteRequest,
  onResetPasswordRequest,
  pendingWorkByUserId = {},
  onDevretRequest,
}) {
  const [sortKey, setSortKey] = useState('ad')
  // Pasif danışman/kullanıcı sayısı arttıkça liste gereksiz kalabalıklaşıyordu
  // (broker: "pasifleri gösterme, yanda bir butonla pasifleri de
  // görebilelim") — varsayılan SADECE aktif kullanıcılar, pasifler isteğe
  // bağlı bir anahtarla açılıyor.
  const [showPasif, setShowPasif] = useState(false)
  const pasifCount = useMemo(() => rows.filter((u) => u.durum === 'pasif').length, [rows])
  const visibleRows = useMemo(() => (showPasif ? rows : rows.filter((u) => u.durum === 'aktif')), [rows, showPasif])
  const sorted = useMemo(() => sortRows(visibleRows, sortKey), [visibleRows, sortKey])

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-text-muted">Henüz kullanıcı yok.</p>
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        {pasifCount > 0 && (
          <button
            onClick={() => setShowPasif((v) => !v)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
              showPasif ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-text-secondary hover:bg-border-subtle'
            }`}
          >
            {showPasif ? 'Pasifleri Gizle' : `Pasifleri Göster (${pasifCount})`}
          </button>
        )}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-secondary"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 && (
        <p className="py-8 text-center text-sm text-text-muted">Aktif kullanıcı yok.</p>
      )}

      <div className="space-y-2">
        {sorted.map((u) => (
          <div key={u.id} className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-raised p-3.5 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="min-w-0 sm:flex-1">
              <p className="text-sm font-medium text-text-primary">{u.name}</p>
              <p className="text-xs text-text-muted">
                {u.email ?? '—'}
                {u.createdAt && <> · Kayıt: {relativeTime(u.createdAt)}</>}
              </p>
              {/* Recruiting'den "Danışman Olarak Ekle" ile açılmış hesaplarda
                  dolar (bkz. lib/recruiting.js candidateKaynakOzeti, broker
                  kararı: "o danışmanları biz nereden aldığımızı bilelim"). */}
              {u.kaynak && <p className="mt-0.5 text-xs text-text-muted">Kaynak: {u.kaynak}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Kendi rolünü/durumunu değiştirme — broker/owner dahil —
                  artık DB trigger'ıyla da engelleniyor (20261003170000
                  migration, broker kararı: "en az bir broker kalmalı"
                  riskini kapatmak için). Burada önceden devre dışı
                  bırakılıyor ki kullanıcı DB hatası almadan anlasın. */}
              {canManage && u.id !== currentUserId ? (
                <select
                  value={u.role}
                  onChange={(e) => onChangeRole(u.id, e.target.value)}
                  className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-secondary"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  title={canManage && u.id === currentUserId ? 'Kendi rolünü değiştiremezsin.' : undefined}
                  className="rounded-full bg-border-subtle px-2.5 py-1 text-xs font-medium text-text-secondary"
                >
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>
              )}

              <button
                disabled={!canManage || u.id === currentUserId}
                title={canManage && u.id === currentUserId ? 'Kendi durumunu değiştiremezsin.' : undefined}
                onClick={() => onToggleDurum(u.id, u.durum === 'aktif' ? 'pasif' : 'aktif')}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  u.durum === 'aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                } ${canManage && u.id !== currentUserId ? 'hover:opacity-80' : ''}`}
              >
                {u.durum === 'aktif' ? 'Aktif' : 'Pasif'}
              </button>

              {/* Pasif Danışmanın İşleri (2026-10-06) — bu özellik hayata
                  geçmeden ÖNCE pasife alınmış danışmanlarda kalmış "yetim"
                  açık çağrı/fırsat varsa rozet çıkar, isteğe bağlı devret
                  penceresi açılır. Sadece pendingWorkByUserId'de girişi
                  olan (yani gerçekten açık işi olan) pasif kullanıcılarda
                  görünür — her pasif satırda değil. */}
              {canManage && u.durum === 'pasif' && pendingWorkByUserId[u.id] && (
                <button
                  onClick={() => onDevretRequest(u.id)}
                  title="Hâlâ devredilmemiş açık çağrı/fırsat var — devretmek için tıkla"
                  className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                >
                  ⚠ {pendingWorkByUserId[u.id].pendingCallCount + pendingWorkByUserId[u.id].pendingOpportunityCount} açık iş
                </button>
              )}

              {/* Broker'ın kendi inceleme/test amaçlı açtığı hesaplar için
                  — Lig/Takip/Panel gibi ekip performans listelerinden
                  hariç tutulmasını sağlar (bkz. "test hesabı açtım,
                  tablolarda görünmesin" isteği). */}
              {canManage && (
                <button
                  onClick={() => onToggleTestHesabi(u.id, !u.testHesabi)}
                  title="Test hesabı — Lig/Takip/Panel listelerinde görünmez"
                  className={`rounded-full px-2.5 py-1 text-xs font-medium hover:opacity-80 ${
                    u.testHesabi ? 'bg-amber-50 text-amber-700' : 'bg-border-subtle text-text-secondary'
                  }`}
                >
                  Test hesabı
                </button>
              )}

              {canManage && (
                <div className="flex items-center gap-0.5">
                  {hasKartvizit(u.role) && (
                    <button
                      onClick={() => window.open(kartvizitUrl(u.id), '_blank', 'noopener')}
                      title="Kartvizitini görüntüle"
                      className="rounded-lg p-1.5 text-text-muted hover:bg-brand-50 hover:text-brand-600"
                    >
                      <CreditCard size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(u)}
                    title="Düzenle"
                    className="rounded-lg p-1.5 text-text-muted hover:bg-brand-50 hover:text-brand-600"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onResetPasswordRequest(u)}
                    title="Şifre Sıfırla"
                    className="rounded-lg p-1.5 text-text-muted hover:bg-amber-50 hover:text-amber-600"
                  >
                    <KeyRound size={15} />
                  </button>
                  <button
                    onClick={() => onDeleteRequest(u)}
                    title="Sil"
                    className="rounded-lg p-1.5 text-text-muted hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
