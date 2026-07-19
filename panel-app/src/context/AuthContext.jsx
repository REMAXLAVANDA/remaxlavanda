import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ROLES } from '../lib/roles'
import { USE_SUPABASE } from '../lib/env'
import { getSupabaseClient } from '../lib/supabaseClient'
import { ApiError, mapSupabaseError } from '../lib/errors'

// Mock modda kullanılan sabit kullanıcı seti — sadece development'ta,
// USE_SUPABASE=false iken devrede. lib/dataProvider/mockProvider.js
// (users.listKnown()) buradan MOCK_USERS'ı import ediyor — sayfalar artık
// bunu doğrudan DEĞİL, UsersContext (useKnownUsers) üzerinden okuyor.
export const MOCK_USERS = {
  [ROLES.BROKER]: { id: 'u-broker', name: 'Ahmet Erdemir', role: ROLES.BROKER },
  [ROLES.OWNER]: { id: 'u-owner', name: 'Ofis Sahibi (Owner)', role: ROLES.OWNER },
  [ROLES.OFIS]: { id: 'u-ofis', name: 'Ofis Personeli', role: ROLES.OFIS },
  [ROLES.DANISMAN]: { id: 'u-danisman', name: 'Danışman', role: ROLES.DANISMAN },
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  if (!USE_SUPABASE) return <MockAuthProvider>{children}</MockAuthProvider>
  return <RealAuthProvider>{children}</RealAuthProvider>
}

// --- Mock mod: dev-only rol seçici -------------------------------------------
function MockAuthProvider({ children }) {
  const [role, setRole] = useState(ROLES.BROKER)

  const value = useMemo(
    () => ({
      user: MOCK_USERS[role],
      role,
      isAuthenticated: true,
      loading: false,
      error: null,
      isMock: true,
      setRole,
      async signIn() {
        // Mock modda giriş ekranı hiç kullanılmaz (ProtectedRoute passthrough).
      },
      async signOut() {
        setRole(ROLES.BROKER)
      },
    }),
    [role],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// --- Gerçek mod: Supabase Auth ------------------------------------------------
function RealAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadProfileOnce(userId) {
    const client = getSupabaseClient()
    const { data, error: profileError } = await client
      .from('users')
      .select('id, ad, email, rol, durum, must_change_password')
      .eq('id', userId)
      .single()

    if (profileError) throw mapSupabaseError(profileError)

    // Frontend rolü/aktifliği KENDİ BAŞINA belirlemez — burada sadece
    // sunucudan (RLS ile korunan public.users tablosundan) gelen değeri
    // okuyoruz. durum='pasif' ise oturumu kapatıp kullanıcıyı bilgilendiriyoruz;
    // gerçek erişim engeli zaten RLS/is_active() tarafında (bkz. migration).
    if (data.durum !== 'aktif') {
      await client.auth.signOut()
      throw new Error('Hesabın pasif durumda. Erişim için ofis yöneticinle iletişime geç.')
    }

    return { id: data.id, name: data.ad, email: data.email, role: data.rol, mustChangePassword: data.must_change_password }
  }

  // Girişten hemen sonra (özellikle sign-in akışında) auth.uid() bağlamının
  // PostgREST tarafında oturmasıyla bu ilk profil sorgusu arasında kısa bir
  // gecikme yaşanabiliyor — bu durumda users_select_all RLS'i (is_active())
  // satırı henüz "görmez" ve .single() PGRST116 (not_found) fırlatır. Gerçek
  // "pasif kullanıcı" hatası sessizOut() içinde ayrı fırlatıldığı için burada
  // SADECE not_found ile başarısız olursa kısa bir bekleyip bir kez daha
  // deniyoruz — aksi halde kullanıcı hiçbir hata görmeden login'e geri atılıyordu.
  async function loadProfile(userId) {
    try {
      return await loadProfileOnce(userId)
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'not_found') {
        await new Promise((resolve) => setTimeout(resolve, 700))
        return await loadProfileOnce(userId)
      }
      throw err
    }
  }

  useEffect(() => {
    let cancelled = false
    const client = getSupabaseClient()

    client.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return
        setSession(data.session)
        if (data.session) {
          const p = await loadProfile(data.session.user.id)
          if (!cancelled) setProfile(p)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Oturum kontrol edilemedi.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        try {
          const p = await loadProfile(newSession.user.id)
          setProfile(p)
          setError(null)
        } catch (err) {
          setProfile(null)
          setError(err.message ?? 'Profil yüklenemedi.')
        }
      } else {
        setProfile(null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signIn(email, password) {
    const client = getSupabaseClient()
    setError(null)
    const { error: signInError } = await client.auth.signInWithPassword({ email, password })
    if (signInError) {
      const mapped = mapSupabaseError(signInError)
      setError(mapped.message)
      throw mapped
    }
  }

  async function signOut() {
    const client = getSupabaseClient()
    await client.auth.signOut()
    setProfile(null)
    setSession(null)
  }

  // İlk giriş / şifre sıfırlama sonrası zorunlu şifre değiştirme akışı
  // (bkz. ProtectedRoute + ForceChangePasswordScreen) tamamlanınca çağrılır
  // — auth.updateUser({password}) zaten çağrıldıktan SONRA burası sadece
  // profildeki must_change_password bayrağını kapatır (kendi satırı,
  // users_update_self_or_broker RLS'i buna izin veriyor).
  const markPasswordChanged = useCallback(async () => {
    const client = getSupabaseClient()
    if (!profile) return
    const { error: updateErr } = await client.from('users').update({ must_change_password: false }).eq('id', profile.id)
    if (updateErr) throw mapSupabaseError(updateErr)
    setProfile((prev) => (prev ? { ...prev, mustChangePassword: false } : prev))
  }, [profile])

  const value = useMemo(
    () => ({
      user: profile,
      role: profile?.role ?? null,
      isAuthenticated: Boolean(session && profile),
      loading,
      error,
      isMock: false,
      signIn,
      signOut,
      markPasswordChanged,
    }),
    [profile, session, loading, error, markPasswordChanged],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return ctx
}
