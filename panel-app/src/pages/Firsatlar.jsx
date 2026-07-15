import { useMemo, useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { MOCK_OPPORTUNITIES } from '../data/mockOpportunities'
import { canViewOpportunity, computeBoxCounts, isWithinRange } from '../lib/opportunities'
import { KNOWN_USERS } from '../lib/knownUsers'
import OpportunityCard from '../components/opportunities/OpportunityCard'
import OpportunityBoxGrid from '../components/opportunities/OpportunityBoxGrid'
import OpportunityFilters from '../components/opportunities/OpportunityFilters'
import NewOpportunityModal from '../components/opportunities/NewOpportunityModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { mutate } from '../lib/api'

const INITIAL_FILTERS = {
  search: '',
  type: 'tumu',
  category: 'tumu',
  dateRange: '30g',
  customFrom: '',
  customTo: '',
}

// "İlgileniyorum" bu roller için gösterilir; broker/müdür kural gereği veri
// girmiyor ama havuzdan claim edebilmesi mantıksız değil, yine de spesifikasyona
// göre bu buton esas olarak danışman/ofis içindir. Yeni fırsat ekleme ise
// RLS'teki opportunities_insert kuralıyla birebir aynı: broker/müdür/ofis.
const CAN_CREATE_ROLES = ['broker', 'mudur', 'ofis']

export default function Firsatlar() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const [opportunities, setOpportunities] = useState(MOCK_OPPORTUNITIES)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [claimingId, setClaimingId] = useState(null)
  const [confirmClaimId, setConfirmClaimId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const roleVisible = useMemo(
    () => opportunities.filter((o) => canViewOpportunity(o, user)),
    [opportunities, user],
  )

  const boxes = useMemo(() => computeBoxCounts(roleVisible), [roleVisible])

  const visible = useMemo(() => {
    return roleVisible
      .filter((o) => filters.type === 'tumu' || o.type === filters.type)
      .filter((o) => filters.category === 'tumu' || o.category === filters.category)
      .filter((o) => isWithinRange(o.createdAt, filters.dateRange, filters.customFrom, filters.customTo))
      .filter((o) => {
        if (!filters.search.trim()) return true
        const q = filters.search.trim().toLowerCase()
        return o.leadAd.toLowerCase().includes(q) || o.konum.toLowerCase().includes(q)
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [roleVisible, filters])

  async function confirmClaim() {
    const id = confirmClaimId
    setClaimingId(id)
    try {
      await mutate('opportunities.claim', { id, userId: user.id })
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, claimerId: user.id, claimedAt: new Date().toISOString(), status: 'claimed' } : o,
        ),
      )
      showToast('Fırsatı üstlendin.', 'success')
    } finally {
      setClaimingId(null)
      setConfirmClaimId(null)
    }
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      await mutate('opportunities.create', form)
      setOpportunities((prev) => [
        {
          id: `opp-${Date.now()}`,
          ...form,
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

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lavanda-50 text-lavanda-600">
            <Target size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink-900">Fırsatlar</h1>
            <p className="text-xs text-ink-400">{visible.length} kayıt görünüyor</p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-lavanda-600 px-3 py-2 text-sm font-medium text-white hover:bg-lavanda-700"
          >
            <Plus size={16} /> Yeni Fırsat
          </button>
        )}
      </div>

      <div className="mb-5">
        <OpportunityBoxGrid
          boxes={boxes}
          active={{ type: filters.type, category: filters.category }}
          onSelect={({ type, category }) => setFilters((f) => ({ ...f, type, category }))}
        />
      </div>

      <div className="mb-5">
        <OpportunityFilters filters={filters} onChange={setFilters} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-sm text-ink-400">
          Bu filtrelere uyan fırsat yok.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              ownerName={KNOWN_USERS[opp.ownerId]?.name}
              claimerName={KNOWN_USERS[opp.claimerId]?.name}
              isMine={opp.claimerId === user.id}
              claiming={claimingId === opp.id}
              onClaim={() => setConfirmClaimId(opp.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewOpportunityModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
        />
      )}

      {confirmClaimId && (
        <ConfirmDialog
          title="Bu fırsatı üstleniyor musun?"
          message="İlgileniyorum dediğinde bu fırsat sana atanır ve havuzdan kalkar."
          confirmLabel="Evet, ilgileniyorum"
          onConfirm={confirmClaim}
          onCancel={() => setConfirmClaimId(null)}
          confirming={claimingId === confirmClaimId}
        />
      )}
    </div>
  )
}
