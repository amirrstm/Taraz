'use client'

import { Bar, BarChart, Cell } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  total: { label: 'Spent', color: 'var(--chart-1)' },
} satisfies ChartConfig

/**
 * Decorative daily spending strip. It carries no information the total above it
 * doesn't already state, so it stays `aria-hidden` and has no tooltip — one
 * would be unusable on a 64px strip on a phone anyway.
 */
export function DailyBars({
  daily,
  daysInMonth,
}: {
  daily: { day: number; total: number }[]
  /** Number of days in the displayed month (28-31), so the strip is exactly date-aligned. */
  daysInMonth: number
}) {
  if (daily.length === 0) return null
  const byDay = new Map(daily.map((d) => [d.day, d.total]))
  const data = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    total: byDay.get(i + 1) ?? 0,
  }))

  return (
    // `aspect-auto` because ChartContainer defaults to aspect-video, which
    // would override the fixed strip height.
    <ChartContainer config={chartConfig} className="aspect-auto h-16 w-full" aria-hidden>
      <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap={1}>
        {/* `minPointSize` reproduces the minimum stub that marks a day with no
            spending, rather than leaving a gap in the strip. */}
        <Bar dataKey="total" radius={2} minPointSize={2}>
          {data.map((d) => (
            <Cell key={d.day} fill={d.total > 0 ? 'var(--chart-1)' : 'var(--muted)'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
