import { TabBar } from '@/components/TabBar'
import { listInbox } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const count = (await listInbox()).length
  return (
    // `viewport-fit=cover` plus a translucent status bar draws the page from
    // the physical top of the screen, so the first heading lands under the
    // clock. The insets below reserve that space, and the matching bottom pad
    // keeps the last row clear of the fixed tab bar and the home indicator.
    <div className="pt-[env(safe-area-inset-top)] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {children}
      <TabBar inboxCount={count} />
    </div>
  )
}
