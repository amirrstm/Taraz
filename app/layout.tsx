import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Taraz',
  applicationName: 'Taraz',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Taraz' },
  icons: { apple: '/icons/apple-touch-icon.png' },
}
export const viewport: Viewport = {
  // Matches --background (neutral-950), so the iOS status bar does not seam
  // against the top of the page.
  themeColor: '#0a0a0a',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
