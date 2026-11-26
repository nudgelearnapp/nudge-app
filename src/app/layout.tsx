import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nudge — Class 10 Study Buddy',
  description: 'Your Class 10 ASSEB (SEBA) study buddy. Ask doubts in Assamese or English, practise textbook questions and past papers.',
  applicationName: 'Nudge',
  appleWebApp: { capable: true, title: 'Nudge', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#15803d',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="as">
      <body>{children}</body>
    </html>
  )
}
