import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TrapFeed | Hip-Hop. Culture. Unfiltered.',
  description: 'The pulse of hip-hop, music, interviews and viral culture.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
