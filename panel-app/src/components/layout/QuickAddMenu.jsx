import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Target, ListChecks, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { canManageTasks } from '../../lib/tasks'

// Lead Havuzu'nda "hızlı kayıt" yok — lead'ler danışman/ofis tarafından
// elle girilmiyor, reklam kanallarından (Meta vb.) veya santral çağrısından
// geliyor (bkz. lib/leads.js). O yüzden burada sadece Fırsat ve Görev var.
export default function QuickAddMenu() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const items = [
    { key: 'firsat', label: 'Fırsat ekle', icon: Target, path: '/firsatlar?yeni=firsat', show: true },
    { key: 'gorev', label: 'Görev ekle', icon: ListChecks, path: '/gorevler?yeni=gorev', show: canManageTasks(role) },
  ].filter((i) => i.show)

  if (items.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-[11px] bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
      >
        <Plus size={16} />
        Hızlı kayıt
        <ChevronDown size={14} className="opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-xl border border-border-default bg-surface-raised p-1.5 shadow-lg">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setOpen(false)
                navigate(item.path)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-text-primary hover:bg-surface-sunken"
            >
              <item.icon size={16} className="text-brand-600" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
