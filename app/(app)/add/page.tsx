import { listCategories } from '@/lib/db/queries'
import { AddForm } from '@/app/(app)/add/AddForm'
import { PasteSms } from '@/app/(app)/add/PasteSms'

export const dynamic = 'force-dynamic'

export default async function AddPage() {
  return (
    <main className="px-4 pt-6">
      <h1 className="mb-4 px-1 text-2xl font-semibold">Add</h1>
      <AddForm categories={await listCategories()} />
      <h2 className="mb-3 mt-10 px-1 text-lg font-semibold">Paste SMS</h2>
      <p className="mb-3 px-1 text-sm text-neutral-500">
        Missed a message? Copy it from Messages and paste it here.
      </p>
      <PasteSms />
    </main>
  )
}
