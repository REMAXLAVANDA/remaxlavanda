export default function ModulePlaceholder({ icon: Icon, title, description, note }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-lavanda-50 text-lavanda-600">
          <Icon size={22} strokeWidth={2} />
        </div>
      )}
      <h2 className="text-base font-semibold text-ink-900">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {note && (
        <p className="mt-4 rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-400">
          {note}
        </p>
      )}
    </div>
  )
}
