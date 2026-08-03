import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Target, Inbox } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useKnownUsers } from '../../context/UsersContext'
import { opportunities as opportunitiesProvider, leads as leadsProvider } from '../../lib/dataProvider'
import { canViewOpportunity } from '../../lib/opportunities'
import { canManageLeads } from '../../lib/roles'

// Fırsat kayıtlarında müşteri adı/telefonu (leadAd/leadTelefon) list()
// yanıtından BİLEREK çıkarılıyor (bkz. dataProvider/mockProvider.js
// notu, aynısı supabaseProvider'da) — o yüzden burada da SADECE ozet/konum
// (portföy açıklaması) üzerinden arama yapılıyor, kişi adıyla değil. Lead
// Havuzu tarafı zaten sadece broker/owner'a açık, orada adSoyad/telefon
// listede var (canManageLeads ile aynı kapsam).
export default function GlobalSearch() {
  const { user, role } = useAuth()
  const { knownUsers } = useKnownUsers()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [opps, setOpps] = useState(null)
  const [leadsList, setLeadsList] = useState(null)
  const loadedRef = useRef(false)
  const ref = useRef(null)

  const canSeeLeads = canManageLeads(role)

  async function ensureLoaded() {
    if (loadedRef.current) return
    loadedRef.current = true
    const [oppsData, leadsData] = await Promise.all([
      opportunitiesProvider.list(),
      canSeeLeads ? leadsProvider.list() : Promise.resolve([]),
    ])
    setOpps(oppsData)
    setLeadsList(leadsData)
  }

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const resolveHolderRole = (id) => knownUsers[id]?.role
  const q = query.trim().toLowerCase()
  const active = q.length >= 2

  const oppResults = active && opps
    ? opps
        .filter((o) => canViewOpportunity(o, user, resolveHolderRole))
        .filter((o) => `${o.ozet ?? ''} ${o.konum ?? ''}`.toLowerCase().includes(q))
        .slice(0, 5)
    : []

  const leadResults = active && leadsList
    ? leadsList.filter((l) => `${l.adSoyad ?? ''} ${l.telefon ?? ''}`.toLowerCase().includes(q)).slice(0, 5)
    : []

  function goTo(path) {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  return (
    <div className="relative w-full max-w-sm" ref={ref}>
      <div className="flex h-9 items-center gap-2 rounded-[11px] border border-border-default bg-surface-sunken px-3 focus-within:border-remax-blue">
        <Search size={16} className="shrink-0 text-text-disabled" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            ensureLoaded()
          }}
          placeholder="Kişi, portföy, fırsat ara"
          className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-disabled focus:outline-none"
        />
      </div>

      {open && active && (
        <div className="absolute left-0 right-0 z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border-default bg-surface-raised shadow-lg">
          {oppResults.length === 0 && leadResults.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">Sonuç bulunamadı.</p>
          ) : (
            <>
              {oppResults.length > 0 && (
                <div className="p-1.5">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                    Fırsatlar
                  </p>
                  {oppResults.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => goTo('/firsatlar')}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-sunken"
                    >
                      <Target size={15} className="shrink-0 text-brand-600" />
                      <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{o.ozet}</span>
                      <span className="shrink-0 text-xs text-text-muted">{o.konum}</span>
                    </button>
                  ))}
                </div>
              )}
              {leadResults.length > 0 && (
                <div className="border-t border-border-subtle p-1.5">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                    Lead Havuzu
                  </p>
                  {leadResults.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => goTo('/leads')}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-sunken"
                    >
                      <Inbox size={15} className="shrink-0 text-remax-blue" />
                      <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{l.adSoyad}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
