import { ROLES } from './roles'

// docs_manage RLS kuralıyla birebir aynı: broker/ofis/owner yönetir
// (2026-09-17 broker kararı: owner de belge ekleyebilsin — eskiden owner
// sadece görüntülüyordu, artık broker/ofis ile aynı yetkide).
export function canManageDocs(role) {
  return role === ROLES.BROKER || role === ROLES.OFIS || role === ROLES.OWNER
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
