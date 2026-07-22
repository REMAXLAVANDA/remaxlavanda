// Panel'deki "Dikkat Gerekiyor" uyarılarından ?odak=1 ile gelindiğinde,
// hedef sayfanın üstünde "sadece bunlar gösteriliyor" bandı — normal
// filtreler/gruplama devre dışı kalınca kullanıcının bunu fark etmesi için.
export default function FocusBanner({ text, onClear }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2.5">
      <p className="text-sm font-medium text-brand-800">{text}</p>
      <button onClick={onClear} className="shrink-0 text-xs font-medium text-brand-700 hover:underline">
        Tüm kayıtları göster
      </button>
    </div>
  )
}
