import Modal from './Modal'

export default function ConfirmDialog({
  title = 'Emin misin?',
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  onConfirm,
  onCancel,
  confirming,
  tone = 'primary',
}) {
  return (
    <Modal title={title} onClose={onCancel} maxWidth="max-w-sm">
      {message && <p className="text-sm text-ink-600">{message}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={confirming}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
            tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
          }`}
        >
          {confirming ? 'Gönderiliyor...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
