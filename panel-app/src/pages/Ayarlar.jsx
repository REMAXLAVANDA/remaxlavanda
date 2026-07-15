import { useState } from 'react'
import { Users, Shield, Tag, ScrollText } from 'lucide-react'
import ModulePlaceholder from '../components/common/ModulePlaceholder'

const TABS = [
  { key: 'kullanicilar', label: 'Kullanıcılar', icon: Users },
  { key: 'yetki', label: 'Yetki', icon: Shield },
  { key: 'kategori', label: 'Kategori', icon: Tag },
  { key: 'log', label: 'Log', icon: ScrollText },
]

export default function Ayarlar() {
  const [tab, setTab] = useState(TABS[0].key)
  const active = TABS.find((t) => t.key === tab)

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <ModulePlaceholder
        icon={active.icon}
        title={active.label}
        description="Kullanıcı, yetki, kategori ve log yönetimi burada toplanacak."
        note="İlgili modüllerle birlikte doldurulacak"
      />
    </div>
  )
}
