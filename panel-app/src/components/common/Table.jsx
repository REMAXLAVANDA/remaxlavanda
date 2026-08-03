export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-border-default bg-surface-raised ${className}`}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  )
}

export function Thead({ children }) {
  return <thead className="bg-surface-sunken">{children}</thead>
}

export function Th({ children, align = 'left', className = '' }) {
  return (
    <th
      className={`px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
    >
      {children}
    </th>
  )
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-border-subtle">{children}</tbody>
}

export function Tr({ children, urgent = false, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-surface-sunken ${onClick ? 'cursor-pointer' : ''} ${
        urgent ? 'shadow-[inset_3px_0_0_#DC1C2E]' : ''
      } ${className}`}
    >
      {children}
    </tr>
  )
}

export function Td({ children, align = 'left', className = '' }) {
  return (
    <td
      className={`px-3.5 py-3.5 text-text-secondary ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
    >
      {children}
    </td>
  )
}
