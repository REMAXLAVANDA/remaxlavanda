// Müşterinin GİRİŞ YAPMADAN, danışmanın attığı link üzerinden belge
// doldurabilmesi için (2026-08-22 broker isteği). Bilerek panel'in
// authenticated Supabase client'ını (getSupabaseClient) KULLANMIYOR — bu
// sayfayı açan kişinin bir portal hesabı/oturumu yok. download-document'te
// olduğu gibi doğrudan public/verify_jwt:false Edge Function'a fetch atılıyor.
import { SUPABASE_URL, USE_SUPABASE } from './env'
import {
  documentInstances as mockDocumentInstances,
  documentTemplates as mockDocumentTemplates,
  documentFields as mockDocumentFields,
} from './dataProvider/mockProvider'

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/fill-document`

export async function getDocumentByFillToken(token) {
  if (!USE_SUPABASE) {
    const row = (await mockDocumentInstances.list()).find((i) => i.fillToken === token)
    if (!row) throw new Error('Link geçersiz.')
    if (row.status !== 'draft') throw new Error('Bu belge zaten gönderildi, artık düzenlenemez.')
    const templates = await mockDocumentTemplates.list()
    const template = templates.find((t) => t.id === row.templateId)
    const fields = await mockDocumentFields.listByTemplate(row.templateId)
    return { templateName: template?.name ?? 'Belge', fields, data: row.data ?? {}, _mockId: row.id }
  }

  const res = await fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.ok) throw new Error(body.error ?? 'Belge yüklenemedi.')
  return body
}

export async function submitDocumentByFillToken(token, data, mockId) {
  if (!USE_SUPABASE) {
    await mockDocumentInstances.send(mockId, data)
    return
  }

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, data }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.ok) throw new Error(body.error ?? 'Gönderilemedi.')
}
