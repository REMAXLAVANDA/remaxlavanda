const VARIANT_CLASSES = {
  neutral: 'bg-surface-sunken text-text-secondary',
  red: 'bg-tint-red text-brand-700',
  blue: 'bg-tint-blue text-remax-blue',
  amber: 'bg-tint-amber text-tint-amber-text',
}

export default function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
