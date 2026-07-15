import { useMemo, useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { MOCK_OPPORTUNITIES } from '../data/mockOpportunities'
import { canViewOpportunity, computeBoxCounts, isWithinRange } from '../lib/opportunities'
import { KNOWN_USERS } from '../lib/knownUsers'
import OpportunitySection from '../components/opportunities/OpportunitySection'
import OpportunityDetailModal from '../components/opportunities/OpportunityDetailModal'
import OpportunityFilters from '../components/opportunities/OpportunityFilters'
import NewOpportunityModal from '../components/opportunities/NewOpportunityModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { mutate } from '../lib/api'

const INITIAL_FILTERS = { search: '', dateRange: '30g', customFrom: '', customTo: '' }

// RLS'teki opportunities_insert kuralıyla birebir aynı: broker/owner/ofis.
const CAN_CREATE_ROLES = ['broker', 'owner', 'ofis']

export default function Firsatlar() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const [opportunities, setOpportunities] = useState(MOCK_OPPORTUNITIES)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [expanded, setExpanded] = useState({ satici: true, alici: true })
  const [activeCategory, setActiveCategory] = useState({ satici: null, alici: null })
  const [detailOpp, setDetailOpp] = useState(null)
  const [claimingId, setClaimingId] = useState(null)
  const [confirmClaimId, setConfirmClaimId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const roleVisible = useMemo(
    () => opportunities.filter((o) => canViewOpportunity(o, user)),
    [opportunities, user],
  )

  const filtered = useMemo(() => {
    return roleVisible
      .filter((o) => isWithinRange(o.createdAt, filters.dateRange, filters.customFrom, filters.customTo))
      .filter((o) => {
        if (!filters.search.trim()) return true
        const q = filters.search.trim().toLowerCase()
        return o.leadAd.toLowerCase().includes(q) || o.konum.toLowerCase().includes(q)
      })
  }, [roleVisible, filters])

  const boxes = useMemo(() => computeBoxCounts(filtered), [filtered])

  function sectionData(type) {
    const typeBoxes = boxes.filter((b) => b.type === type)
    const total = filtered.filter((o) => o.type === type).length
    const category = activeCategory[type]
    const rows = category
      ? filtered
          .filter((o) => o.type === type && o.category === category)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : []
    return { typeBoxes, total, category, rows }
  }

  const satici = sectionData('satici')
  const alici = sectionData('alici')

  async function performClaim(id) {
    setClaimingId(id)
    try {
      await mutate('opportunities.claim', { id, userId: user.id })
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, claimerId: user.id, claimedAt: new Date().toISOString(), status: 'claimed' } : o,
        ),
      )
      showToast('Fırsat danışmana bildirildi', 'success')
      setDetailOpp(null)
    } finally {
      setClaimingId(null)
      setConfirmClaimId(null)
    }
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      const payload = { ...form, fiyat: form.fiyat ? Number(form.fiyat) : null }
      await mutate('opportunities.create', payload)
      setOpportunities((prev) => [
        {
          id: `opp-${Date.now()}`,
          ...payload,
          status: 'acik',
          ownerId: user.id,
          claimerId: null,
          claimedAt: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
      setShowModal(false)
    } finally {
      setSubmitting(false)
    }
  }

  const canCreate = CAN_CREATE_ROLES.includes(role)
  const confirmOpp = confirmClaimId ? opportunities.find((o) => o.id === confirmClaimId) : null

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Target size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink-900">Fırsatlar</h1>
            <p className="text-xs text-ink-400">{filtered.length} kayıt görünüyor</p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Yeni Fırsat
          </button>
        )}
      </div>

      <div className="mb-5">
        <OpportunityFilters filters={filters} onChange={setFilters} />
      </div>

      <div className="space-y-4">
        <OpportunitySection
          dotColor="bg-emerald-500"
          label="🟢 Satıcılar"
          total={satici.total}
          expanded={expanded.satici}
          onToggleExpanded={() => setExpanded((f) => ({ ...f, satici: !f.satici }))}
          boxes={satici.typeBoxes}
          activeCategory={satici.category}
          onSelectCategory={(category) => setActiveCategory((f) => ({ ...f, satici: category }))}
          tableRows={satici.rows}
          onRowClick={setDetailOpp}
          onClaim={(opp) => setConfirmClaimId(opp.id)}
          claimingId={claimingId}
        />

        <OpportunitySection
          dotColor="bg-blue-500"
          label="🔵 Alıcılar"
          total={alici.total}
          expanded={expanded.alici}
          onToggleExpanded={() => setExpanded((f) => ({ ...f, alici: !f.alici }))}
          boxes={alici.typeBoxes}
          activeCategory={alici.category}
          onSelectCategory={(category) => setActiveCategory((f) => ({ ...f, alici: category }))}
          tableRows={alici.rows}
          onRowClick={setDetailOpp}
          onClaim={(opp) => setConfirmClaimId(opp.id)}
          claimingId={claimingId}
        />
      </div>

      {showModal && (
        <NewOpportunityModal onClose={() => setShowModal(false)} onSubmit={handleCreate} submitting={submitting} />
      )}

      {detailOpp && (
        <OpportunityDetailModal
          opportunity={detailOpp}
          user={user}
          ownerName={KNOWN_USERS[detailOpp.ownerId]?.name}
          claimerName={KNOWN_USERS[detailOpp.claimerId]?.name}
          onClose={() => setDetailOpp(null)}
          onClaim={() => setConfirmClaimId(detailOpp.id)}
          claiming={claimingId === detailOpp.id}
        />
      )}

      {confirmClaimId && (
        <ConfirmDialog
          title="Bu fırsatı üstleniyor musun?"
          message={
            confirmOpp
              ? `İlgileniyorum dediğinde "${confirmOpp.konum || 'bu fırsat'}" sana atanır ve havuzdan kalkar.`
              : 'İlgileniyorum dediğinde bu fırsat sana atanır ve havuzdan kalkar.'
          }
          confirmLabel="Evet, ilgileniyorum"
          onConfirm={() => performClaim(confirmClaimId)}
          onCancel={() => setConfirmClaimId(null)}
          confirming={claimingId === confirmClaimId}
        />
      )}
    </div>
  )
}
