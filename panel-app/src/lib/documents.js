// Belge Doldurma Platformu — document_instances_select RLS kuralıyla birebir
// aynı: sadece dolduran kişi + broker/owner görebilir (TC no/tutar gibi
// hassas veri içerdiği için, 2026-08-20 broker onayı).
import { ROLES } from './roles'

export function canSeeAllDocumentInstances(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER
}

// 2026-08-22 broker: "Broker, owner sadece izleyici... sadece ofis PDF'e
// çevirsin, danışman bu adımı bilmesin." — generate-document-pdf Edge
// Function'daki rol kontrolüyle BİREBİR aynı kural.
export function canConvertToPdf(role) {
  return role === ROLES.OFIS
}

// Aynı istekten: broker/owner belge oluşturamaz/gönderemez, sadece izler.
export function isDocumentViewerOnly(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER
}

export const FIELD_TYPE_LABELS = {
  text: 'Kısa metin',
  textarea: 'Uzun metin',
  date: 'Tarih',
  checkbox: 'Onay kutusu',
}
