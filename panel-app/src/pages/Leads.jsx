import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { leads as leadsProvider, opportunities as opportunitiesProvider, recruiting as recruitingProvider } from '../lib/dataProvider'
import { canManageLeads, isStaleLead, computeAutoFields } from '../lib/leads'
import { LEAD_TO_RECRUITING_KAYNAK, RECRUITING_DURUM_LABELS, RECRUITING_DURUM_STYLES } from '../lib/recruiting'
import { OPPORTUNITY_STATUS_LABELS, OPPORTUNITY_STATUS_STYLES } from '../lib/opportunities'
import { parseThousands } from '../lib/format'
import { formatPhoneInput } from '../lib/phone'
import LeadTable from '../components/leads/LeadTable'
import LeadFilters from '../components/leads/LeadFilters'
import LeadDetailModal from '../components/leads/LeadDetailModal'
import NewOpportunityModal from '../components/opportunities/NewOpportunityModal'
import RecruitingDetailModal from '../components/recruiting/RecruitingDetailModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

const INITIAL_FILTERS = { tip: 'tumu', durum: 'tumu' }

// leads + opportunities + recruiting_candidates BİRLİKTE yükleniyor —
// dönüştürülmüş bir lead'in hangi kayda gittiğini VE o kaydın güncel
// durumunu (Süreç Durumu kolonu) bulmak için. TEKNİK BORÇ: bu üç liste her
// seferinde TAMAMEN client-side yükleniyor, kayıt sayısı arttıkça sunucu
// taraflı sorguya çevrilmeli (bkz. AI_NOTLARI.md).
async function loadAll() {
  const [leadRows, opportunityRows, candidateRows] = await Promise.all([
    leadsProvider.list(),
    opportunitiesProvider.list(),
    recruitingProvider.list(),
  ])
  return { leads: leadRows, opportunities: opportunityRows, recruitingCandidates: candidateRows }
}

export default function Leads() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [staleFocus, setStaleFocus] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [convertTarget, setConvertTarget] = useState(null) // { type: 'opportunity'|'recruiting', lead }
  const [submitting, setSubmitting] = useState(false)

  const leads = data?.leads ?? []
  // Lead seviyesinde atama YOK (dağıtım noktası — atama hedef modülde
  // yapılır), ama RecruitingDetailModal'ın KENDİ Atanan alanı için hâlâ
  // gerekli (bkz. dönüştürme akışı altında). Danışman-only + test hesabı
  // hariç, Panel/Lig/Takip'teki aynı desen.
  const danismanOptions = Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const staleLeads = useMemo(() => leads.filter((l) => isStaleLead(l)), [data])

  const visible = useMemo(() => {
    if (staleFocus) return leads.filter((l) => isStaleLead(l))
    return leads
      .filter((l) => filters.tip === 'tumu' || l.tip === filters.tip)
      .filter((l) => filters.durum === 'tumu' || l.durum === filters.durum)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filters, staleFocus])

  // "Süreç Durumu" kolonu — durum='atandi' ise hedef kaydın GÜNCEL
  // durumunu gösterir (opportunities.status ya da recruiting_candidates.
  // durum), değilse boş. Ayrı bir sorgu YOK — loadAll zaten üç listeyi
  // birlikte yüklüyor, burada sadece kaynak_lead_id ile eşleştiriliyor.
  function resolveProcessStatus(lead) {
    if (lead.durum !== 'atandi') return null
    const opp = (data?.opportunities ?? []).find((o) => o.kaynakLeadId === lead.id)
    if (opp) return { label: OPPORTUNITY_STATUS_LABELS[opp.status], style: OPPORTUNITY_STATUS_STYLES[opp.status] }
    const candidate = (data?.recruitingCandidates ?? []).find((c) => c.kaynakLeadId === lead.id)
    if (candidate) return { label: RECRUITING_DURUM_LABELS[candidate.durum], style: RECRUITING_DURUM_STYLES[candidate.durum] }
    return null
  }

  // Dönüştürülmüş bir lead'in hangi kayda gittiğini bulur — ayrı bir FK
  // yönü YOK, mevcut kaynak_lead_id yönü (opportunity/candidate -> lead)
  // ters taranıyor (bkz. loadAll notu).
  const convertedTarget = useMemo(() => {
    if (!editingLead || editingLead.durum !== 'atandi') return null
    const opp = (data?.opportunities ?? []).find((o) => o.kaynakLeadId === editingLead.id)
    if (opp) return { type: 'opportunity', record: opp }
    const candidate = (data?.recruitingCandidates ?? []).find((c) => c.kaynakLeadId === editingLead.id)
    if (candidate) return { type: 'recruiting', record: candidate }
    return null
  }, [editingLead, data])

  // Lead Havuzu'na elle yeni kayıt eklenmiyor artık — leadler sadece Meta
  // webhook'undan gelir (bkz. AI_NOTLARI.md). Bu yüzden burada sadece
  // GÜNCELLEME var, oluşturma yok.
  async function handleSave(form) {
    setSubmitting(true)
    try {
      const updated = await leadsProvider.update(editingLead.id, form)
      setData((prev) => ({ ...prev, leads: prev.leads.map((l) => (l.id === editingLead.id ? updated : l)) }))
      showToast('Lead güncellendi.', 'success')
      setEditingLead(null)
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Fırsata/Recruiting'e dönüştürme, Lead Detayı modalını kapatıp yerine
  // ilgili oluşturma modalını (NewOpportunityModal / RecruitingDetailModal)
  // açar — aynı anda iki modal AÇIK olmasın diye (bkz. Modal'ın kendi
  // focus-trap/ESC davranışı, iki modal birlikte karışabilir).
  function handleConvertToOpportunity(lead) {
    setEditingLead(null)
    setConvertTarget({ type: 'opportunity', lead })
  }
  function handleConvertToRecruiting(lead) {
    setEditingLead(null)
    setConvertTarget({ type: 'recruiting', lead })
  }

  // Listeden tek tıkla yönlendirme (Lead Detayı'na hiç girmeden) — broker
  // kampanya/reklam adına bakıp karar veriyor (bkz. LeadTable
  // QuickRouteButtons). Aynı hedef modalını açan handleConvertTo* ile
  // birebir aynı akış, sadece tetikleyici satırdan geliyor.
  function handleQuickConvert(lead, type) {
    if (type === 'recruiting') handleConvertToRecruiting(lead)
    else handleConvertToOpportunity(lead)
  }

  async function handleOpportunitySubmit(form) {
    const lead = convertTarget.lead
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        fiyat: parseThousands(form.fiyat),
        fiyatMin: parseThousands(form.fiyatMin),
        fiyatMax: parseThousands(form.fiyatMax),
        m2: form.m2 ? Number(form.m2) : null,
      }
      const createdOpportunity = await opportunitiesProvider.create(payload, user.id, false)
      const updatedLead = await leadsProvider.update(lead.id, {
        durum: 'atandi',
        ...computeAutoFields(lead, 'atandi'),
      })
      setData((prev) => ({
        ...prev,
        leads: prev.leads.map((l) => (l.id === lead.id ? updatedLead : l)),
        opportunities: [createdOpportunity, ...prev.opportunities],
      }))
      setConvertTarget(null)
      showToast("Operasyon'a gönderildi.", 'success')
    } catch (err) {
      showToast(err.message ?? 'Dönüştürülemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRecruitingSubmit(form) {
    const lead = convertTarget.lead
    setSubmitting(true)
    try {
      const createdCandidate = await recruitingProvider.create(form)
      const updatedLead = await leadsProvider.update(lead.id, {
        durum: 'atandi',
        ...computeAutoFields(lead, 'atandi'),
      })
      setData((prev) => ({
        ...prev,
        leads: prev.leads.map((l) => (l.id === lead.id ? updatedLead : l)),
        recruitingCandidates: [createdCandidate, ...prev.recruitingCandidates],
      }))
      setConvertTarget(null)
      showToast("Recruiting'e gönderildi.", 'success')
    } catch (err) {
      showToast(err.message ?? 'Dönüştürülemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function handleViewTarget() {
    if (!convertedTarget) return
    setEditingLead(null)
    navigate(convertedTarget.type === 'opportunity' ? '/firsatlar' : '/recruiting')
  }

  // Ofis/danışman ne menüde görür ne URL'den doğrudan girebilir (sadece
  // broker/owner) — leads_manage RLS'i zaten veriyi engelliyor, bu ikinci
  // (UI seviyesi) savunma katmanı (bkz. lib/roles.js canManageLeads).
  // Hook sırasını bozmamak için tüm hook'lardan SONRA, en son kontrol edilir.
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
                <AlertTriangle size={16} /> 24 saattir işlenmemiş: {staleLeads.length} lead
              </span>
              <span className="text-xs font-normal text-white/80">{staleFocus ? 'Filtreyi kaldır' : 'Sadece bunları göster'}</span>
            </button>
          )}

          <div className="mb-5">
            <LeadFilters filters={filters} onChange={setFilters} />
          </div>

          <LeadTable
            leads={visible}
            resolveProcessStatus={resolveProcessStatus}
            onRowClick={setEditingLead}
            onQuickConvert={handleQuickConvert}
          />
        </>
      )}

      {editingLead && (
        <LeadDetailModal
          lead={editingLead}
          convertedTarget={convertedTarget}
          onClose={() => setEditingLead(null)}
          onSubmit={handleSave}
          onConvertToOpportunity={handleConvertToOpportunity}
          onConvertToRecruiting={handleConvertToRecruiting}
          onViewTarget={handleViewTarget}
          submitting={submitting}
        />
      )}

      {convertTarget?.type === 'opportunity' && (
        <NewOpportunityModal
          initialValues={{
            type: null,
            leadAd: convertTarget.lead.adSoyad,
            leadTelefon: convertTarget.lead.telefon ? formatPhoneInput(convertTarget.lead.telefon) : '',
          }}
          kaynakLeadId={convertTarget.lead.id}
          onClose={() => setConvertTarget(null)}
          onSubmit={handleOpportunitySubmit}
          submitting={submitting}
        />
      )}

      {convertTarget?.type === 'recruiting' && (
        <RecruitingDetailModal
          initialValues={{
            adSoyad: convertTarget.lead.adSoyad,
            telefon: convertTarget.lead.telefon,
            email: convertTarget.lead.email,
            kaynak: LEAD_TO_RECRUITING_KAYNAK[convertTarget.lead.kaynak] ?? 'diger',
            kaynakLeadId: convertTarget.lead.id,
          }}
          danismanOptions={danismanOptions}
          onClose={() => setConvertTarget(null)}
          onSubmit={handleRecruitingSubmit}
          submitting={submitting}
        />
      )}
    </div>
  )
}
