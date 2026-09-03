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

// iOS/iPadOS'ta Web Push SADECE "Ana Ekrana Ekle" ile kurulmuş PWA
// içinden çalışır — normal Safari sekmesinde serviceWorker/PushManager
// API'leri var gibi görünse (feature-detection geçse) bile
// Notification.requestPermission()/pushManager.subscribe() hiç
// sonuçlanmadan asılı kalabiliyor (broker: "aç diyorsun açılıyor
// yazıyor takılı kalıyor" — telefonlarda normal Safari sekmesinden
// deneniyor olması en olası sebep). Bu durumu subscribeToPush()
// denemeden ÖNCE ayırt edip anlaşılır bir mesaj veriyoruz.
function needsHomeScreenInstall() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  return isIOS && !isStandalone
}

function withTimeout(promise, ms, message) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function subscribeToPushInner() {
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

// İzin isteyip PushManager aboneliği oluşturur, subscription'ı
// dataProvider'a kaydetmeden JSON olarak döner (çağıran taraf kaydeder) —
// bu dosya sadece tarayıcı API'siyle konuşur, Supabase'i bilmez. 20 saniyelik
// zaman aşımı — hangi adımda olursa olsun tarayıcı hiç yanıt vermezse
// "Açılıyor..." düğmesi sonsuza kadar takılı kalmasın diye (bkz. yukarıdaki
// not, aynı hatanın kök nedeni bilinmeyen başka bir tarayıcıda tekrarlanırsa
// diye ikinci bir güvenlik ağı).
export async function subscribeToPush() {
  if (needsHomeScreenInstall()) {
    throw new Error('iPhone/iPad\'de bildirim alabilmek için önce siteyi ana ekrana eklemen gerekiyor: Paylaş düğmesi → "Ana Ekrana Ekle", sonra oradan aç ve tekrar dene.')
  }
  return withTimeout(subscribeToPushInner(), 20000, 'Bildirim izni zaman aşımına uğradı, tekrar dene.')
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration('/panel/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  const endpoint = subscription?.endpoint ?? null
  if (subscription) await subscription.unsubscribe()
  return endpoint
}
