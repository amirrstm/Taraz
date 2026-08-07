export function DailyBars({ daily }: { daily: { day: number; total: number }[] }) {
  if (daily.length === 0) return null
  const max = Math.max(...daily.map((d) => d.total))
  const byDay = new Map(daily.map((d) => [d.day, d.total]))
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <div className="flex h-16 items-end gap-[2px]" aria-hidden>
      {days.map((day) => {
        const total = byDay.get(day) ?? 0
        const height = max === 0 ? 0 : Math.round((total / max) * 100)
        return (
          <span
            key={day}
            style={{ height: `${Math.max(height, 2)}%` }}
            className={`flex-1 rounded-sm ${total > 0 ? 'bg-neutral-400' : 'bg-neutral-800'}`}
          />
        )
      })}
    </div>
  )
}
