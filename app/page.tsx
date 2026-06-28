'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { anonOwner } from '@/lib/anon'
import { Header, Footer, CrisisSheet } from './_components/Chrome'
import { SudsSlider } from './_components/SudsSlider'
import { BreathingRing } from './_components/BreathingRing'

const CONTEXTS = [
  'Campus',
  'Café',
  'Gym',
  'Phone calls',
  'Asking for help',
  'Work',
  'Stores & errands',
  'Groups & class',
]

export default function Home() {
  const router = useRouter()
  const [owner] = useState(() => (typeof window !== 'undefined' ? anonOwner() : ''))
  const [phase, setPhase] = useState<'loading' | 'welcome' | 'returning'>('loading')
  const [step, setStep] = useState<0 | 1>(0)
  const [baseline, setBaseline] = useState(55)
  const [contexts, setContexts] = useState<string[]>([])
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!owner) return
    fetch(`/api/user?owner=${owner}`)
      .then((r) => r.json())
      .then((d) => setPhase(d.user?.hasIntake ? 'returning' : 'welcome'))
      .catch(() => setPhase('welcome'))
  }, [owner])

  function toggleContext(c: string) {
    setContexts((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))
  }

  async function begin() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          anonOwner: owner,
          intake: { baseline, contexts, goal },
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not start')
      router.push('/mission')
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  if (phase === 'loading') {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center">
          <BreathingRing>
            <span className="tnum text-xs tracking-widest text-text-faint">NERVE</span>
          </BreathingRing>
        </div>
      </Shell>
    )
  }

  if (phase === 'returning') {
    return (
      <Shell>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-12 md:px-8">
          <p className="rise flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-amber">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber/50 dot" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
            </span>
            handler online
          </p>
          <h1
            className="rise mt-5 text-5xl leading-[1.02] md:text-6xl"
            style={{ animationDelay: '80ms' }}
          >
            Welcome back.
            <br />
            <span className="handler text-text-soft">Ready for the next one?</span>
          </h1>
          <p className="rise mt-6 max-w-md text-lg leading-relaxed text-text-soft" style={{ animationDelay: '160ms' }}>
            One mission at a time, sized to where you are right now. Remember — the attempt is
            the win, not the outcome.
          </p>
          <div className="rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: '240ms' }}>
            <Link
              href="/mission"
              className="press rounded-xl bg-amber px-6 py-3 font-semibold text-ground shadow-[0_10px_40px_-12px_var(--amber)] hover:bg-amber-deep"
            >
              Get my mission →
            </Link>
            <Link
              href="/ledger"
              className="press rounded-xl border border-edge glass px-6 py-3 font-medium text-text hover:border-teal/50 hover:text-teal"
            >
              Courage ledger
            </Link>
          </div>
        </main>
      </Shell>
    )
  }

  // welcome / intake
  return (
    <Shell>
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-5 py-10 md:grid-cols-[1fr_1fr] md:px-8 md:py-16">
        <section>
          <p className="rise flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-amber">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber/50 dot" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
            </span>
            a calm handler
          </p>
          <h1
            className="rise mt-5 text-balance text-6xl leading-[0.98] md:text-7xl"
            style={{ animationDelay: '80ms' }}
          >
            Fear shrinks
            <br />
            <span className="handler text-amber">one mission</span>
            <br />
            at a time.
          </h1>
          <p
            className="rise mt-7 max-w-md text-lg leading-relaxed text-text-soft"
            style={{ animationDelay: '160ms' }}
          >
            I&apos;ll hand you one real-world social mission, sized to your nerve today. You
            predict how hard it&apos;ll feel, go do it, and we turn the scary story into
            evidence. <span className="text-text">Bailing at the last second still counts.</span>
          </p>
          <div className="rise mt-9 hidden md:block" style={{ animationDelay: '240ms' }}>
            <BreathingRing size={150}>
              <span className="tnum text-[10px] uppercase tracking-[0.2em] text-text-faint">
                breathe · 4–7–8
              </span>
            </BreathingRing>
          </div>
        </section>

        <section
          className="rise glass rounded-2xl border border-edge p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] md:p-8"
          style={{ animationDelay: '300ms' }}
        >
          {step === 0 ? (
            <>
              <h2 className="font-display text-2xl">First, a quick read on you</h2>
              <p className="mt-2 text-sm text-text-soft">
                No account, nothing saved off this device. This just sets your starting point.
              </p>
              <div className="mt-7">
                <SudsSlider
                  id="baseline"
                  label="In everyday social situations, how anxious do you usually feel?"
                  value={baseline}
                  onChange={setBaseline}
                  tone="amber"
                />
              </div>
              <button
                onClick={() => setStep(1)}
                className="press mt-8 w-full rounded-xl bg-amber px-6 py-3 font-semibold text-ground shadow-[0_10px_40px_-12px_var(--amber)] hover:bg-amber-deep"
              >
                Next →
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl">Where does it matter most?</h2>
              <p className="mt-2 text-sm text-text-soft">
                Pick any that fit. I&apos;ll lean missions toward these.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {CONTEXTS.map((c) => {
                  const on = contexts.includes(c)
                  return (
                    <button
                      key={c}
                      onClick={() => toggleContext(c)}
                      aria-pressed={on}
                      className={`press rounded-full border px-4 py-2 text-sm ${
                        on
                          ? 'border-amber bg-amber/15 text-amber shadow-[0_0_20px_-6px_var(--amber)]'
                          : 'border-edge text-text-soft hover:border-text-faint hover:text-text'
                      }`}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>

              <label htmlFor="goal" className="mt-7 block text-sm text-text-soft">
                Anything you&apos;re working toward?{' '}
                <span className="text-text-faint">(optional)</span>
              </label>
              <input
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                maxLength={140}
                placeholder="e.g. order coffee without rehearsing it ten times"
                className="mt-2 w-full rounded-lg border border-edge bg-panel-2 px-4 py-3 text-sm outline-none placeholder:text-text-faint focus:border-amber/60"
              />

              {error && (
                <p className="mt-4 rounded-lg border border-crisis/40 bg-crisis/10 px-3 py-2 text-sm text-crisis">
                  {error}
                </p>
              )}

              <div className="mt-7 flex items-center gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="press rounded-xl border border-edge px-5 py-3 text-sm text-text-soft hover:text-text"
                >
                  Back
                </button>
                <button
                  onClick={begin}
                  disabled={busy}
                  className="press flex-1 rounded-xl bg-amber px-6 py-3 font-semibold text-ground shadow-[0_10px_40px_-12px_var(--amber)] hover:bg-amber-deep disabled:opacity-50"
                >
                  {busy ? 'Tuning your first mission…' : 'Begin →'}
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <CrisisSheet />
    </>
  )
}
