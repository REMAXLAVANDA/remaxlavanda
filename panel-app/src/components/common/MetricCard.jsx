export default function MetricCard({ label, value, sublabel, danger = false }) {
  return (
    <div
      className={
        danger
          ? 'rounded-2xl border border-border-danger bg-surface-raised p-4 shadow-[inset_3px_0_0_#DC1C2E]'
          : 'rounded-2xl border border-border-default bg-surface-raised p-4'
      }
    >
      <p className={`text-xs font-medium ${danger ? 'text-brand-700' : 'text-text-muted'}`}>{label}</p>
      <p className={`mt-1 text-[28px] font-semibold tracking-[-0.02em] ${danger ? 'text-brand-700' : 'text-text-primary'}`}>
        {value}
      </p>
      {sublabel ? (
        <p className={`mt-1 text-xs ${danger ? 'text-brand-600' : 'text-text-disabled'}`}>{sublabel}</p>
      ) : null}
    </div>
  )
}
