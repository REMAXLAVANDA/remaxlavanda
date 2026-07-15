import { X } from 'lucide-react'

// Paylaşılan modal kabuğu — yeni modallar (Rehber, Takip vb.) bunu kullanır.
// Var olan Fırsatlar/Takvim/Santral/Eğitim modalları kendi içinde aynı
// yapıyı tekrar ediyor; davranışları test edilmiş olduğundan bu PART'ta
// riske atılmadı, ama yeni eklenecek her modal buradan başlamalı.
export default function Modal({ title, onClose, children, maxWidth = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl bg-white p-6 shadow-lg`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-400 hover:bg-ink-50">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
