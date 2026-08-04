import { TrendingUp, Megaphone, MessageSquareText, ChevronRight } from 'lucide-react'
import Modal from '../common/Modal'

const OPTIONS = [
  {
    key: 'ciro',
    icon: TrendingUp,
    label: 'Ciro Girişi',
    desc: 'Bir danışmanın kapattığı satış',
  },
  {
    key: 'sosyal_medya',
    icon: Megaphone,
    label: 'Sosyal Medya Aktivitesi',
    desc: 'Instagram, LinkedIn, Google Yorumu vb.',
  },
  {
    key: 'memnuniyet',
    icon: MessageSquareText,
    label: 'Müşteri Memnuniyeti',
    desc: 'Ciroya dönen müşterinin adı (Yorum Hakkı)',
  },
]

// Eskiden 3 ayrı yerden başlıyordu: "Ciro Gir"/"Aktivite Ekle" butonları
// sadece o an açık olan sekmede görünüyordu, Memnuniyet'in ise hiç butonu
// yoktu (doğrudan Yorum Hakkı panelinden ekleniyordu) — yeni kullanıcı
// nereden başlayacağını bulamıyordu (bkz. "veri giriş biraz karışık"
// isteği). Şimdi TEK, her zaman görünür "Veri Gir" girişi var; burada
// kategori seçilir, sonra ilgili yere yönlendirilir.
export default function AddEntryChooserModal({ onClose, onChoose }) {
  return (
    <Modal title="Veri Gir" onClose={onClose}>
      <p className="mb-3 text-xs text-text-disabled">Hangi kategoriye veri gireceksin?</p>
      <div className="space-y-2">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => onChoose(o.key)}
            className="flex w-full items-center gap-3 rounded-xl border border-border-default p-3 text-left hover:border-brand-300 hover:bg-brand-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-brand-600">
              <o.icon size={18} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-text-primary">{o.label}</span>
              <span className="block truncate text-xs text-text-disabled">{o.desc}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-text-disabled" />
          </button>
        ))}
      </div>
    </Modal>
  )
}
