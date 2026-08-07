import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Taraz' }
export const viewport: Viewport = {
  themeColor: '#0b0b0d',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 antialiased">{children}</body>
    </html>
  )
}
