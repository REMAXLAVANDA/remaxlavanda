export default function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-[11px] bg-border-default p-[3px] ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-surface-raised text-text-primary shadow-[0_1px_2px_rgba(12,39,73,0.12)]'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
