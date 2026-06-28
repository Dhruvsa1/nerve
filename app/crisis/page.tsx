'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header, Footer, CrisisSheet } from '../_components/Chrome'

interface CrisisResource {
  id: string
  label: string
  contact: string | null
  url: string | null
  region: string | null
}

export default function CrisisPage() {
  const [resources, setResources] = useState<CrisisResource[] | null>(null)

  useEffect(() => {
    fetch('/api/crisis')
      .then((r) => r.json())
      .then((d) => setResources(d.resources ?? []))
      .catch(() => setResources([]))
  }, [])

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10 md:px-8 md:py-16">
        <p className="rise text-xs uppercase tracking-[0.32em] text-crisis">support</p>
        <h1 className="rise mt-3 font-display text-4xl md:text-5xl" style={{ animationDelay: '80ms' }}>
          You don&apos;t have to white-knuckle this alone
        </h1>
        <p className="rise mt-4 text-lg leading-relaxed text-text-soft" style={{ animationDelay: '140ms' }}>
          NERVE is a self-help practice tool — not therapy or medical advice. If you&apos;re
          thinking about harming yourself or you&apos;re in crisis, reach a trained human now.
          These lines are free and confidential.
        </p>

        <div className="rise mt-8 space-y-3" style={{ animationDelay: '200ms' }}>
          {resources === null ? (
            <>
              <div className="skeleton h-20 rounded-xl" />
              <div className="skeleton h-20 rounded-xl" />
            </>
          ) : (
            resources.map((r) => (
              <a
                key={r.id}
                href={r.url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="lift block rounded-xl border border-edge glass p-5 hover:border-crisis/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.label}</span>
                  {r.region && (
                    <span className="text-[10px] uppercase tracking-wider text-text-faint">
                      {r.region}
                    </span>
                  )}
                </div>
                {r.contact && <p className="mt-1 text-crisis/90">{r.contact}</p>}
              </a>
            ))
          )}
        </div>

        <p className="mt-6 text-sm text-text-faint">
          If someone is in immediate danger, call your local emergency number.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm text-text-soft underline hover:text-text">
          ← Back
        </Link>
      </main>
      <Footer />
      <CrisisSheet />
    </>
  )
}
