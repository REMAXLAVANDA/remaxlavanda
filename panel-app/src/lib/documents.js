// Belge Doldurma Platformu — document_instances_select RLS kuralıyla birebir
// aynı: sadece dolduran kişi + broker/owner görebilir (TC no/tutar gibi
// hassas veri içerdiği için, 2026-08-20 broker onayı).
import { ROLES } from './roles'

export function canSeeAllDocumentInstances(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER
}

// 2026-08-22 broker: "sadece ofis PDF'e çevirsin, danışman bu adımı
// bilmesin" — sonra aynı gün "bende oluşturayım, owner da, çıktı da
// alabilmeli" diyerek genişletti. Sonuç: ofis HERKESİN belgesini PDF'e
// çevirebilir (kuyruk); broker/owner SADECE KENDİ oluşturduğu belgeyi
// çevirebilir (bkz. BelgeOlusturTab'daki isOwner birleşimi + generate-
// document-pdf Edge Function'daki aynı kural); danışman hiçbir zaman
// çeviremez, bu adımı hiç görmez.
export function canConvertToPdf(role) {
  return role === ROLES.OFIS || role === ROLES.BROKER || role === ROLES.OWNER
}

export const FIELD_TYPE_LABELS = {
  text: 'Kısa metin',
  textarea: 'Uzun metin',
  date: 'Tarih',
  checkbox: 'Onay kutusu',
}
