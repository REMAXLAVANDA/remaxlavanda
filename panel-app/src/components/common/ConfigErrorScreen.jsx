import { ServerCrash } from 'lucide-react'

// Production build'de Supabase env değişkenleri eksikse uygulama SESSİZCE
// yarım çalışmaz — kullanıcıya (ve deploy eden kişiye) net bir mesaj
// gösterir. Teknik detay içermez, sadece ne yapılması gerektiğini söyler.
export default function ConfigErrorScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
      <div className="max-w-md rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <ServerCrash size={24} />
        </div>
        <h1 className="mb-2 text-base font-semibold text-ink-900">Sistem yapılandırması eksik</h1>
        <p className="text-sm text-ink-500">
          Portal şu anda başlatılamıyor çünkü sunucu bağlantı bilgileri eksik. Lütfen sistem yöneticinizle iletişime
          geçin.
        </p>
      </div>
    </div>
  )
}
