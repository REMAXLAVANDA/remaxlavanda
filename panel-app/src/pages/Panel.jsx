import { LayoutDashboard } from 'lucide-react'
import ModulePlaceholder from '../components/common/ModulePlaceholder'

export default function Panel() {
  return (
    <ModulePlaceholder
      icon={LayoutDashboard}
      title="Panel"
      description="Kullanıcıya bugün yapması gerekenleri gösteren aksiyon ekranı — diğer modüller tamamlandıkça burada beslenecek."
      note="İçerik, modüller ilerledikçe eklenecek"
    />
  )
}
