import { ChevronLeft, ChevronRight } from 'lucide-react'
import dynamicImport from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { monthSummary } from '@/lib/db/queries'
import { formatToman } from '@/lib/money'
import { currentYearMonth, monthRange } from '@/lib/month'

export const dynamic = 'force-dynamic'

// The bar strip pulls in recharts, which is by far the heaviest thing on this
// route. Loading it lazily keeps it out of the initial payload — this app is
// used on Iranian mobile data, and the strip is decorative.
const DailyBars = dynamicImport(() =>
  import('@/components/DailyBars').then((m) => m.DailyBars),
)

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const params = await searchParams
  const defaultYm = currentYearMonth(Date.now())
  const year = Number(params.y) || defaultYm.year
  const month = Number(params.m) || defaultYm.month

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
        {/* `size-11` rather than the primitive's icon size, which is under the
            44px iOS minimum tap target. */}
        <Button asChild variant="ghost" size="icon" className="size-11">
          <Link href={`/month?y=${prev.y}&m=${prev.m}`}>
            <ChevronLeft className="size-5" />
            <span className="sr-only">Previous month</span>
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">{label}</h1>
        <Button asChild variant="ghost" size="icon" className="size-11">
          <Link href={`/month?y=${next.y}&m=${next.m}`}>
            <ChevronRight className="size-5" />
            <span className="sr-only">Next month</span>
          </Link>
        </Button>
      </header>

      <p className="px-1 text-3xl font-semibold">{formatToman(summary.total)} T</p>
      <p className="mb-4 px-1 text-sm text-muted-foreground">spent this month</p>

      {/* Fixed height reserved so the lazily-loaded chart doesn't shift the
          category list when it mounts. */}
      <div className="h-16">
        <DailyBars
          daily={summary.daily}
          daysInMonth={new Date(Date.UTC(year, month, 0)).getUTCDate()}
        />
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {summary.byCategory.map((c) => {
          const row = (
            <>
              <span className="flex items-center gap-3">
                <span className="text-xl" aria-hidden>
                  {c.icon}
                </span>
                <span>{c.name}</span>
              </span>
              <span className="font-medium">{formatToman(c.total)} T</span>
            </>
          )
          return (
            <li key={c.categoryId ?? 'none'}>
              {c.categoryId == null ? (
                <Card className="flex-row items-center justify-between gap-0 rounded-xl px-4 py-4">
                  {row}
                </Card>
              ) : (
                // A Link rather than a Card, because Card has no `asChild` and
                // the whole row must stay one tap target.
                <Link
                  href={`/month/category/${c.categoryId}?y=${year}&m=${month}`}
                  className="flex items-center justify-between rounded-xl border bg-card px-4 py-4 outline-none transition-colors active:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {row}
                </Link>
              )}
            </li>
          )
        })}
        {summary.byCategory.length === 0 && (
          <li className="py-16 text-center text-muted-foreground">No spending recorded.</li>
        )}
      </ul>
    </main>
  )
}
