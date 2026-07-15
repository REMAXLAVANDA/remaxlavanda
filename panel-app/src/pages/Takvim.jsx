import { CalendarDays } from 'lucide-react'
import ModulePlaceholder from '../components/common/ModulePlaceholder'

export default function Takvim() {
  return (
    <ModulePlaceholder
      icon={CalendarDays}
      title="Takvim"
      description="Toplantı, Eğitim, Etkinlik ve Broker Görüşmesi tek merkezde. Katılım durumu performansa işler."
      note="PART 4'te geliyor"
    />
  )
}
