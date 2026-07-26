import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { leads as leadsProvider } from '../lib/dataProvider'
import { canManageLeads, isStaleLead } from '../lib/leads'
import LeadTable from '../components/leads/LeadTable'
import LeadFilters from '../components/leads/LeadFilters'
import LeadDetailModal from '../components/leads/LeadDetailModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

const INITIAL_FILTERS = { tip: 'tumu', durum: 'tumu', atananId: 'tumu' }

export default function Leads() {
  const { role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data: leads, setData: setLeads, loading, error, reload } = useAsyncList(() => leadsProvider.list(), [])
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [staleFocus, setStaleFocus] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const resolveName = (id) => knownUsers[id]?.name ?? '—'
  // Broker de kendi ekibiyle aynı listede atanabilir kişi olarak görünmesin
  // diye danışman-only tutuluyor (bkz. Panel/Lig/Takip'teki aynı desen);
  // test hesabı da diğer danışman listeleriyle tutarlı şekilde hariç.
  const danismanOptions = Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi)

  const staleLeads = useMemo(() => (leads ?? []).filter((l) => isStaleLead(l)), [leads])

  const visible = useMemo(() => {
    const list = leads ?? []
    if (staleFocus) return list.filter((l) => isStaleLead(l))
    return list
      .filter((l) => filters.tip === 'tumu' || l.tip === filters.tip)
      .filter((l) => filters.durum === 'tumu' || l.durum === filters.durum)
      .filter((l) => {
        if (filters.atananId === 'tumu') return true
        if (filters.atananId === 'atanmadi') return !l.atananDanismanId
        return l.atananDanismanId === filters.atananId
      })
  }, [leads, filters, staleFocus])

  async function handleSave(form) {
    setSubmitting(true)
    try {
      if (editingLead) {
        const updated = await leadsProvider.update(editingLead.id, form)
        setLeads((prev) => prev.map((l) => (l.id === editingLead.id ? updated : l)))
        showToast('Lead güncellendi.', 'success')
      } else {
        const created = await leadsProvider.create(form)
        setLeads((prev) => [created, ...prev])
        showToast('Lead eklendi.', 'success')
      }
      setEditingLead(null)
      setShowModal(false)
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Danışman ne menüde görür ne URL'den doğrudan girebilir — leads_manage
  // RLS'i zaten veriyi engelliyor, bu ikinci (UI seviyesi) savunma katmanı
  // (bkz. lib/roles.js canManageLeads). Hook sırasını bozmamak için tüm
  // hook'lardan SONRA, en son kontrol edilir.
  if (!canManageLeads(role)) return <Navigate to="/panel" replace />

  return (
    <div>
      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          {staleLeads.length > 0 && (
            <button
              onClick={() => setStaleFocus((v) => !v)}
              className={`mb-4 flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-white transition-colors ${
                staleFocus ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} /> 24 saattir aranmamış: {staleLeads.length} lead
              </span>
              <span className="text-xs font-normal text-white/80">{staleFocus ? 'Filtreyi kaldır' : 'Sadece bunları göster'}</span>
            </button>
          )}

          <div className="mb-5">
            <LeadFilters
              filters={filters}
              onChange={setFilters}
              danismanOptions={danismanOptions}
              onNewLeadClick={() => setShowModal(true)}
            />
          </div>

          <LeadTable leads={visible} resolveName={resolveName} onRowClick={setEditingLead} />
        </>
      )}

      {(showModal || editingLead) && (
        <LeadDetailModal
          lead={editingLead}
          danismanOptions={danismanOptions}
          onClose={() => {
            setShowModal(false)
            setEditingLead(null)
          }}
          onSubmit={handleSave}
          submitting={submitting}
        />
      )}
    </div>
  )
}
