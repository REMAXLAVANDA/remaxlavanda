import { useEffect } from 'react'

// Paylaşılan klavye kısayolu — ESC ile kapatma. Modal.jsx ve kendi özel
// kabuğunu kullanan tekil bileşenler (ör. PreviewModal) burayı kullanır,
// böylece aynı 6 satır her dosyada tekrar edilmez.
export function useEscapeKey(onEscape) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onEscape()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onEscape])
}
