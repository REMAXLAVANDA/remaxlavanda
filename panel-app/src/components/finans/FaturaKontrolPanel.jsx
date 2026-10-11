import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { ciroRaporlari as ciroRaporlariProvider, bankaHareketleri as bankaHareketleriProvider } from '../../lib/dataProvider'
import { ISLEM_TIPI_LABELS, PORTFOY_TIPI_LABELS } from '../../lib/ciroRaporlari'
import { BANKA_HAREKETI_DURUM_LABELS, BANKA_HAREKETI_DURUM_STYLES } from '../../lib/bankaHareketleri'
import { formatDateOnly, formatThousands, parseThousands } from '../../lib/format'
import { LoadingState, ErrorState } from '../common/AsyncState'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

async function loadAll() {
  const [raporlar, hareketler] = await Promise.all([ciroRaporlariProvider.list(), bankaHareketleriProvider.list()])
  return { raporlar, hareketler }
}

// Finans > Raporlar > Fatura Kontrol — broker, 2026-10-11: "muhasebeye bir
// kullanıcı açalım ve sadece kesmesi gereken ve danışmanın kestiği
// faturaları görsün, bunları kontrol etsin" — netleşen hali: AYRI bir
// "muhasebe" rolü YOK, bu görevi broker/owner hesabı yapıyor
// (canControlFaturaKontrol = canApproveCiroRaporu, bkz. lib/ciroRaporlari.js
// notu). 4 madde: (1) danışmanın kestiği faturayı teyit et, (2) ofisin
// kendi faturasını kes, (3) MyRemax'a girildi işareti, (4) işlem
// tamamlandı. Aynı oturumda eklenen 5. madde: banka hareketleri/dekontlar
// da AYNI "teyit" deseniyle kontrol edilsin (bkz. migration 20261011140000).
export default function FaturaKontrolPanel() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [submitting, setSubmitting] = useState(false)
  const [ofisForms, setOfisForms] = useState({})

  const userName = (id) => knownUsers[id]?.name ?? '—'

  const raporlar = useMemo(
    () => (data?.raporlar ?? []).filter((r) => r.durum === 'onay_bekliyor' || r.durum === 'onaylandi'),
    [data],
  )
  const dekontlar = useMemo(() => (data?.hareketler ?? []).filter((h) => h.tip !== 'cikis'), [data])

  function ofisForm(raporId, rapor) {
    return (
      ofisForms[raporId] ?? {
        no: rapor.ofisFaturaNo ?? '',
        tarih: rapor.ofisFaturaTarihi ?? '',
        tutar: rapor.ofisFaturaTutari != null ? formatThousands(String(rapor.ofisFaturaTutari)) : '',
      }
    )
  }
  function setOfisFormPatch(raporId, patch) {
    setOfisForms((f) => ({ ...f, [raporId]: { ...ofisForm(raporId, { ofisFaturaNo: '', ofisFaturaTarihi: '', ofisFaturaTutari: null }), ...patch } }))
  }

  async function handleTeyit(katilimciId, deger) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.katilimciTeyitEt(katilimciId, user.id, deger)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOfisFaturasiKaydet(raporId) {
    const form = ofisForm(raporId, { ofisFaturaNo: '', ofisFaturaTarihi: '', ofisFaturaTutari: null })
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.ofisFaturasiKaydet(raporId, {
        no: form.no.trim(),
        tarih: form.tarih || null,
        tutar: parseThousands(form.tutar),
      })
      showToast('Ofis faturası kaydedildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMyremax(raporId, deger) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.setMyremaxGirildi(raporId, deger)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTamamlandi(raporId, deger) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.setMuhasebeTamamlandi(raporId, deger, user.id)
      showToast(deger ? 'İşlem tamamlandı olarak işaretlendi.' : 'İşlem tamamlandı işareti kaldırıldı.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDekontTeyit(hareketId, deger) {
    setSubmitting(true)
    try {
      await bankaHareketleriProvider.teyitEt(hareketId, user.id, deger)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-sm font-semibold text-text-primary">Faturalar</h2>
        <p className="mb-3 text-xs text-text-muted">
          Onaya gönderilmiş/onaylanmış raporlardaki danışman faturaları — kesilmesi gerekenler ve kesilenler bir arada.
        </p>
        {raporlar.length === 0 ? (
          <p className="text-sm text-text-muted">Henüz onaya gönderilmiş/onaylanmış rapor yok.</p>
        ) : (
          <div className="space-y-3">
            {raporlar.map((r) => {
              const form = ofisForm(r.id, r)
              return (
                <div key={r.id} className="rounded-2xl border border-border-default p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-text-primary">
                      <span className="font-medium">{ISLEM_TIPI_LABELS[r.islemTipi] ?? r.islemTipi}</span>
                      <span className="text-text-muted"> · {PORTFOY_TIPI_LABELS[r.portfoyTipi] ?? 'Portföy'} {r.disBeyanKodu ?? '—'}</span>
                      <span className="text-text-muted"> · {formatDateOnly(r.islemTarihi)}</span>
                    </div>
                    {r.muhasebeTamamlandi && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">İşlem Tamamlandı</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(r.katilimcilar ?? []).map((k) => (
                      <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-sunken p-2.5">
                        <div className="text-xs text-text-secondary">
                          <span className="font-medium text-text-primary">{userName(k.danismanId)}</span>
                          {k.faturaNo ? (
                            <>
                              {' '}
                              — Fatura {k.faturaNo} · {tl(k.faturaTutari)}
                              {k.faturaTarihi && ` · ${formatDateOnly(k.faturaTarihi)}`}
                            </>
                          ) : (
                            <span className="text-amber-700"> — henüz fatura kesilmedi (önerilen {tl(k.komisyonTutariOnerisi)})</span>
                          )}
                        </div>
                        {k.faturaNo && (
                          <button
                            disabled={submitting}
                            onClick={() => handleTeyit(k.id, !k.teyitEdildi)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                              k.teyitEdildi ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {k.teyitEdildi ? 'Teyit Edildi' : 'Teyit Et'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border-subtle pt-3">
                    <input
                      value={form.no}
                      onChange={(e) => setOfisFormPatch(r.id, { no: e.target.value })}
                      placeholder="Ofis fatura no"
                      className="w-32 rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted"
                    />
                    <input
                      type="date"
                      value={form.tarih}
                      onChange={(e) => setOfisFormPatch(r.id, { tarih: e.target.value })}
                      className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
                    />
                    <input
                      inputMode="numeric"
                      value={form.tutar}
                      onChange={(e) => setOfisFormPatch(r.id, { tutar: formatThousands(e.target.value) })}
                      placeholder="Ofis fatura tutarı"
                      className="w-32 rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted"
                    />
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleOfisFaturasiKaydet(r.id)}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      Ofis Faturasını Kaydet
                    </button>
                    <label className="ml-auto flex items-center gap-1.5 text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        checked={!!r.myremaxGirildi}
                        onChange={(e) => handleMyremax(r.id, e.target.checked)}
                        disabled={submitting}
                      />
                      MyRemax'a girildi
                    </label>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleTamamlandi(r.id, !r.muhasebeTamamlandi)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                        r.muhasebeTamamlandi ? 'bg-ink-100 text-ink-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {r.muhasebeTamamlandi ? 'Tamamlandı İşaretini Kaldır' : 'İşlem Tamamlandı'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-text-primary">Dekontlar</h2>
        <p className="mb-3 text-xs text-text-muted">Danışmanların ve broker'ın girdiği tüm banka dekontları.</p>
        {dekontlar.length === 0 ? (
          <p className="text-sm text-text-muted">Henüz dekont yok.</p>
        ) : (
          <div className="space-y-2">
            {dekontlar.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle p-3">
                <div className="min-w-0 text-xs text-text-secondary">
                  <span className="font-medium text-text-primary">{tl(h.tutar)}</span> — {h.gonderenAdi || 'gönderen belirtilmemiş'}
                  <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${BANKA_HAREKETI_DURUM_STYLES[h.durum]}`}>
                    {BANKA_HAREKETI_DURUM_LABELS[h.durum]}
                  </span>
                  <p className="mt-0.5 text-text-muted">
                    {formatDateOnly(h.tarih)}
                    {h.referansNo && ` · Referans No: ${h.referansNo}`}
                    {h.dekontTarihi && ` · Dekont Tarihi: ${formatDateOnly(h.dekontTarihi)}`}
                  </p>
                </div>
                <button
                  disabled={submitting}
                  onClick={() => handleDekontTeyit(h.id, !h.teyitEdildi)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                    h.teyitEdildi ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {h.teyitEdildi ? 'Teyit Edildi' : 'Teyit Et'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
