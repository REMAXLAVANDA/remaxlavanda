import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, isAuthenticated, error: authError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  // signIn() başarılı olsa bile arkadan gelen profil yüklemesi (bkz.
  // AuthContext'teki onAuthStateChange) başarısız olursa kullanıcı sessizce
  // login'e geri atılıyordu — o hatayı burada da gösteriyoruz ki kullanıcı
  // "hiçbir şey olmadı" hissine kapılmasın.
  const displayError = error ?? authError

  if (isAuthenticated) {
    return <Navigate to={location.state?.from ?? '/panel'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      navigate(location.state?.from ?? '/panel', { replace: true })
    } catch (err) {
      setError(err.message ?? 'Giriş yapılamadı, tekrar dene.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <img src="/panel/remax-balloon.png" alt="RE/MAX Lavanda" className="mx-auto mb-3 h-14 w-14 object-contain" />
          <h1 className="text-lg font-semibold text-ink-900">RE/MAX Lavanda</h1>
          <p className="mt-1 text-sm text-ink-400">Ofis Yönetim Sistemi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-ink-500">
              E-posta
            </label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-ink-200 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="ornek@remaxlavanda.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-ink-500">
              Şifre
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-ink-200 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          {displayError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{displayError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
