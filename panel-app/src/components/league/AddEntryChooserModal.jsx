import { TrendingUp, Megaphone, ChevronRight } from 'lucide-react'
import Modal from '../common/Modal'

const OPTIONS = [
  {
    key: 'ciro',
    icon: TrendingUp,
    label: 'Ciro Girişi',
    desc: 'Bir danışmanın kapattığı satış (müşteri adı da burada eklenir)',
  },
  {
    key: 'sosyal_medya',
    icon: Megaphone,
    label: 'Sosyal Medya Aktivitesi',
    desc: 'Instagram, LinkedIn, Google Yorumu vb.',
  },
]

// Eskiden "Ciro Gir"/"Aktivite Ekle" butonları sadece o an açık olan
// sekmede görünüyordu — yeni kullanıcı nereden başlayacağını bulamıyordu
// (bkz. "veri giriş biraz karışık" isteği). Şimdi TEK, her zaman görünür
// "Veri Gir" girişi var. Müşteri Memnuniyeti BİLEREK burada YOK — ayrı bir
// giriş noktası değil, ciro girilirken müşteri adı zaten aynı formda
// ekleniyor (bkz. AddScoreModal); "isim düzelt/işaretle" ihtiyacı için
// Yorum Hakkı paneli zaten sayfada duruyor (broker: "veri gir butonunda
// müşteri memnuniyeti olmasın zaten ciro girerken otomatik giriliyor").
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
