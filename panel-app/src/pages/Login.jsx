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
    <div className="flex min-h-screen items-stretch bg-surface-page">
      <div className="hidden w-[300px] shrink-0 flex-col justify-center bg-remax-navy px-10 md:flex">
        <img src="/panel/remax-balloon.png" alt="RE/MAX Lavanda" className="mb-6 h-11 w-11 object-contain" />
        <h1 className="text-2xl font-semibold leading-snug text-white">Ofisin günlük ritmi tek ekranda.</h1>
        <p className="mt-3 text-[13px] text-white/60">
          Portföy, lead, randevu ve ekip performansı — RE/MAX Lavanda ofis portalı.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center md:hidden">
            <img src="/panel/remax-balloon.png" alt="RE/MAX Lavanda" className="mx-auto mb-3 h-14 w-14 object-contain" />
            <h1 className="text-lg font-semibold text-text-primary">RE/MAX Lavanda</h1>
            <p className="mt-1 text-sm text-text-disabled">Ofis Portalı</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-text-secondary">
                E-posta
              </label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-[11px] border border-border-default bg-surface-sunken pl-9 pr-3 text-sm text-text-primary focus:border-brand-500 focus:bg-surface-raised focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="ornek@remaxlavanda.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-text-secondary">
                Şifre
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-[11px] border border-border-default bg-surface-sunken pl-9 pr-3 text-sm text-text-primary focus:border-brand-500 focus:bg-surface-raised focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {displayError && (
              <p className="rounded-lg border border-border-danger bg-tint-red px-3 py-2 text-xs text-brand-700">{displayError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[11px] bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-text-disabled">
            Hesabınla ilgili bir sorun varsa ofis yöneticine başvur.
          </p>
        </div>
      </div>
    </div>
  )
}
