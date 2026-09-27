import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle, Megaphone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { leads as leadsProvider, recruiting as recruitingProvider, callLogs as callLogsProvider } from '../lib/dataProvider'
import { canManageLeads, isStaleLead, computeAutoFields } from '../lib/leads'
import { generateTalepKodu, computeReklamKoduConversion } from '../lib/callLogs'
import { LEAD_TO_RECRUITING_KAYNAK, computeRecruitingReklamConversion } from '../lib/recruiting'
import { sortByName } from '../lib/format'
import LeadTable from '../components/leads/LeadTable'
import AssignPortfolioLeadModal from '../components/leads/AssignPortfolioLeadModal'
import RecruitingDetailModal from '../components/recruiting/RecruitingDetailModal'
import ReklamKaynaklariTable from '../components/settings/ReklamKaynaklariTable'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

// leads + recruiting_candidates + call_logs BİRLİKTE yükleniyor — leads
// sadece routing için, diğer ikisi "Reklam Kaynakları" raporu ve aday
// tekrar-giriş uyarısı için (bkz. handleRecruitingSubmit). opportunities
// ARTIK burada yüklenmiyor — Lead Havuzu'nda hedef kaydın süreç durumunu
// gösteren bir kolon yok (bkz. "orada hiçbir işlem veya hiçbir bilgi
// görmeyeceğiz" kararı, sadece Recruiting/Portföy seçimi kaldı).
async function loadAll() {
  const [leadRows, candidateRows, callRows] = await Promise.all([
    leadsProvider.list(),
    recruitingProvider.list(),
    callLogsProvider.list(),
  ])
  return { leads: leadRows, recruitingCandidates: candidateRows, calls: callRows }
}

export default function Leads() {
  const { role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [staleFocus, setStaleFocus] = useState(false)
  const [convertTarget, setConvertTarget] = useState(null) // { type: 'opportunity'|'recruiting', lead }
  const [submitting, setSubmitting] = useState(false)

  const leads = data?.leads ?? []
  // Lead seviyesinde atama YOK (dağıtım noktası) — ama Portföy'e
  // dönüştürürken broker'ın reklam başlığına bakıp elle hangi danışmana
  // atayacağını seçebilmesi için AssignPortfolioLeadModal'a veriliyor (bkz.
  // handleAssignPortfolioLead). Broker de fiilen danışmanlık yapabiliyor
  // (kendi reklamı da olabilir), bu yüzden FirsatlarTab.jsx'teki
  // assignableOptions ile AYNI kapsam: danışman + broker (Panel/Lig/Takip'teki
  // "yayınlanan liderlik" filtreleriyle KARIŞTIRILMASIN, onlar bilerek dar).
  const danismanOptions = sortByName(Object.values(knownUsers)).filter(
    (u) => (!u.role || u.role === 'danisman' || u.role === 'broker') && !u.testHesabi,
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const staleLeads = useMemo(() => leads.filter((l) => isStaleLead(l)), [data])

  // Lead Havuzu SADECE yönlendirilmemiş (durum='yeni') lead'leri gösterir —
  // yönlendirilen bir lead artık burada gösterilecek/yapılacak hiçbir şey
  // bırakmıyor (süreci hedef modül — Fırsatlar/Recruiting — takip ediyor).
  const visible = useMemo(() => {
    if (staleFocus) return leads.filter((l) => isStaleLead(l))
    return leads.filter((l) => l.durum === 'yeni')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, staleFocus])

  // Fırsata/Recruiting'e dönüştürme, ilgili oluşturma modalını
  // (AssignPortfolioLeadModal / RecruitingDetailModal) açar — Lead
  // Havuzu'nda BAŞKA bir detay/düzenleme penceresi yok, tek karar
  // Recruiting mi Portföy mü.
  function handleConvertToOpportunity(lead) {
    setConvertTarget({ type: 'opportunity', lead })
  }
  function handleConvertToRecruiting(lead) {
    setConvertTarget({ type: 'recruiting', lead })
  }
  function handleQuickConvert(lead, type) {
    if (type === 'recruiting') handleConvertToRecruiting(lead)
    else handleConvertToOpportunity(lead)
  }

  // Broker'ın burada bildiği TEK şey hangi danışmanın reklamı olduğu — alıcı/
  // satıcı ayrımını da kategoriyi de bilmiyor (bkz. AssignPortfolioLeadModal
  // notu). Bu yüzden direkt Fırsat oluşturmuyoruz — Operasyon'a, diğer
  // reklam çağrıları gibi bir çağrı düşürüyoruz (kaynak='Reklam', reklam
  // adı/kodu üzerinde). Danışman bu kişiyi Operasyon'da görüp Görüşüldü/
  // Portföy Alındı'yı işaretliyor, hazır olunca kendisi "Fırsata Çevir"
  // ile Fırsata çeviriyor — akış hiç değişmedi, sadece giriş noktası
  // Lead Havuzu oldu (bkz. "operasyona uygulayalım" isteği, AI_NOTLARI.md).
  async function handleAssignPortfolioLead(assignToId) {
    const lead = convertTarget.lead
    setSubmitting(true)
    try {
      const createdCall = await callLogsProvider.create({
        kaynak: 'Reklam',
        arayanAd: lead.adSoyad,
        arayanTelefon: lead.telefon ?? '',
        assignedTo: assignToId,
        reklamKodu: lead.reklamAdi || lead.kampanyaKodu || null,
        kaynakLeadId: lead.id,
        portfoyNo: generateTalepKodu('Reklam'),
      })
      const updatedLead = await leadsProvider.update(lead.id, {
        durum: 'atandi',
        ...computeAutoFields(lead, 'atandi'),
      })
      setData((prev) => ({
        ...prev,
        leads: prev.leads.map((l) => (l.id === lead.id ? updatedLead : l)),
        calls: [createdCall, ...prev.calls],
      }))
      setConvertTarget(null)
      showToast("Danışmana atandı, Operasyon'a gönderildi.", 'success')
    } catch (err) {
      showToast(err.message ?? 'Atanamadı, tekrar dene.', 'error')
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
              className={`mb-4 flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                staleFocus
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-border-danger bg-tint-red text-brand-700 hover:brightness-95'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} /> 24 saattir işlenmemiş: {staleLeads.length} lead
              </span>
              <span className={`text-xs font-normal ${staleFocus ? 'text-white/80' : 'text-brand-600'}`}>
                {staleFocus ? 'Filtreyi kaldır' : 'Sadece bunları göster'}
              </span>
            </button>
          )}

          <LeadTable leads={visible} onQuickConvert={handleQuickConvert} />

          {/* Reklam Kaynakları artık Ayarlar'da değil, burada — leadler zaten
              reklamdan geliyor, kaynak performansını görmek için ayrı bir
              menüye gitmeye gerek olmasın diye (bkz. "ayarlardaki detayların
              özetini panele taşı, tüm detayları lead menüsünün altına
              yerleştir" isteği). Panel'deki widget bunun sadece özeti. */}
          <section className="mt-10 border-t border-border-default pt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Megaphone size={16} className="text-brand-600" /> Reklam Kaynakları
            </h2>
            <ReklamKaynaklariTable
              recruitingRows={computeRecruitingReklamConversion(data?.recruitingCandidates ?? [])}
              portfoyRows={computeReklamKoduConversion(data?.calls ?? [])}
            />
          </section>
        </>
      )}

      {convertTarget?.type === 'opportunity' && (
        <AssignPortfolioLeadModal
          lead={convertTarget.lead}
          assignableOptions={danismanOptions}
          onClose={() => setConvertTarget(null)}
          onSubmit={handleAssignPortfolioLead}
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
          existingCandidates={data?.recruitingCandidates ?? []}
          onClose={() => setConvertTarget(null)}
          onSubmit={handleRecruitingSubmit}
          submitting={submitting}
        />
      )}
    </div>
  )
}
