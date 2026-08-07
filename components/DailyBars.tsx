export function DailyBars({
  daily,
  daysInMonth,
}: {
  daily: { day: number; total: number }[]
  /** Number of days in the displayed month (28-31), so the strip is exactly date-aligned. */
  daysInMonth: number
}) {
  if (daily.length === 0) return null
  const max = Math.max(...daily.map((d) => d.total))
  const byDay = new Map(daily.map((d) => [d.day, d.total]))
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

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
