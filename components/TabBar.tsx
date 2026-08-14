'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/month', label: 'Month' },
  { href: '/add', label: 'Add' },
]

export function TabBar({ inboxCount }: { inboxCount: number }) {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          // Deliberately a bare Link rather than `Button asChild`: the tabs are
          // `flex-1` full-height tap targets, which fights the button
          // primitive's fixed height and padding. The focus ring is the one
          // thing worth borrowing, so it is spelled out here.
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex-1 py-4 text-center text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {tab.label}
            {tab.href === '/inbox' && inboxCount > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[11px]">
                {inboxCount}
                <span className="sr-only"> uncategorized</span>
              </Badge>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
