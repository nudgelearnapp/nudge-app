import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nudge — AI Tutor for Class 10',
  description: 'Your personal AI tutor for SEBA Class 10. Ask questions in Assamese, Hindi or English.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
