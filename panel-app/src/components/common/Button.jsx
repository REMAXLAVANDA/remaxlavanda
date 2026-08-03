const VARIANT_CLASSES = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-surface-sunken text-text-primary border border-border-default hover:bg-border-subtle',
  text: 'bg-transparent text-remax-blue hover:text-[#00297A] px-0',
  'danger-outline': 'bg-transparent border border-border-danger text-brand-700 hover:bg-tint-red',
}

const SIZE_CLASSES = {
  md: 'h-9 px-4 text-sm',
  lg: 'h-[46px] px-5 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[11px] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${variant === 'text' ? '' : SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
