import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ROLES } from '../lib/roles'
import { USE_SUPABASE } from '../lib/env'
import { getSupabaseClient } from '../lib/supabaseClient'
import { mapSupabaseError } from '../lib/errors'

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

  async function loadProfile(userId) {
    const client = getSupabaseClient()
    const { data, error: profileError } = await client
      .from('users')
      .select('id, ad, email, rol, durum')
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

    return { id: data.id, name: data.ad, email: data.email, role: data.rol }
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
    }),
    [profile, session, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return ctx
}
