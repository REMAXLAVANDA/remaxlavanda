import Avatar from './Avatar'

export default function ListRow({ name, subtitle, trailing, action, urgent = false }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[11px] bg-surface-sunken px-3 py-2.5 ${
        urgent ? 'shadow-[inset_3px_0_0_#DC1C2E]' : ''
      }`}
    >
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{name}</p>
        {subtitle ? <p className="truncate text-xs text-text-muted">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="shrink-0 text-xs text-text-disabled">{trailing}</div> : null}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
