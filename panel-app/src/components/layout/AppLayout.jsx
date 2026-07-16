import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { MODULES } from '../../lib/modules'

function useCurrentTitle() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/ayarlar')) return 'Ayarlar'
  const active = MODULES.find((m) => pathname.startsWith(m.path))
  return active?.label ?? 'RE/MAX Lavanda'
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const title = useCurrentTitle()

  return (
    <div className="h-screen overflow-hidden bg-ink-50 lg:flex">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
