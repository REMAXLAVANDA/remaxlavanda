import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Sayfalar artık ayrı paketler halinde route değişince indiriliyor (bkz.
// App.jsx'teki lazy-load) — bu paketler her deploy'da yeni dosya adlarıyla
// yeniden oluşuyor, eskileri sunucudan siliniyor. Bir sekme deploy
// ARASINDA açık kalırsa (broker: "bugün ben, ofis ve danışmanlar portala
// girmede sorun yaşamış" — art arda birden fazla deploy yaptığımız gün
// tam da bu oldu), henüz gidilmemiş bir sayfaya tıklandığında taray��cı
// artık var olmayan eski bir dosyayı ister, Vite bunu "vite:preloadError"
// olarak bildirir. Tek çözüm sayfayı yeniden yüklemek (yeni index.html
// güncel dosya adlarını getirir) — sessionStorage bayrağı, hata gerçekten
// dosya bulunamamaktan değil de kalıcı bir ağ sorunundan kaynaklanıyorsa
// sonsuz yenileme döngüsüne girmeyi önlüyor (bir oturumda en fazla bir kez
// otomatik yenilenir).
window.addEventListener('vite:preloadError', () => {
  const key = 'remaxlavanda_chunk_reload_denendi'
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
