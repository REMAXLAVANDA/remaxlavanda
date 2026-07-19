import { useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { mapSupabaseError } from '../../lib/errors'

// İlk giriş (create-user) ya da unutulan şifre (reset-user-password)
// sonrası must_change_password=true olan kullanıcı, panele hiç erişemeden
// önce buradan geçmek ZORUNDA — bkz. ProtectedRoute.jsx.
export default function ForceChangePasswordScreen() {
  const { markPasswordChanged, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı.')
      return
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    setSubmitting(true)
    try {
      const client = getSupabaseClient()
      const { error: updateErr } = await client.auth.updateUser({ password })
      if (updateErr) throw mapSupabaseError(updateErr)
      await markPasswordChanged()
    } catch (err) {
      setError(err.message ?? 'Şifre değiştirilemedi, tekrar dene.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <img src="/panel/remax-balloon.png" alt="RE/MAX Lavanda" className="mx-auto mb-3 h-14 w-14 object-contain" />
          <h1 className="text-lg font-semibold text-ink-900">Şifreni Değiştir</h1>
          <p className="mt-1 text-sm text-ink-400">Geçici şifreyle giriş yaptın — devam etmeden önce kalıcı bir şifre belirle.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="new-password" className="mb-1 block text-xs font-medium text-ink-500">
              Yeni şifre
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                autoFocus
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-ink-200 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="En az 8 karakter"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-xs font-medium text-ink-500">
              Yeni şifre (tekrar)
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-ink-200 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Kaydediliyor...' : 'Şifreyi Kaydet'}
          </button>

          <button
            type="button"
            onClick={signOut}
            className="w-full text-center text-xs font-medium text-ink-400 hover:text-ink-600"
          >
            Çıkış yap
          </button>
        </form>
      </div>
    </div>
  )
}
