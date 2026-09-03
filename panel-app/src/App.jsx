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

// Her sayfa artık ayrı paket — girişte tek dev bir JS indirilmesin diye
// (broker: "portalda yavaşlama var mı" — tüm sayfalar tek ~880 KB pakette
// birleşmişti, mobil/LTE'de hissedilir gecikme yaratıyordu). Route
// değişince ilgili sayfanın paketi indirilir, ilk açılış artık daha küçük.
const Panel = lazy(() => import('./pages/Panel'))
const Firsatlar = lazy(() => import('./pages/Firsatlar'))
const Leads = lazy(() => import('./pages/Leads'))
const Recruiting = lazy(() => import('./pages/Recruiting'))
const Takip = lazy(() => import('./pages/Takip'))
const Lig = lazy(() => import('./pages/Lig'))
const Rehber = lazy(() => import('./pages/Rehber'))
const Ayarlar = lazy(() => import('./pages/Ayarlar'))
const Login = lazy(() => import('./pages/Login'))
const Kartvizitim = lazy(() => import('./pages/Kartvizitim'))
const KartvizitPublic = lazy(() => import('./pages/KartvizitPublic'))
const MusteriBelgeDoldur = lazy(() => import('./pages/MusteriBelgeDoldur'))
// Takvim, FullCalendar gibi ağır bir kütüphane taşıdığı için ayrı paket.
const Takvim = lazy(() => import('./pages/Takvim'))
// Ofis TV'sindeki Etkinlik Panosu — nadiren açılan, kabuksuz ayrı bir görünüm.
const Pano = lazy(() => import('./pages/Pano'))

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
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/k/:userId" element={<KartvizitPublic />} />
                <Route path="/belge-doldur/:token" element={<MusteriBelgeDoldur />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/pano" element={<Pano />} />
                  <Route element={<AppLayout />}>
                    <Route index element={<Navigate to="/panel" replace />} />
                    <Route path="/panel" element={<Panel />} />
                    <Route path="/firsatlar" element={<Firsatlar />} />
                    <Route path="/takvim" element={<Takvim />} />
                    <Route path="/gorevler" element={<Takvim />} />
                    <Route path="/operasyon" element={<Firsatlar />} />
                    <Route path="/leads" element={<Leads />} />
                    <Route path="/recruiting" element={<Recruiting />} />
                    <Route path="/takip" element={<Takip />} />
                    <Route path="/egitim" element={<Takip />} />
                    <Route path="/lig" element={<Lig />} />
                    <Route path="/rehber" element={<Rehber />} />
                    <Route path="/kartvizitim" element={<Kartvizitim />} />
                    <Route path="/ayarlar" element={<Ayarlar />} />
                    <Route path="*" element={<Navigate to="/panel" replace />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </HashRouter>
        </ToastProvider>
      </UsersProvider>
    </AuthProvider>
  )
}
