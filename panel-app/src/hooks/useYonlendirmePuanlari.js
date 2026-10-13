import { useMemo } from 'react'
import {
  calendarEvents as calendarProvider,
  callLogs as callLogsProvider,
  users as usersProvider,
  league as leagueProvider,
  mentorPrimi as mentorPrimiProvider,
} from '../lib/dataProvider'
import { useAsyncList } from './useAsyncList'
import { buildYonlendirmeMap } from '../lib/yonlendirme'
import { useAuth } from '../context/AuthContext'

// Atama ekranlarının (Leads/Fırsatlar/Operasyon) hiçbiri bugün Yönlendirme
// Puanı'nı hesaplamak için gereken hammaddeyi (events/attendance/calls/
// activity/ciroMusterileri/scores/periods) çekmiyor — Takip sayfası zaten
// bunları Sağlık Skoru için çekiyor, oradan reuse ediliyor (bkz.
// lib/yonlendirme.js). Bu hook, SADECE bu 3 atama ekranı için, aynı
// sorguları TEK bir yerde toplar — 3 ayrı sayfa aynı 7 sorguyu 3 kez
// yazmasın diye (useAsyncList'in kendi retry/timeout'u korunur, her
// sayfa kendi bağımsız kopyasını çeker — paylaşılan bir context/cache
// YOK, kasıtlı: bu ekranlar "önemli ama sık açılmayan" admin ekranları,
// Panel gibi her gün onlarca kez açılan bir sayfa değil).
async function loadYonlendirmeData(canReadBaslangic) {
  const [events, attendance, calls, activity, users, ciroMusterileri, scores, periods, baslangicList] =
    await Promise.all([
      calendarProvider.list(),
      calendarProvider.listAttendance(),
      callLogsProvider.list(),
      usersProvider.listActivity(),
      usersProvider.listAll(),
      leagueProvider.listCiroMusterileri(),
      leagueProvider.listScores(),
      leagueProvider.listPeriods(),
      // mentor_primi_baslangic_select_owner RLS'i sadece broker/owner'a izin
      // veriyor — "ilk 90 gün" korumasının gerçek işe başlama tarihini (bkz.
      // lib/takip.js gercekBaslangicTarihi) kullanabilmesi için (migration
      // 20261013095500). Diğer roller için created_at'e düşülür.
      canReadBaslangic ? mentorPrimiProvider.listBaslangicTarihleri() : Promise.resolve([]),
    ])
  return { events, attendance, calls, activity, users, ciroMusterileri, scores, periods, baslangicList }
}

export function useYonlendirmePuanlari() {
  const { role } = useAuth()
  const canReadBaslangic = ['broker', 'owner'].includes(role)
  const { data, loading, error } = useAsyncList(() => loadYonlendirmeData(canReadBaslangic), [canReadBaslangic])

  const yonlendirmeMap = useMemo(() => {
    if (!data) return {}
    return buildYonlendirmeMap(data.users, data)
  }, [data])

  return { yonlendirmeMap, loading, error }
}
