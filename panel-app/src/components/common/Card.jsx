export default function Card({ title, icon: Icon, iconClassName = 'text-brand-600', action, children, className = '', bodyClassName = '' }) {
  return (
    <div className={`rounded-2xl border border-border-default bg-surface-raised ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            {Icon ? <Icon size={18} className={iconClassName} /> : null}
            {title ? <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3> : null}
          </div>
          {action ?? null}
        </div>
      )}
      <div className={`px-4 pb-4 ${title || action ? '' : 'pt-4'} ${bodyClassName}`}>{children}</div>
    </div>
  )
}
