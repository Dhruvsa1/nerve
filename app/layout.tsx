import type { Metadata } from 'next'
import { Fraunces, Schibsted_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { BgVideo } from './_components/BgVideo'

const display = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
})

const body = Schibsted_Grotesk({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
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
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BgVideo />
        {children}
      </body>
    </html>
  )
}
