import { Suspense, lazy, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { UsersProvider } from './context/UsersContext'
import { ToastProvider } from './context/ToastContext'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ConfigErrorScreen from './components/common/ConfigErrorScreen'
import { USE_SUPABASE } from './lib/env'
import { getSupabaseClient, MissingSupabaseConfigError } from './lib/supabaseClient'

import Panel from './pages/Panel'
import Firsatlar from './pages/Firsatlar'
import Egitim from './pages/Egitim'
import Operasyon from './pages/Operasyon'
import Takip from './pages/Takip'
import Lig from './pages/Lig'
import Rehber from './pages/Rehber'
import Ayarlar from './pages/Ayarlar'
import Login from './pages/Login'

// Takvim, FullCalendar gibi ağır bir kütüphane taşıdığı için ana paketi
// şişirmemesi adına lazy-load ediliyor — sadece Takvim'e girilince indirilir.
const Takvim = lazy(() => import('./pages/Takvim'))

function PageLoading() {
  return <div className="py-16 text-center text-sm text-ink-400">Yükleniyor...</div>
}

// Uygulama açılışında TEK SEFERLİK kontrol: production'da (veya
// VITE_DATA_SOURCE=supabase ile) Supabase env değişkenleri eksikse,
// uygulamanın yarım/bozuk render olmasındansa net bir hata ekranı gösterir.
function checkSupabaseConfig() {
  if (!USE_SUPABASE) return { ok: true }
  try {
    getSupabaseClient()
    return { ok: true }
  } catch (err) {
    if (err instanceof MissingSupabaseConfigError) return { ok: false }
    throw err
  }
}

export default function App() {
  const [configOk, setConfigOk] = useState(null)

  useEffect(() => {
    setConfigOk(checkSupabaseConfig().ok)
  }, [])

  if (configOk === null) return null
  if (!configOk) return <ConfigErrorScreen />

  return (
    <AuthProvider>
      <UsersProvider>
        <ToastProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="/panel" replace />} />
                  <Route path="/panel" element={<Panel />} />
                  <Route path="/firsatlar" element={<Firsatlar />} />
                  <Route
                    path="/takvim"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <Takvim />
                      </Suspense>
                    }
                  />
                  <Route path="/egitim" element={<Egitim />} />
                  <Route path="/operasyon" element={<Operasyon />} />
                  <Route path="/takip" element={<Takip />} />
                  <Route path="/lig" element={<Lig />} />
                  <Route path="/rehber" element={<Rehber />} />
                  <Route path="/ayarlar" element={<Ayarlar />} />
                  <Route path="*" element={<Navigate to="/panel" replace />} />
                </Route>
              </Route>
            </Routes>
          </HashRouter>
        </ToastProvider>
      </UsersProvider>
    </AuthProvider>
  )
}
