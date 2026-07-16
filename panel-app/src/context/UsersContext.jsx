import { createContext, useContext, useEffect, useState } from 'react'
import { users as usersProvider } from '../lib/dataProvider'

// "Kim kimdir" (isim/rol çözümleme) artık mock'a özel bir sabit değil —
// dataProvider.users.listKnown() üzerinden hem mock hem gerçek Supabase
// modunda aynı arayüzle çalışır. Bir kez yüklenir, uygulama boyunca
// context'ten okunur (her sayfa ayrı ayrı fetch etmesin diye).
const UsersContext = createContext(null)

export function UsersProvider({ children }) {
  const [knownUsers, setKnownUsers] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    usersProvider
      .listKnown()
      .then((map) => {
        if (!cancelled) setKnownUsers(map)
      })
      .catch(() => {
        // Kullanıcı isim çözümlemesi ikincil bir özellik — başarısız olsa
        // bile sayfa boş bir map ile çalışmaya devam edebilir (isimler
        // yerine '—' gösterilir), bu yüzden burada sayfayı bloke eden bir
        // hata state'i tutmuyoruz.
        if (!cancelled) setKnownUsers({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <UsersContext.Provider value={{ knownUsers, loading }}>{children}</UsersContext.Provider>
}

export function useKnownUsers() {
  const ctx = useContext(UsersContext)
  if (!ctx) throw new Error('useKnownUsers, UsersProvider içinde kullanılmalı')
  return ctx
}
