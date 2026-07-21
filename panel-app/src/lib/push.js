// Web Push abonelik yönetimi — service worker register, izin isteme,
// PushManager aboneliği. Gönderim tarafı (asıl bildirim) tamamen sunucuda
// (bkz. supabase/functions/notify-*) — burası sadece aboneliği kurup
// dataProvider.users.savePushSubscription ile kaydediyor.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && Boolean(VAPID_PUBLIC_KEY)
}

export function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

// İzin isteyip PushManager aboneliği oluşturur, subscription'ı
// dataProvider'a kaydetmeden JSON olarak döner (çağıran taraf kaydeder) —
// bu dosya sadece tarayıcı API'siyle konuşur, Supabase'i bilmez.
export async function subscribeToPush() {
  const registration = await navigator.serviceWorker.register('/panel/sw.js', { scope: '/panel/' })
  await navigator.serviceWorker.ready

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Bildirim izni verilmedi.')
  }

  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))

  return subscription.toJSON()
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration('/panel/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  const endpoint = subscription?.endpoint ?? null
  if (subscription) await subscription.unsubscribe()
  return endpoint
}
