import { TabBar } from '@/components/TabBar'
import { listInbox } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const count = (await listInbox()).length
  return (
    <div className="pb-24">
      {children}
      <TabBar inboxCount={count} />
    </div>
  )
}
