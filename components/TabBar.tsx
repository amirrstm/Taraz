'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/month', label: 'Month' },
  { href: '/add', label: 'Add' },
]

export function TabBar({ inboxCount }: { inboxCount: number }) {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-800 bg-neutral-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 py-4 text-center text-sm font-medium ${
              active ? 'text-neutral-100' : 'text-neutral-500'
            }`}
          >
            {tab.label}
            {tab.href === '/inbox' && inboxCount > 0 && (
              <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] text-white">
                {inboxCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
