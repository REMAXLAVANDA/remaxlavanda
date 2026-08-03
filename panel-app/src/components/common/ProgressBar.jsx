const COLOR_CLASSES = {
  blue: 'bg-remax-blue',
  red: 'bg-brand-600',
  warn: 'bg-chart-warn',
}

export default function ProgressBar({ value, color = 'blue', height = 6 }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="w-full rounded-full bg-chart-track" style={{ height }}>
      <div
        className={`rounded-full ${COLOR_CLASSES[color]}`}
        style={{ width: `${pct}%`, height }}
      />
    </div>
  )
}
