import { useMemo, useState } from 'react'
import { AlertTriangle, Megaphone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import {
  leads as leadsProvider,
  opportunities as opportunitiesProvider,
  recruiting as recruitingProvider,
  callLogs as callLogsProvider,
  auditLog as auditLogProvider,
} from '../lib/dataProvider'
import { canManageLeads, isStaleLead, computeAutoFields } from '../lib/leads'
import { generateTalepKodu, computeReklamKoduConversion } from '../lib/callLogs'
import {
  LEAD_TO_RECRUITING_KAYNAK,
  RECRUITING_DURUM_LABELS,
  RECRUITING_DURUM_STYLES,
  computeRecruitingReklamConversion,
} from '../lib/recruiting'
import { OPPORTUNITY_STATUS_LABELS, OPPORTUNITY_STATUS_STYLES } from '../lib/opportunities'
import { isWithinRange } from '../lib/dateRange'
import { sortByName } from '../lib/format'
import LeadTable from '../components/leads/LeadTable'
import RoutedLeadsTable from '../components/leads/RoutedLeadsTable'
import AssignPortfolioLeadModal from '../components/leads/AssignPortfolioLeadModal'
import ReklamKaynaklariTable from '../components/settings/ReklamKaynaklariTable'
import DateRangeFilter from '../components/common/DateRangeFilter'
import { LoadingState, ErrorState, RestrictedAccess } from '../components/common/AsyncState'

// Recruiting'deki "gün filtresi olsun" isteğinin Lead Havuzu karşılığı
// (2026-09-27, broker: "filtre her ikisini de etkilesin, tek seçim olsun") —
// TEK bir DateRangeFilter hem ana bekleyen listeyi HEM "Yönlendirilenler"
// tablosunu birlikte süzüyor. "24 saattir işlenmemiş" odak modu (staleFocus)
// BİLEREK bu filtreden MUAF — o zaten unutulmuş/eski lead'leri bulmak için
// var, bir tarih penceresi onu geçersiz kılmamalı (bkz. handleStaleFocus).
const INITIAL_DATE_FILTER = { dateRange: '7g', customFrom: '', customTo: '' }

// leads + opportunities + recruiting_candidates + call_logs BİRLİKTE
// yükleniyor — opportunities/recruiting_candidates/calls, yönlendirilmiş
// bir lead'in atandığı modülde GÜNCEL aşamasını Lead Havuzu'na salt okunur
// yansıtmak için lazım (bkz. RoutedLeadsTable, "atanan menüde yapılan
// işlemlere göre buraya bilgi geçsin" isteği). TEKNİK BORÇ: bu dört liste
// her seferinde TAMAMEN client-side yükleniyor, kayıt sayısı arttıkça
// sunucu taraflı sorguya çevrilmeli (bkz. AI_NOTLARI.md).
async function loadAll() {
  const [leadRows, opportunityRows, candidateRows, callRows] = await Promise.all([
    leadsProvider.list(),
    opportunitiesProvider.list(),
    recruitingProvider.list(),
    callLogsProvider.list(),
  ])
  return { leads: leadRows, opportunities: opportunityRows, recruitingCandidates: candidateRows, calls: callRows }
}

// Operasyon'a düşen bir çağrının Lead Havuzu'ndaki "aşama" karşılığı —
// broker + danışman onaylı 4 kademeli model (bkz. AI_NOTLARI.md, "sağlıklı/
// aşama" görüşmesi): Yeni Başvuru / Görüşüldü / Alındı / Olumsuz. Operasyon'un
// mevcut iki alanına (donusYapildiMi/portfoyAlindiMi) DOKUNULMADI — bu SADECE
// o iki alandan (+ bağlı fırsatın durumundan) türetilen salt-okunur bir özet.
// "Ulaşılamadı" (donusYapildiMi===false) BİLEREK "Olumsuz" sayılmıyor — henüz
// gerçek bir ret değil, süreç devam ediyor (broker onayı: 2026-09-27).
function callProcessLabel(call, opportunities) {
  if (!call.donusYapildiMi) return { label: 'Yeni Başvuru', style: 'bg-surface-sunken text-text-secondary', module: 'operasyon' }
  if (!call.portfoyAlindiMi) return { label: 'Görüşüldü', style: 'bg-brand-50 text-brand-700', module: 'operasyon' }
  const opp = call.opportunityId ? opportunities.find((o) => o.id === call.opportunityId) : null
  if (opp?.status === 'iptal') return { label: 'Olumsuz', style: 'bg-surface-sunken text-text-secondary', module: 'firsatlar' }
  return { label: 'Alındı', style: 'bg-emerald-50 text-emerald-700', module: opp ? 'firsatlar' : 'operasyon' }
}

export default function Leads() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [staleFocus, setStaleFocus] = useState(false)
  const [dateFilter, setDateFilter] = useState(INITIAL_DATE_FILTER)
  const [convertTarget, setConvertTarget] = useState(null) // { type: 'opportunity', lead } — Recruiting hiç modal açmıyor
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

  // Lead Havuzu'nun ANA listesi SADECE yönlendirilmemiş (durum='yeni')
  // lead'leri gösterir — burada tek karar Recruiting mi Portföy mü, başka
  // hiçbir işlem yok. Yönlendirilenler ayrı, salt-okunur bir bölümde
  // (bkz. routedLeads / RoutedLeadsTable) — köprü orada, ana listede değil.
  const visible = useMemo(() => {
    if (staleFocus) return leads.filter((l) => isStaleLead(l))
    return leads
      .filter((l) => l.durum === 'yeni')
      .filter((l) => isWithinRange(l.createdAt, dateFilter.dateRange, dateFilter.customFrom, dateFilter.customTo))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, staleFocus, dateFilter])

  // Yönlendirilen bir lead'in hangi kayda gittiğini bulur — ayrı bir FK
  // yönü YOK, mevcut kaynak_lead_id yönü (call/opportunity/candidate ->
  // lead) ters taranıyor. Portföy'e yönlendirilenler ÖNCE call_logs'a
  // düşüyor (bkz. handleAssignPortfolioLead), bu yüzden call önce
  // kontrol ediliyor; call bir fırsata dönüşmüşse callProcessLabel zaten
  // 'firsatlar' modülünü döner, opportunities listesine bakmaya gerek yok.
  const routedLeads = useMemo(() => {
    return leads
      .filter((l) => l.durum === 'atandi')
      .filter((l) => isWithinRange(l.createdAt, dateFilter.dateRange, dateFilter.customFrom, dateFilter.customTo))
      .map((lead) => {
        const call = (data?.calls ?? []).find((c) => c.kaynakLeadId === lead.id)
        if (call) return { ...lead, process: callProcessLabel(call, data?.opportunities ?? []) }
        const opp = (data?.opportunities ?? []).find((o) => o.kaynakLeadId === lead.id)
        if (opp) return { ...lead, process: { label: OPPORTUNITY_STATUS_LABELS[opp.status], style: OPPORTUNITY_STATUS_STYLES[opp.status], module: 'firsatlar' } }
        const candidate = (data?.recruitingCandidates ?? []).find((c) => c.kaynakLeadId === lead.id)
        if (candidate)
          return { ...lead, process: { label: RECRUITING_DURUM_LABELS[candidate.durum], style: RECRUITING_DURUM_STYLES[candidate.durum], module: 'recruiting' } }
        return { ...lead, process: null }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dateFilter])

  // Portföy'e giden lead için DANIŞMAN SEÇİMİ zorunlu bilgi (sistemde yok,
  // tahmin edilemez) — o yüzden AssignPortfolioLeadModal açılıyor, TEK alanı
  // var (bkz. o dosyanın notu). Recruiting'de ise atanan danışman diye bir
  // kavram YOK (bkz. RecruitingDetailModal notu) ve lead'de zaten yeterli
  // bilgi var (ad/telefon/e-posta/kaynak) — bu yüzden hiçbir pencere
  // açılmadan doğrudan oluşturuluyor (bkz. handleQuickRecruiting), broker
  // kararı: "Recruiting seçilince de açılan ekranda detaylar olmasın".
  function handleConvertToOpportunity(lead) {
    setConvertTarget({ type: 'opportunity', lead })
  }
  function handleQuickConvert(lead, type) {
    if (type === 'recruiting') handleQuickRecruiting(lead)
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
  // gerekce (opsiyonel): Yönlendirme Durumu "Kapalı" bir danışmana yine de
  // atanırsa AssignPortfolioLeadModal gerekçeyi zorunlu kılıp buraya geçirir
  // — çağrı oluşturulduktan sonra audit_log'a yazılır (bkz. migration
  // 20261006120000). Atamanın kendisi gerekçeden bağımsız her zaman başarılı
  // olur, gerekçe kaydı ayrı/ikincil bir adım.
  async function handleAssignPortfolioLead(assignToId, gerekce) {
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
      if (gerekce) {
        await auditLogProvider.logDusukPuanAtama({
          tablo: 'call_logs',
          kayitId: createdCall.id,
          danismanId: assignToId,
          gerekce,
          actorId: user.id,
        })
      }
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

  async function handleQuickRecruiting(lead) {
    setSubmitting(true)
    try {
      const createdCandidate = await recruitingProvider.create({
        adSoyad: lead.adSoyad,
        telefon: lead.telefon ?? '',
        email: lead.email ?? '',
        kaynak: LEAD_TO_RECRUITING_KAYNAK[lead.kaynak] ?? 'diger',
        durum: 'yeni_basvuru',
        aciklama: '',
        kaynakLeadId: lead.id,
        gorusmeTarih: '',
        gorusmeSaat: '',
      })
      const updatedLead = await leadsProvider.update(lead.id, {
        durum: 'atandi',
        ...computeAutoFields(lead, 'atandi'),
      })
      setData((prev) => ({
        ...prev,
        leads: prev.leads.map((l) => (l.id === lead.id ? updatedLead : l)),
        recruitingCandidates: [createdCandidate, ...prev.recruitingCandidates],
      }))
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
  if (!canManageLeads(role)) return <RestrictedAccess message="Lead Havuzu sadece broker ve owner rollerine açıktır." />

  return (
    <div>
      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          {/* staleFocus'ta gizli — o modda TÜM eski/unutulmuş lead'ler
              gösteriliyor, bir tarih penceresi bunu geçersiz kılmamalı
              (bkz. INITIAL_DATE_FILTER notu). */}
          {!staleFocus && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border-default bg-surface-raised p-4">
              <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
            </div>
          )}

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

          <LeadTable leads={visible} onQuickConvert={handleQuickConvert} submitting={submitting} />

          <RoutedLeadsTable rows={routedLeads} />

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
    </div>
  )
}
