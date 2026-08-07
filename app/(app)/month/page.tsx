import Link from 'next/link'
import { DailyBars } from '@/components/DailyBars'
import { monthSummary } from '@/lib/db/queries'
import { formatToman } from '@/lib/money'
import { monthRange } from '@/lib/month'

export const dynamic = 'force-dynamic'

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const params = await searchParams
  const today = new Date()
  const year = Number(params.y) || today.getUTCFullYear()
  const month = Number(params.m) || today.getUTCMonth() + 1

  const { startMs, endMs } = monthRange(year, month)
  const summary = await monthSummary(startMs, endMs)

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }
  // Label from the naive calendar month, not startMs: startMs is shifted by
  // the Tehran offset (see lib/month.ts) so it no longer falls on the 1st
  // in UTC.
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <main className="px-4 pt-6">
      <header className="mb-4 flex items-center justify-between px-1">
        <Link href={`/month?y=${prev.y}&m=${prev.m}`} className="px-3 py-2 text-neutral-400">
          ‹
        </Link>
        <h1 className="text-lg font-semibold">{label}</h1>
        <Link href={`/month?y=${next.y}&m=${next.m}`} className="px-3 py-2 text-neutral-400">
          ›
        </Link>
      </header>

      <p className="px-1 text-3xl font-semibold">{formatToman(summary.total)} T</p>
      <p className="mb-4 px-1 text-sm text-neutral-500">spent this month</p>

      <DailyBars daily={summary.daily} daysInMonth={new Date(Date.UTC(year, month, 0)).getUTCDate()} />

      <ul className="mt-6 flex flex-col gap-2">
        {summary.byCategory.map((c) => {
          const row = (
            <>
              <span className="flex items-center gap-3">
                <span className="text-xl">{c.icon}</span>
                <span>{c.name}</span>
              </span>
              <span className="font-medium">{formatToman(c.total)} T</span>
            </>
          )
          return (
            <li key={c.categoryId ?? 'none'}>
              {c.categoryId == null ? (
                <div className="flex items-center justify-between rounded-xl bg-neutral-900 px-4 py-4">
                  {row}
                </div>
              ) : (
                <Link
                  href={`/month/category/${c.categoryId}?y=${year}&m=${month}`}
                  className="flex items-center justify-between rounded-xl bg-neutral-900 px-4 py-4 active:bg-neutral-800"
                >
                  {row}
                </Link>
              )}
            </li>
          )
        })}
        {summary.byCategory.length === 0 && (
          <li className="py-16 text-center text-neutral-500">No spending recorded.</li>
        )}
      </ul>
    </main>
  )
}
