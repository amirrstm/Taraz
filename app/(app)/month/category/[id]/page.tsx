import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CategoryTransactionList } from './CategoryTransactionList'
import { getCategoryById, listByCategory } from '@/lib/db/queries'
import { formatToman } from '@/lib/money'
import { monthRange } from '@/lib/month'

export const dynamic = 'force-dynamic'

export default async function CategoryMonthPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const { id } = await params
  const categoryId = Number(id)
  if (!Number.isInteger(categoryId)) notFound()

  const category = await getCategoryById(categoryId)
  if (!category) notFound()

  const query = await searchParams
  const today = new Date()
  const year = Number(query.y) || today.getUTCFullYear()
  const month = Number(query.m) || today.getUTCMonth() + 1

  // Same Iran-local window monthSummary used to compute the total the user
  // tapped from — must not be recomputed differently here, or the two
  // totals will disagree.
  const { startMs, endMs } = monthRange(year, month)
  const items = await listByCategory(startMs, endMs, categoryId)
  const total = items
    .filter((t) => t.direction === 'debit')
    .reduce((sum, t) => sum + t.amount, 0)
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <main className="px-4 pt-6">
      <header className="mb-4 flex items-center gap-3 px-1">
        <Link href={`/month?y=${year}&m=${month}`} className="px-1 py-2 text-neutral-400">
          ‹ Back
        </Link>
      </header>

      <p className="px-1 text-sm text-neutral-500">
        {category.icon} {category.name} — {label}
      </p>
      <p className="mb-4 px-1 text-3xl font-semibold">{formatToman(total)} T</p>

      <CategoryTransactionList
        items={items.map((t) => ({
          id: t.id,
          amount: t.amount,
          direction: t.direction,
          status: t.status,
          description: t.description,
          occurredAt: t.occurredAt,
        }))}
      />
    </main>
  )
}
