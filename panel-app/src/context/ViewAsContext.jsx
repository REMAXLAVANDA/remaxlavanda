import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { setViewAsActive } from '../lib/viewAsGuard'

// "Birini Olarak Görüntüle" — broker, 2026-11-07: "kullanıcılar arası
// geçiş yapabilir miyim danışman ofis vs onların ekranını görebilir
// miyim". Gerçek kimlik değişmiyor (hâlâ broker'ın kendi oturumu) —
// sadece AuthContext.jsx'teki useAuth() birleştirmesiyle uygulamanın
// GÖRDÜĞÜ role/user geçici olarak değiştiriliyor, yazma istekleri
// lib/viewAsGuard.js ile engelleniyor. Kim başlatabilir (broker/owner)
// kontrolü BURADA değil, useAuth()'ın birleştirme noktasında — ekstra
// güvenlik değil (gerçek auth.uid() hiç değişmiyor, RLS zaten gerçek
// kimliğe göre çalışıyor), sadece "kazara/yanlışlıkla devreye girmesin"
// tutarlılığı için tek bir karar noktası.
const STORAGE_KEY = 'remaxlavanda_view_as'

const ViewAsContext = createContext(null)

export function ViewAsProvider({ children }) {
  const [target, setTargetState] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    setViewAsActive(Boolean(target))
    try {
      if (target) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(target))
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // sessionStorage kapalıysa (gizli sekme vb.) sessizce vazgeç — mod
      // yine çalışır, sadece sayfa yenilenince sıfırlanır.
    }
  }, [target])

  const value = useMemo(
    () => ({
      target,
      startViewAs(user) {
        setTargetState({ id: user.id, ad: user.name, rol: user.role })
      },
      stopViewAs() {
        setTargetState(null)
      },
    }),
    [target],
  )

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext)
  if (!ctx) throw new Error('useViewAs, ViewAsProvider içinde kullanılmalı')
  return ctx
}
