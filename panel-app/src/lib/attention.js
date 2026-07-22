// Panel'deki "Dikkat Gerekiyor" uyarılarının kriterleri — hem Panel'in sayıyı
// hesaplarken hem de "İncele" linkinin götürdüğü sayfanın "sadece bunları
// göster" filtresinde AYNI mantığı kullanması için tek yerden paylaşılıyor.
// İkisi ayrı ayrı yazılırsa (bkz. geçmişte 528 fırsat kafa karışıklığı)
// sayılar er ya da geç birbirinden sapar.
import { isLegacyRecord } from './dateRange'

export function isStaleReturn(call, now = Date.now()) {
  return Boolean(
    call.assignedTo &&
      !call.donusYapildiMi &&
      !isLegacyRecord(call.createdAt) &&
      now - new Date(call.createdAt).getTime() > 2 * 24 * 60 * 60 * 1000,
  )
}

export function isStaleOpp(opp, now = Date.now()) {
  return Boolean(
    opp.status === 'acik' && !isLegacyRecord(opp.createdAt) && now - new Date(opp.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000,
  )
}

export function isInactiveAgent(lastSignInAt, now = Date.now()) {
  return !lastSignInAt || now - new Date(lastSignInAt).getTime() > 7 * 24 * 60 * 60 * 1000
}

export function isBehindEducation(row) {
  return row.modulePercent < 50 || row.checklistPercent < 50
}
