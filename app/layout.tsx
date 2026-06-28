import type { Metadata } from 'next'
import { Familjen_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const familjen = Familjen_Grotesk({
  variable: '--font-familjen',
  subsets: ['latin'],
})

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'NERVE — one social mission at a time. The attempt is the win.',
  description:
    'A calm handler for social-courage practice. Get one real-world mission sized to your fear, predict your distress, go do it, then turn the scary story into evidence.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${familjen.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
