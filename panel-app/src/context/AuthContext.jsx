import { createContext, useContext, useMemo, useState } from 'react'
import { ROLES } from '../lib/roles'

// Geçici mock auth. Supabase auth entegrasyonu PART 2 (Supabase şemaları)
// sonrasında bu context'in içini dolduracak; dışa açılan arayüz
// (user, role, setRole) aynı kalacak şekilde tasarlandı.

export const MOCK_USERS = {
  [ROLES.BROKER]: { id: 'u-broker', name: 'Ahmet Erdemir', role: ROLES.BROKER },
  [ROLES.MUDUR]: { id: 'u-mudur', name: 'Ofis Müdürü', role: ROLES.MUDUR },
  [ROLES.OFIS]: { id: 'u-ofis', name: 'Ofis Personeli', role: ROLES.OFIS },
  [ROLES.DANISMAN]: { id: 'u-danisman', name: 'Danışman', role: ROLES.DANISMAN },
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [role, setRole] = useState(ROLES.BROKER)

  const value = useMemo(
    () => ({
      user: MOCK_USERS[role],
      role,
      setRole,
    }),
    [role],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return ctx
}
