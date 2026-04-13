const DIFFICULTY = [
  { label: '브론즈', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { label: '실버',   color: 'text-slate-600 bg-slate-50 border-slate-200' },
  { label: '골드',   color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { label: '플래티넘', color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { label: '다이아', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
]

export function DifficultyBadge({ level }: { level: number | null | undefined }) {
  if (!level || level < 1 || level > 5) return null
  const { label, color } = DIFFICULTY[level - 1]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {'★'.repeat(level)}{'☆'.repeat(5 - level)} {label}
    </span>
  )
}

export function DifficultyPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
          value === null ? 'bg-gray-200 border-gray-300 font-semibold' : 'border-gray-200 hover:bg-gray-50 text-gray-500'
        }`}
      >
        없음
      </button>
      {DIFFICULTY.map((d, i) => {
        const level = i + 1
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors font-medium ${
              value === level ? `${d.color} font-bold` : 'border-gray-200 hover:bg-gray-50 text-gray-500'
            }`}
          >
            {'★'.repeat(level)} {d.label}
          </button>
        )
      })}
    </div>
  )
}
