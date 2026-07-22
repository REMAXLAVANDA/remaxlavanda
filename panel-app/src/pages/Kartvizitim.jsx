import { useEffect, useRef, useState } from 'react'
import { Copy, Upload, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { users as usersProvider } from '../lib/dataProvider'
import { uploadAvatarFile } from '../lib/storage'
import { SOSYAL_MEDYA_FIELDS, kartvizitUrl } from '../lib/kartvizit'
import KartvizitCard from '../components/kartvizit/KartvizitCard'
import AvatarCropModal from '../components/kartvizit/AvatarCropModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

export default function Kartvizitim() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data: profile, loading, error, reload } = useAsyncList(() => usersProvider.getMyProfile(user.id), [user.id])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cropSource, setCropSource] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (profile) setForm({ telefon: profile.telefon ?? '', avatarUrl: profile.avatarUrl ?? '', sosyalMedya: profile.sosyalMedya ?? {}, kartvizitAktif: profile.kartvizitAktif })
  }, [profile])

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setSosyal(key, value) {
    setForm((f) => ({ ...f, sosyalMedya: { ...f.sosyalMedya, [key]: value } }))
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // aynı dosyayı üst üste seçebilsin diye
    if (!file) return
    // Doğrudan yüklemek yerine önce kırpma adımı açılıyor — kullanıcı
    // dairesel alanı sürükleyip/yakınlaştırıp onaylayınca gerçek yükleme
    // handleCropped()'ta yapılıyor.
    // Kırpma sonucu her zaman JPEG olduğu için sabit bir isim/uzantı
    // kullanılıyor — kaynak dosya .heic/.png da olsa sorun olmaz.
    setCropSource({ imageSrc: URL.createObjectURL(file), fileName: 'avatar.jpg' })
  }

  async function handleCropped(croppedFile) {
    const source = cropSource
    setCropSource(null)
    if (source) URL.revokeObjectURL(source.imageSrc)
    setUploading(true)
    try {
      const url = await uploadAvatarFile(croppedFile, user.id)
      setField('avatarUrl', url)
      showToast('Fotoğraf yüklendi — kaydetmeyi unutma.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Fotoğraf yüklenemedi, tekrar dene.', 'error')
    } finally {
      setUploading(false)
    }
  }

  function handleCropCancel() {
    if (cropSource) URL.revokeObjectURL(cropSource.imageSrc)
    setCropSource(null)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await usersProvider.updateProfile(user.id, form)
      showToast('Kartvizitin güncellendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(kartvizitUrl(user.id))
    showToast('Kartvizit linki kopyalandı.', 'success')
  }

  return (
    <div>
      <p className="mb-5 text-sm text-ink-500">
        Fotoğraf, sosyal medya linkleri ve telefonunu buradan düzenle — dijital kartvizitin anında güncellenir.
      </p>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && form && (
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-5 rounded-2xl border border-ink-100 bg-white p-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-600">Telefon</label>
              <input
                value={form.telefon}
                onChange={(e) => setField('telefon', e.target.value)}
                placeholder="05xx xxx xx xx"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-600">Fotoğraf</label>
              <div className="flex items-center gap-3">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {(user.name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR')}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-600 hover:bg-ink-50 disabled:opacity-50"
                >
                  <Upload size={14} /> {uploading ? 'Yükleniyor...' : 'Fotoğraf Yükle'}
                </button>
                {form.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setField('avatarUrl', '')}
                    title="Fotoğrafı kaldır"
                    className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-ink-400">Boş bırakırsan kartında baş harflerin görünür. PNG/JPG/WEBP, en fazla 5 MB.</p>
            </div>

            <div className="border-t border-ink-100 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Sosyal Medya</p>
              <div className="space-y-3">
                {SOSYAL_MEDYA_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-xs font-medium text-ink-600">{f.label}</label>
                    <input
                      value={form.sosyalMedya[f.key] ?? ''}
                      onChange={(e) => setSosyal(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink-400">Boş bıraktığın bir link kartvizitinde hiç görünmez.</p>
            </div>

            <div className="flex items-center justify-between border-t border-ink-100 pt-4">
              <div>
                <p className="text-sm font-medium text-ink-800">Kartvizit açık</p>
                <p className="text-[11px] text-ink-400">Kapatırsan linkin/QR'ın kimseye açılmaz.</p>
              </div>
              <button
                onClick={() => setField('kartvizitAktif', !form.kartvizitAktif)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  form.kartvizitAktif ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                }`}
              >
                {form.kartvizitAktif ? 'Açık' : 'Kapalı'}
              </button>
            </div>

            <div className="flex items-center gap-2 border-t border-ink-100 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-600 hover:bg-ink-50"
              >
                <Copy size={14} /> Linki Kopyala
              </button>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Önizleme</p>
            <KartvizitCard card={{ name: user.name, telefon: form.telefon, email: profile.email, avatarUrl: form.avatarUrl, role: profile.role, sosyalMedya: form.sosyalMedya }} userId={user.id} />
          </div>
        </div>
      )}

      {cropSource && (
        <AvatarCropModal
          imageSrc={cropSource.imageSrc}
          fileName={cropSource.fileName}
          onCancel={handleCropCancel}
          onCropped={handleCropped}
        />
      )}
    </div>
  )
}
