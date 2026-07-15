import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AppLayout from './components/layout/AppLayout'

import Panel from './pages/Panel'
import Firsatlar from './pages/Firsatlar'
import Takvim from './pages/Takvim'
import Egitim from './pages/Egitim'
import Santral from './pages/Santral'
import Takip from './pages/Takip'
import Lig from './pages/Lig'
import Rehber from './pages/Rehber'
import Ayarlar from './pages/Ayarlar'

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
              <Route path="/takvim" element={<Takvim />} />
              <Route path="/egitim" element={<Egitim />} />
              <Route path="/santral" element={<Santral />} />
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
