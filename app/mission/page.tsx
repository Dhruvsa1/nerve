'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { anonOwner } from '@/lib/anon'
import { Header, Footer, CrisisSheet } from '../_components/Chrome'
import { SudsSlider } from '../_components/SudsSlider'
import { BreathingRing } from '../_components/BreathingRing'
import type { Dims, MissionRow } from '@/lib/types'

type Phase = 'loading' | 'briefing' | 'debrief' | 'result' | 'error'

interface TitrationResult {
  level: number
  delta: number
  offerSmaller: boolean
  band: string
  rationale: string
}

const DIM_LABELS: Record<keyof Dims, string> = {
  intimacy: 'closeness',
  audience: 'audience',
  rejection_risk: 'rejection',
  performance: 'spotlight',
}

export default function MissionPage() {
  const router = useRouter()
  const [owner] = useState(() => (typeof window !== 'undefined' ? anonOwner() : ''))
  const [phase, setPhase] = useState<Phase>('loading')
  const [mission, setMission] = useState<MissionRow | null>(null)
  const [handlerLine, setHandlerLine] = useState('')
  const [predicted, setPredicted] = useState(55)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // debrief fields
  const [catastrophe, setCatastrophe] = useState('')
  const [outcome, setOutcome] = useState('')
  const [actual, setActual] = useState(50)
  const [verdict, setVerdict] = useState<'did_not_happen' | 'partly' | 'happened' | ''>('')
  const [attempted, setAttempted] = useState(true)

  // result
  const [reflection, setReflection] = useState('')
  const [titration, setTitration] = useState<TitrationResult | null>(null)
  const [crisis, setCrisis] = useState(false)

  const loadMission = useCallback(async (id: string) => {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetch(`/api/mission?owner=${id}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not load a mission')
      setMission(d.mission)
      setHandlerLine(d.handler_line || '')
      setPredicted(d.mission?.predicted_suds ?? 55)
      setPhase('briefing')
    } catch (e) {
      setError((e as Error).message)
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    if (!owner) return
    fetch(`/api/user?owner=${owner}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.user?.hasIntake) {
          router.replace('/')
          return
        }
        loadMission(owner)
      })
      .catch(() => loadMission(owner))
  }, [owner, router, loadMission])

  async function log(out: 'did_it' | 'retreated' | 'not_yet') {
    if (!mission) return
    setBusy(out)
    setError(null)
    try {
      const res = await fetch('/api/mission/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          anonOwner: owner,
          missionId: mission.id,
          outcome: out,
          predictedSuds: predicted,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not log that')
      if (out === 'not_yet') {
        setTitration(d.titration)
        setReflection('')
        setCrisis(false)
        setPhase('result')
      } else {
        setAttempted(out === 'did_it')
        setActual(out === 'did_it' ? Math.max(30, predicted - 10) : predicted)
        setPhase('debrief')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function shrink() {
    if (!mission) return
    setBusy('shrink')
    setError(null)
    try {
      const res = await fetch('/api/mission/shrink', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ anonOwner: owner }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not adjust the mission')
      setMission(d.mission)
      setHandlerLine(d.handler_line || '')
      setPredicted(55)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function submitDebrief() {
    if (!mission) return
    if (!catastrophe.trim() || !outcome.trim() || !verdict) {
      setError('Just a few words in each field — that’s the whole debrief.')
      return
    }
    setBusy('debrief')
    setError(null)
    try {
      const res = await fetch('/api/debrief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          anonOwner: owner,
          missionId: mission.id,
          actual_suds: actual,
          predicted_catastrophe: catastrophe,
          actual_outcome: outcome,
          fear_verdict: verdict,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not file the debrief')
      setReflection(d.reflection || '')
      setTitration(d.titration)
      setCrisis(!!d.crisis)
      if (d.crisis) window.dispatchEvent(new Event('nerve:open-crisis'))
      setPhase('result')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  function nextMission() {
    setCatastrophe('')
    setOutcome('')
    setVerdict('')
    setActual(50)
    setReflection('')
    setTitration(null)
    loadMission(owner)
  }

  return (
    <Shell levelRight={mission?.level_at_issue}>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8 md:px-8 md:py-12">
        {phase === 'loading' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <BreathingRing>
              <span className="flex gap-1.5">
                <span className="dot h-2 w-2 rounded-full bg-amber" />
                <span className="dot h-2 w-2 rounded-full bg-amber" />
                <span className="dot h-2 w-2 rounded-full bg-amber" />
              </span>
            </BreathingRing>
            <p className="text-sm text-text-soft">Sizing up your next mission…</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <h1 className="font-display text-2xl">That didn&apos;t go through</h1>
            <p className="mt-2 max-w-sm text-text-soft">{error}</p>
            <button
              onClick={() => loadMission(owner)}
              className="mt-6 rounded-xl bg-amber px-6 py-3 font-medium text-ground hover:bg-amber-deep"
            >
              Try again
            </button>
          </div>
        )}

        {phase === 'briefing' && mission && (
          <Briefing
            mission={mission}
            handlerLine={handlerLine}
            predicted={predicted}
            setPredicted={setPredicted}
            busy={busy}
            error={error}
            onLog={log}
            onShrink={shrink}
          />
        )}

        {phase === 'debrief' && mission && (
          <Debrief
            mission={mission}
            attempted={attempted}
            predicted={predicted}
            catastrophe={catastrophe}
            setCatastrophe={setCatastrophe}
            outcome={outcome}
            setOutcome={setOutcome}
            actual={actual}
            setActual={setActual}
            verdict={verdict}
            setVerdict={setVerdict}
            busy={busy}
            error={error}
            onSubmit={submitDebrief}
          />
        )}

        {phase === 'result' && (
          <Result
            reflection={reflection}
            titration={titration}
            crisis={crisis}
            predicted={predicted}
            actual={actual}
            wasDebrief={!!reflection || titration?.band !== 'unknown'}
            onNext={nextMission}
          />
        )}
      </main>
    </Shell>
  )
}

/* ── briefing card ─────────────────────────────────────────────────── */
function Briefing({
  mission,
  handlerLine,
  predicted,
  setPredicted,
  busy,
  error,
  onLog,
  onShrink,
}: {
  mission: MissionRow
  handlerLine: string
  predicted: number
  setPredicted: (n: number) => void
  busy: string | null
  error: string | null
  onLog: (o: 'did_it' | 'retreated' | 'not_yet') => void
  onShrink: () => void
}) {
  return (
    <div className="rise">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-amber">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-amber/50 dot" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
        </span>
        your mission
      </p>

      <div className="rise mt-4 glass rounded-2xl border border-edge p-6 shadow-[0_30px_80px_-44px_rgba(0,0,0,0.9)] md:p-8" style={{ animationDelay: '60ms' }}>
        <h1 className="text-balance font-display text-3xl leading-tight md:text-[2.6rem]">
          {mission.filled_action}
        </h1>
        {handlerLine && (
          <p className="handler mt-5 border-l-2 border-amber/50 pl-4 text-lg text-text-soft">{handlerLine}</p>
        )}
        <DimBars dims={mission.dims} level={mission.level_at_issue} />
      </div>

      <div className="rise mt-6 glass-2 rounded-2xl border border-edge p-6" style={{ animationDelay: '140ms' }}>
        <SudsSlider
          id="predicted"
          label="Before you go — how distressing do you predict this will feel?"
          value={predicted}
          onChange={setPredicted}
          tone="amber"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-crisis/40 bg-crisis/10 px-3 py-2 text-sm text-crisis">
          {error}
        </p>
      )}

      <p className="rise mt-7 text-center text-sm text-text-soft" style={{ animationDelay: '200ms' }}>
        Go do it in the real world. Come back and log it — honestly.
      </p>

      {/* The two wins, equal weight. */}
      <div className="rise mt-4 grid gap-3 sm:grid-cols-2" style={{ animationDelay: '260ms' }}>
        <button
          onClick={() => onLog('did_it')}
          disabled={!!busy}
          className="press rounded-xl bg-amber px-5 py-4 text-center font-semibold text-ground shadow-[0_12px_44px_-14px_var(--amber)] hover:bg-amber-deep disabled:opacity-50"
        >
          {busy === 'did_it' ? 'Logging…' : 'I did it'}
        </button>
        <button
          onClick={() => onLog('retreated')}
          disabled={!!busy}
          className="press rounded-xl border border-teal/60 bg-teal/10 px-5 py-4 text-center font-semibold text-teal shadow-[0_12px_44px_-16px_var(--teal)] hover:bg-teal/20 disabled:opacity-50"
        >
          {busy === 'retreated' ? 'Logging…' : 'Attempted & retreated'}
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-text-faint">
        Walking up and pulling back is real exposure. It counts as a win.
      </p>

      {/* Shrink — deliberately as prominent as a primary action. */}
      <div className="rise mt-6 grid gap-3 sm:grid-cols-2" style={{ animationDelay: '320ms' }}>
        <button
          onClick={onShrink}
          disabled={!!busy}
          className="press rounded-xl border border-amber/50 bg-amber/5 px-5 py-4 text-center font-semibold text-amber hover:bg-amber/10 disabled:opacity-50"
        >
          {busy === 'shrink' ? 'Shrinking…' : 'Make it smaller'}
        </button>
        <button
          onClick={() => onLog('not_yet')}
          disabled={!!busy}
          className="press rounded-xl border border-edge px-5 py-4 text-center font-medium text-text-soft hover:border-text-faint hover:text-text disabled:opacity-50"
        >
          {busy === 'not_yet' ? 'Saving…' : 'Not yet'}
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-text-faint">
        We go at your pace. Retreating is always allowed.
      </p>
    </div>
  )
}

function DimBars({ dims, level }: { dims: Dims; level: number }) {
  const keys = Object.keys(DIM_LABELS) as (keyof Dims)[]
  return (
    <div className="mt-6 border-t border-edge-soft pt-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
          difficulty read
        </span>
        <span className="tnum text-xs text-text-faint">
          level <span className="text-amber">{level}</span>/100
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {keys.map((k) => (
          <div key={k}>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-text-soft">{DIM_LABELS[k]}</span>
              <span className="tnum text-[11px] text-text-faint">{dims[k]}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-edge">
              <div
                className="h-full rounded-full bg-amber/70"
                style={{ width: `${dims[k]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── debrief ───────────────────────────────────────────────────────── */
function Debrief({
  mission,
  attempted,
  predicted,
  catastrophe,
  setCatastrophe,
  outcome,
  setOutcome,
  actual,
  setActual,
  verdict,
  setVerdict,
  busy,
  error,
  onSubmit,
}: {
  mission: MissionRow
  attempted: boolean
  predicted: number
  catastrophe: string
  setCatastrophe: (s: string) => void
  outcome: string
  setOutcome: (s: string) => void
  actual: number
  setActual: (n: number) => void
  verdict: 'did_not_happen' | 'partly' | 'happened' | ''
  setVerdict: (v: 'did_not_happen' | 'partly' | 'happened') => void
  busy: string | null
  error: string | null
  onSubmit: () => void
}) {
  const verdicts: { key: 'did_not_happen' | 'partly' | 'happened'; label: string }[] = [
    { key: 'did_not_happen', label: 'No, it didn’t' },
    { key: 'partly', label: 'Partly' },
    { key: 'happened', label: 'Yes, it did' },
  ]
  return (
    <div className="rise">
      <p className="text-xs uppercase tracking-[0.32em] text-teal">90-second debrief</p>
      <h1 className="mt-3 font-display text-3xl md:text-4xl">
        {attempted ? 'You did it. Let’s file it.' : 'You showed up to the edge. Let’s file it.'}
      </h1>
      <p className="handler mt-2 text-lg text-text-soft">{mission.filled_action}</p>

      <div className="mt-7 space-y-6">
        <Field label="Before you went, what were you afraid would happen?">
          <textarea
            value={catastrophe}
            onChange={(e) => setCatastrophe(e.target.value)}
            rows={2}
            maxLength={400}
            placeholder="The specific catastrophe you pictured…"
            className="w-full resize-none rounded-lg border border-edge bg-panel-2 px-4 py-3 text-sm outline-none placeholder:text-text-faint focus:border-amber/60"
          />
        </Field>

        <Field label="What actually happened?">
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            rows={2}
            maxLength={400}
            placeholder="Just the facts of how it went…"
            className="w-full resize-none rounded-lg border border-edge bg-panel-2 px-4 py-3 text-sm outline-none placeholder:text-text-faint focus:border-teal/60"
          />
        </Field>

        <div className="glass-2 rounded-xl border border-edge p-5">
          <SudsSlider
            id="actual"
            label="How distressing did it ACTUALLY feel, at its peak?"
            value={actual}
            onChange={setActual}
            tone="teal"
          />
          <p className="mt-3 text-xs text-text-faint">
            You predicted <span className="tnum text-amber">{predicted}</span>.
          </p>
        </div>

        <Field label="Did the thing you feared actually happen?">
          <div className="grid grid-cols-3 gap-2">
            {verdicts.map((v) => (
              <button
                key={v.key}
                onClick={() => setVerdict(v.key)}
                aria-pressed={verdict === v.key}
                className={`press rounded-lg border px-3 py-2.5 text-sm ${
                  verdict === v.key
                    ? 'border-teal bg-teal/15 text-teal shadow-[0_0_20px_-6px_var(--teal)]'
                    : 'border-edge text-text-soft hover:border-text-faint hover:text-text'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {error && (
        <p className="mt-5 rounded-lg border border-crisis/40 bg-crisis/10 px-3 py-2 text-sm text-crisis">
          {error}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={busy === 'debrief'}
        className="press mt-7 w-full rounded-xl bg-teal px-6 py-3.5 font-semibold text-ground shadow-[0_12px_44px_-14px_var(--teal)] hover:bg-teal-deep disabled:opacity-50"
      >
        {busy === 'debrief' ? 'Filing the evidence…' : 'File it →'}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm text-text-soft">{label}</p>
      {children}
    </div>
  )
}

/* ── result ────────────────────────────────────────────────────────── */
function Result({
  reflection,
  titration,
  crisis,
  predicted,
  actual,
  wasDebrief,
  onNext,
}: {
  reflection: string
  titration: TitrationResult | null
  crisis: boolean
  predicted: number
  actual: number
  wasDebrief: boolean
  onNext: () => void
}) {
  const gap = predicted - actual
  return (
    <div className="rise flex flex-1 flex-col">
      <p className="text-xs uppercase tracking-[0.32em] text-amber">filed</p>
      <h1 className="mt-3 font-display text-3xl md:text-4xl">Logged. That&apos;s a win in the ledger.</h1>

      {reflection && (
        <div className="rise mt-6 glass rounded-2xl border border-edge p-6 shadow-[0_30px_80px_-46px_rgba(0,0,0,0.9)]" style={{ animationDelay: '60ms' }}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber">handler</p>
          <p className="handler mt-2 text-xl leading-relaxed">{reflection}</p>
        </div>
      )}

      {wasDebrief && (
        <div className="rise mt-5 glass-2 rounded-2xl border border-edge p-6" style={{ animationDelay: '140ms' }}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
            predicted vs actual
          </p>
          <div className="mt-4 flex items-end gap-6">
            <Stat label="you predicted" value={predicted} tone="amber" />
            <Stat label="it actually felt" value={actual} tone="teal" />
            <div className="ml-auto text-right">
              <p className="tnum text-2xl" style={{ color: gap > 0 ? 'var(--good)' : 'var(--text-soft)' }}>
                {gap > 0 ? `-${gap}` : gap === 0 ? '±0' : `+${-gap}`}
              </p>
              <p className="text-[11px] text-text-faint">
                {gap > 0 ? 'cooler than feared' : gap === 0 ? 'spot on' : 'ran hotter'}
              </p>
            </div>
          </div>
        </div>
      )}

      {titration && (
        <div className="mt-5 rounded-2xl border border-amber/25 bg-amber/5 p-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber">next-mission tuning</p>
            <span className="tnum text-xs text-text-soft">
              level → <span className="text-amber">{titration.level}</span>
              {titration.delta !== 0 && (
                <span className={titration.delta > 0 ? 'text-good' : 'text-teal'}>
                  {' '}({titration.delta > 0 ? '+' : ''}{titration.delta})
                </span>
              )}
            </span>
          </div>
          <p className="mt-2 leading-relaxed text-text-soft">{titration.rationale}</p>
        </div>
      )}

      {crisis && (
        <div className="mt-5 rounded-2xl border border-crisis/40 bg-crisis/10 p-6">
          <p className="font-medium text-crisis">It sounds like things feel really heavy.</p>
          <p className="mt-1 text-sm text-text-soft">
            NERVE isn&apos;t therapy. Please reach a trained human — it helps to talk to someone.
          </p>
          <button
            onClick={() => window.dispatchEvent(new Event('nerve:open-crisis'))}
            className="press mt-3 rounded-lg border border-crisis/50 px-4 py-2 text-sm font-medium text-crisis hover:bg-crisis/15"
          >
            Open support resources
          </button>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={onNext}
          className="press rounded-xl bg-amber px-6 py-3 font-semibold text-ground shadow-[0_10px_40px_-12px_var(--amber)] hover:bg-amber-deep"
        >
          Next mission →
        </button>
        <Link
          href="/ledger"
          className="press rounded-xl border border-edge glass px-6 py-3 font-medium text-text hover:border-teal/50 hover:text-teal"
        >
          See the evidence
        </Link>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'teal' }) {
  return (
    <div>
      <p className="tnum text-4xl" style={{ color: tone === 'amber' ? 'var(--amber)' : 'var(--teal)' }}>
        {value}
      </p>
      <p className="text-[11px] text-text-faint">{label}</p>
    </div>
  )
}

function Shell({
  children,
  levelRight,
}: {
  children: React.ReactNode
  levelRight?: number
}) {
  return (
    <>
      <Header
        right={
          <Link href="/ledger" className="text-sm text-text-soft transition hover:text-teal">
            Ledger
          </Link>
        }
      />
      {children}
      <Footer />
      <CrisisSheet />
      {/* levelRight reserved for future header badge */}
      {typeof levelRight === 'number' ? null : null}
    </>
  )
}
