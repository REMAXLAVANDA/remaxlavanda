import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS, ROLE_ORDER, canManageUsers } from '../../lib/roles'

export default function ProfileMenu() {
  const { user, role, setRole, isMock, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // KURAL: rol değiştirici SADECE mock modda VE development build'de
  // render edilir. import.meta.env.DEV, Vite tarafından production
  // build'de sabit `false`e çevrilir — bu blok minify sırasında dead-code
  // olarak elenir, yani production'da DOM'a hiç eklenmez.
  const showDevRoleSwitcher = isMock && import.meta.env.DEV

  async function handleLogout() {
    setSigningOut(true)
    try {
      await signOut()
      setOpen(false)
      navigate('/login')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-ink-50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
          {initials}
        </div>
        <ChevronDown size={16} className="text-ink-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lg">
          <div className="border-b border-ink-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink-900">{user.name}</p>
            <p className="text-xs text-ink-400">{ROLE_LABELS[role]}</p>
          </div>

          {showDevRoleSwitcher && (
            <div className="border-b border-ink-100 px-2 py-2">
              <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-amber-600">
                DEV ONLY — Rol olarak görüntüle
              </p>
              {ROLE_ORDER.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r)
                    setOpen(false)
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-ink-50"
                >
                  {ROLE_LABELS[r]}
                  {r === role && <Check size={14} className="text-brand-600" />}
                </button>
              ))}
            </div>
          )}

          <div className="p-2">
            {canManageUsers(role) && (
              <button
                onClick={() => {
                  setOpen(false)
                  navigate('/ayarlar')
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-700 hover:bg-ink-50"
              >
                <Settings size={16} />
                Ayarlar
              </button>
            )}
            <button
              onClick={handleLogout}
              disabled={signingOut}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut size={16} />
              {signingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
