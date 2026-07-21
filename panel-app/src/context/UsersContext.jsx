import { createContext, useContext, useEffect, useState } from 'react'
import { users as usersProvider } from '../lib/dataProvider'
import { useAuth } from './AuthContext'

// "Kim kimdir" (isim/rol çözümleme) artık mock'a özel bir sabit değil —
// dataProvider.users.listKnown() üzerinden hem mock hem gerçek Supabase
// modunda aynı arayüzle çalışır. Bir kez yüklenir, uygulama boyunca
// context'ten okunur (her sayfa ayrı ayrı fetch etmesin diye).
const UsersContext = createContext(null)

export function UsersProvider({ children }) {
  // ÖNEMLİ: Bu effect AuthContext'teki isAuthenticated'a bağlı — App.jsx'te
  // UsersProvider, AuthProvider'ın İÇİNDE ama bağımsız bir bileşen, yani
  // kendi effect'i sayfa her açıldığında AuthProvider'ın oturum/profil
  // yüklemesini BEKLEMEDEN hemen ateşleniyordu. auth.uid() PostgREST
  // tarafında henüz oturmamışken atılan sorguda users_select_all RLS'i hata
  // FIRLATMIYOR, sessizce boş satır döndürüyor — sonuç: sayılar
  // (score_entries'ten gelen, farklı bir RLS yolu) doğru görünürken
  // isimler '—' kalıyor, hatta bazı listeler tamamen boş görünüyor (bkz.
  // Panel > Lig Durumu / Danışman Sağlık Skoru — gerçek üretimde
  // gözlemlendi). Sabit bir gecikmeyle "bir kez daha dene" denendi ama bu
  // bir yarış PENCERESİ değil, sıralama sorunuydu — bu yüzden isAuthenticated
  // true olana kadar (yani profil sorgusu RLS'ten BAŞARIYLA geçene kadar,
  // ki bu auth.uid()'in kesin oturduğunun kanıtı) hiç sorgu atmıyoruz.
  const { isAuthenticated } = useAuth()
  const [knownUsers, setKnownUsers] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(true)
      return
    }
    let cancelled = false
    setLoading(true)
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
  }, [isAuthenticated])

  return <UsersContext.Provider value={{ knownUsers, loading }}>{children}</UsersContext.Provider>
}

export function useKnownUsers() {
  const ctx = useContext(UsersContext)
  if (!ctx) throw new Error('useKnownUsers, UsersProvider içinde kullanılmalı')
  return ctx
}
