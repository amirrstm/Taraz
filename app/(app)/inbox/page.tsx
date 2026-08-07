import { listCategories, listInbox } from '@/lib/db/queries'
import { InboxList } from '@/app/(app)/inbox/InboxList'

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const [items, categories] = await Promise.all([listInbox(), listCategories()])
  return (
    <main className="px-4 pt-6">
      <h1 className="mb-4 px-1 text-2xl font-semibold">Inbox</h1>
      <InboxList items={items} categories={categories} />
    </main>
  )
}
