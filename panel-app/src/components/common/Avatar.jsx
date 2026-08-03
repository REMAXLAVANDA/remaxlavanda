function initialsOf(name) {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Avatar({ name, size = 34 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-remax-navy font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initialsOf(name)}
    </div>
  )
}
