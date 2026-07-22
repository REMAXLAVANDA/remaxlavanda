import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import Modal from '../common/Modal'
import { getCroppedImageFile } from '../../lib/imageCrop'

// Fotoğraf seçildikten hemen sonra açılır — kullanıcı sürükleyip/yakınlaştırıp
// dairesel alanı ayarlar, "Kullan"a basınca sadece o kırpılmış kare
// (fileName korunarak, JPEG'e çevrilerek) uploadAvatarFile()'a gönderilir.
export default function AvatarCropModal({ imageSrc, fileName, onCancel, onCropped }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [processing, setProcessing] = useState(false)

  const handleCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleUse() {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName)
      onCropped(file)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Modal title="Fotoğrafı Kırp" onClose={onCancel} maxWidth="max-w-md">
      <div className="relative h-80 w-full overflow-hidden rounded-xl bg-ink-900">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-ink-600">Yakınlaştır</label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
        >
          Vazgeç
        </button>
        <button
          onClick={handleUse}
          disabled={processing || !croppedAreaPixels}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {processing ? 'Hazırlanıyor...' : 'Kullan'}
        </button>
      </div>
    </Modal>
  )
}
