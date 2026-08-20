// Belge Doldurma Platformu — document_instances_select RLS kuralıyla birebir
// aynı: sadece dolduran kişi + broker/owner görebilir (TC no/tutar gibi
// hassas veri içerdiği için, 2026-08-20 broker onayı).
import { ROLES } from './roles'

export function canSeeAllDocumentInstances(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER
}

export const FIELD_TYPE_LABELS = {
  text: 'Kısa metin',
  textarea: 'Uzun metin',
  date: 'Tarih',
  checkbox: 'Onay kutusu',
}
