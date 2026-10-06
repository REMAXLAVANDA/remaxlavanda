import { useMemo } from 'react'
import {
  calendarEvents as calendarProvider,
  callLogs as callLogsProvider,
  users as usersProvider,
  league as leagueProvider,
} from '../lib/dataProvider'
import { useAsyncList } from './useAsyncList'
import { buildYonlendirmeMap } from '../lib/yonlendirme'

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
async function loadYonlendirmeData() {
  const [events, attendance, calls, activity, users, ciroMusterileri, scores, periods] = await Promise.all([
    calendarProvider.list(),
    calendarProvider.listAttendance(),
    callLogsProvider.list(),
    usersProvider.listActivity(),
    usersProvider.listAll(),
    leagueProvider.listCiroMusterileri(),
    leagueProvider.listScores(),
    leagueProvider.listPeriods(),
  ])
  return { events, attendance, calls, activity, users, ciroMusterileri, scores, periods }
}

export function useYonlendirmePuanlari() {
  const { data, loading, error } = useAsyncList(loadYonlendirmeData, [])

  const yonlendirmeMap = useMemo(() => {
    if (!data) return {}
    return buildYonlendirmeMap(data.users, data)
  }, [data])

  return { yonlendirmeMap, loading, error }
}
