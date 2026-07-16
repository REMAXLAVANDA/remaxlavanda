import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LoadingState } from '../common/AsyncState'

// Mock modda (isMock) auth zaten her zaman "dolu" — bu route sadece
// gerçek Supabase modunda (isMock=false) devreye girer: oturum yoksa
// /login'e, varsa istenen sayfaya izin verir.
export default function ProtectedRoute() {
  const { isMock, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (isMock) return <Outlet />

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <LoadingState label="Oturum kontrol ediliyor..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
