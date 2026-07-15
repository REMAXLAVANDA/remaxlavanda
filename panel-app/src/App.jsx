import { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AppLayout from './components/layout/AppLayout'

import Panel from './pages/Panel'
import Firsatlar from './pages/Firsatlar'
import Egitim from './pages/Egitim'
import Operasyon from './pages/Operasyon'
import Takip from './pages/Takip'
import Lig from './pages/Lig'
import Rehber from './pages/Rehber'
import Ayarlar from './pages/Ayarlar'

// Takvim, FullCalendar gibi ağır bir kütüphane taşıdığı için ana paketi
// şişirmemesi adına lazy-load ediliyor — sadece Takvim'e girilince indirilir.
const Takvim = lazy(() => import('./pages/Takvim'))

function PageLoading() {
  return <div className="py-16 text-center text-sm text-ink-400">Yükleniyor...</div>
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
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
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
