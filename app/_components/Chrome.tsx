'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface CrisisResource {
  id: string
  label: string
  contact: string | null
  url: string | null
  region: string | null
}

/** The NERVE wordmark + a steady amber signal dot. */
export function Wordmark({ size = 'base' }: { size?: 'base' | 'sm' }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="NERVE home">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-amber/40 dot" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber" />
      </span>
      <span
        className={`font-display tracking-[0.22em] ${size === 'sm' ? 'text-base' : 'text-lg'}`}
      >
        NERVE
      </span>
    </Link>
  )
}

export function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="rise flex items-center justify-between px-5 py-4 md:px-8">
      <Wordmark />
      <div className="flex items-center gap-4">
        {right}
        <CrisisLink />
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-edge-soft px-5 py-5 md:px-8">
      <p className="text-xs leading-relaxed text-text-faint">
        NERVE is a self-help practice tool — not therapy or medical advice. If you are in
        distress, support is one tap away via{' '}
        <button
          onClick={() => window.dispatchEvent(new Event('nerve:open-crisis'))}
          className="text-text-soft underline decoration-crisis/50 underline-offset-2 hover:text-crisis"
        >
          crisis resources
        </button>
        .
      </p>
    </footer>
  )
}

/** A quiet, always-reachable crisis affordance. Opens the resource sheet. */
export function CrisisLink() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('nerve:open-crisis'))}
      className="rounded-full border border-crisis/30 px-3 py-1 text-xs font-medium text-crisis/90 transition hover:border-crisis/60 hover:bg-crisis/10"
    >
      Need support now
    </button>
  )
}

/** Mounted once (in each page) — listens for the global open event + Esc. */
export function CrisisSheet() {
  const [open, setOpen] = useState(false)
  const [resources, setResources] = useState<CrisisResource[] | null>(null)

  useEffect(() => {
    const openIt = () => setOpen(true)
    window.addEventListener('nerve:open-crisis', openIt)
    return () => window.removeEventListener('nerve:open-crisis', openIt)
  }, [])

  useEffect(() => {
    if (!open || resources) return
    fetch('/api/crisis')
      .then((r) => r.json())
      .then((d) => setResources(d.resources ?? []))
      .catch(() => setResources([]))
  }, [open, resources])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ground/80 p-4 md:items-center"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Crisis resources"
    >
      <div
        className="rise w-full max-w-md rounded-2xl border border-crisis/25 bg-panel p-6 shadow-[0_-8px_60px_rgba(240,112,95,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="font-display text-xl">You don&apos;t have to white-knuckle this alone</h2>
          <button
            onClick={() => setOpen(false)}
            className="-mr-1 -mt-1 rounded-md px-2 py-1 text-text-faint hover:text-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-text-soft">
          If you&apos;re thinking about harming yourself or in crisis, reach a trained human now.
          These are free and confidential.
        </p>
        <div className="mt-5 space-y-2.5">
          {resources === null ? (
            <div className="skeleton h-16 rounded-lg" />
          ) : (
            resources.map((r) => (
              <a
                key={r.id}
                href={r.url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-edge bg-panel-2 p-4 transition hover:border-crisis/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text">{r.label}</span>
                  {r.region && (
                    <span className="text-[10px] uppercase tracking-wider text-text-faint">
                      {r.region}
                    </span>
                  )}
                </div>
                {r.contact && <p className="mt-1 text-sm text-crisis/90">{r.contact}</p>}
              </a>
            ))
          )}
        </div>
        <p className="mt-5 text-xs text-text-faint">
          If someone is in immediate danger, call your local emergency number.
        </p>
      </div>
    </div>
  )
}
