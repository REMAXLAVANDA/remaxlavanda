import { NavLink } from 'react-router-dom'
import { getModulesForRole } from '../../lib/modules'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar({ open, onNavigate }) {
  const { role } = useAuth()
  const modules = getModulesForRole(role)

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-64 shrink-0 border-r border-ink-100 bg-white
        transition-transform duration-200 lg:static lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lavanda-600 text-sm font-semibold text-white">
          RL
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink-900">RE/MAX Lavanda</p>
          <p className="text-xs text-ink-400">Portal</p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 py-2">
        {modules.map((m) => (
          <NavLink
            key={m.key}
            to={m.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-lavanda-50 text-lavanda-700'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              }`
            }
          >
            <m.icon size={18} strokeWidth={2} />
            {m.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
