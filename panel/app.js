/* ─────────────────────────────────────────────
   RE/MAX Lavanda — app.js
   PWA: Service Worker + FCM + Standalone detect
───────────────────────────────────────────── */

// ==== Firebase ====
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCTuQUv1wO5OtGhW2GuV0QVMyhJ6UFVKvE",
  authDomain: "lavandacrm.firebaseapp.com",
  projectId: "lavandacrm",
  storageBucket: "lavandacrm.firebasestorage.app",
  messagingSenderId: "95549904499",
  appId: "1:95549904499:web:2d34a208eaa4e474bffc06"
};
// ==== PWA Service-Worker kaydı ====
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
export { FIREBASE_CONFIG };

// Supabase endpoint — index.html'deki SB/KEY ile aynı
const _SB  = 'https://vfqkmluqjaihpgxhqlqt.supabase.co';
const _KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcWttbHVxamFpaHBneGhxbHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTE4ODMsImV4cCI6MjA5ODMyNzg4M30.6jsmD-om_q2ac9zbrHORO8FU9TUjvqAsBh9ux1xhiD8';

// ── 1. Standalone mod tespiti ──
(function detectStandalone() {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true; // iOS Safari
  if (isStandalone) {
    document.body.classList.add('pwa-standalone');
  }
})();

// ── 2. Service Worker kaydı ──
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then(reg => {
      console.log('[SW] Kayıtlı:', reg.scope);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] Yeni sürüm hazır — sayfa yenilenebilir.');
          }
        });
      });
    })
    .catch(err => console.warn('[SW] Kayıt hatası:', err));
}

// ── 3. FCM token al → Supabase'e kaydet ──
async function initFCM() {
  if (!('Notification' in window)) return;

  try {
    // Firebase SDK dinamik yükleme (CDN)
    if (!window.firebase) {
      await Promise.all([
        loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js'),
        loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js'),
      ]);
    }

    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const messaging = firebase.messaging();

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[FCM] Bildirim izni verilmedi.');
      return;
    }

    const token = await messaging.getToken({ vapidKey: FIREBASE_CONFIG.vapidKey });
    if (!token) return;

    // Supabase user_devices tablosuna kaydet (upsert — aynı token iki kez girilmez)
    await fetch(_SB + '/rest/v1/user_devices', {
      method: 'POST',
      headers: {
        'apikey': _KEY,
        'Authorization': 'Bearer ' + _KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        fcm_token: token,
        platform: detectPlatform(),
        created_at: new Date().toISOString(),
      }),
    });

    console.log('[FCM] Token kaydedildi.');

    // Ön planda gelen mesajları göster
    messaging.onMessage(payload => {
      const { title = 'RE/MAX Lavanda', body = '' } = payload.notification || {};
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icons/icon-192.png' });
      }
    });

  } catch (err) {
    console.warn('[FCM] Hata:', err);
  }
}

// ── Yardımcılar ──
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'web';
}

// ── Başlat ──
// SW kaydı dosya başında yapıldı.
window.addEventListener('load', () => {
  initFCM();
});
