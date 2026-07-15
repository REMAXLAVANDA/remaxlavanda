import { Award, GraduationCap, Star, Target, Zap } from 'lucide-react'
import { relativeTime } from '../../lib/format'

const ICONS = {
  target: Target,
  'graduation-cap': GraduationCap,
  zap: Zap,
  star: Star,
}

export default function BadgeGrid({ badges }) {
  if (badges.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-200 bg-white py-8 text-center text-sm text-ink-400">
        Henüz rozet kazanılmadı.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {badges.map((b) => {
        const Icon = ICONS[b.icon] ?? Award
        return (
          <div key={b.id} className="rounded-xl border border-ink-100 bg-white p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-lavanda-50 text-lavanda-600">
              <Icon size={18} />
            </div>
            <p className="text-xs font-semibold text-ink-900">{b.ad}</p>
            {b.earnedAt && <p className="mt-0.5 text-[11px] text-ink-400">{relativeTime(b.earnedAt)}</p>}
          </div>
        )
      })}
    </div>
  )
}
