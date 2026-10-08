import { ROLES } from './roles'

// docs_manage RLS kuralıyla birebir aynı: SADECE broker belge ekleyip/
// silebilir. 2026-10-08 broker kararı — önceden owner VE ofis de
// yetkiliydi (bkz. 2026-09-17 kararı), Yetki tablosu denetiminde daraltıldı.
export function canManageDocs(role) {
  return role === ROLES.BROKER
}

export function currentVersion(docId, versions) {
  return versions.find((v) => v.docId === docId && v.isCurrent) ?? null
}

export function versionsForDoc(docId, versions) {
  return versions.filter((v) => v.docId === docId).sort((a, b) => b.versionNo - a.versionNo)
}

export function nextVersionNo(docId, versions) {
  const existing = versions.filter((v) => v.docId === docId)
  if (existing.length === 0) return 1
  return Math.max(...existing.map((v) => v.versionNo)) + 1
}
