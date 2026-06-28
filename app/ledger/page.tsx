'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { anonOwner } from '@/lib/anon'
import { Header, Footer, CrisisSheet } from '../_components/Chrome'

interface PredictionPoint {
  mission_id: string
  created_at: string
  predicted: number | null
  actual: number
  outcome: string
}
interface Stats {
  totalMissions: number
  attempts: number
  didIt: number
  retreated: number
  notYet: number
  currentStreak: number
  evidence: {
    predictedCount: number
    happenedCount: number
    partlyCount: number
    notHappenedCount: number
  }
  series: PredictionPoint[]
  level: number
}

export default function LedgerPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = anonOwner()
    fetch(`/api/ledger?owner=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setStats(d.stats)
      })
      .catch((e) => setError(e.message))
  }, [])

  return (
    <Shell>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 md:px-8 md:py-12">
        <div className="rise flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-amber">courage ledger</p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">The evidence so far</h1>
          </div>
          <Link
            href="/mission"
            className="press rounded-xl bg-amber px-5 py-2.5 text-sm font-semibold text-ground shadow-[0_10px_40px_-14px_var(--amber)] hover:bg-amber-deep"
          >
            New mission →
          </Link>
        </div>

        {error && (
          <p className="mt-8 rounded-lg border border-crisis/40 bg-crisis/10 px-3 py-2 text-sm text-crisis">
            {error}
          </p>
        )}

        {!stats && !error && (
          <div className="mt-8 space-y-4">
            <div className="skeleton h-28 rounded-2xl" />
            <div className="skeleton h-64 rounded-2xl" />
          </div>
        )}

        {stats && stats.totalMissions === 0 && (
          <div className="rise mt-10 glass rounded-2xl border border-edge p-8 text-center shadow-[0_30px_80px_-46px_rgba(0,0,0,0.9)]">
            <h2 className="font-display text-2xl md:text-3xl">Your ledger is waiting for its first entry</h2>
            <p className="handler mt-3 text-lg text-text-soft">
              Every mission you attempt — even the ones you retreat from — gets logged here as
              proof. Let&apos;s get the first one.
            </p>
            <Link
              href="/mission"
              className="press mt-6 inline-block rounded-xl bg-amber px-6 py-3 font-semibold text-ground shadow-[0_10px_40px_-12px_var(--amber)] hover:bg-amber-deep"
            >
              Get my first mission →
            </Link>
          </div>
        )}

        {stats && stats.totalMissions > 0 && (
          <>
            {/* headline stats */}
            <div className="rise mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card value={stats.attempts} label="attempts" tone="amber" />
              <Card value={stats.currentStreak} label="attempt streak" tone="teal" />
              <Card value={stats.didIt} label="completed" tone="text" />
              <Card value={stats.retreated} label="brave retreats" tone="text" />
            </div>

            {/* the therapeutic payload */}
            <div
              className="rise mt-4 rounded-2xl border border-teal/25 bg-teal/[0.06] p-6 backdrop-blur-md"
              style={{ animationDelay: '80ms' }}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-teal">the evidence</p>
              <p className="mt-3 text-balance text-xl leading-relaxed md:text-2xl">
                You predicted{' '}
                <span className="tnum text-amber">{stats.evidence.predictedCount}</span>{' '}
                catastrophe{stats.evidence.predictedCount === 1 ? '' : 's'}.{' '}
                {stats.evidence.predictedCount > 0 ? (
                  <>
                    The thing you feared fully happened{' '}
                    <span className="tnum text-teal">{stats.evidence.happenedCount}</span>{' '}
                    time{stats.evidence.happenedCount === 1 ? '' : 's'}.
                  </>
                ) : (
                  <span className="text-text-soft">Log a debrief to start the count.</span>
                )}
              </p>
              {stats.evidence.predictedCount > 0 && (
                <p className="mt-2 text-sm text-text-soft">
                  {stats.evidence.notHappenedCount} times nothing you feared happened
                  {stats.evidence.partlyCount > 0
                    ? ` · ${stats.evidence.partlyCount} partly`
                    : ''}
                  .
                </p>
              )}
            </div>

            {/* predicted vs actual chart */}
            <div
              className="rise mt-4 glass rounded-2xl border border-edge p-6"
              style={{ animationDelay: '160ms' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
                  predicted vs actual distress
                </p>
                <div className="flex items-center gap-4 text-[11px]">
                  <Legend color="var(--amber)" label="predicted" />
                  <Legend color="var(--teal)" label="actual" />
                </div>
              </div>
              <Chart series={stats.series} />
              <p className="mt-3 text-xs text-text-faint">
                The shaded band (40–60) is the challenge zone I aim your missions toward. When
                amber sits above teal, the fear ran hotter than the moment.
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-text-faint">
              Current difficulty level: <span className="tnum text-amber">{stats.level}</span>/100
            </p>
          </>
        )}
      </main>
    </Shell>
  )
}

function Card({
  value,
  label,
  tone,
}: {
  value: number
  label: string
  tone: 'amber' | 'teal' | 'text'
}) {
  const color =
    tone === 'amber' ? 'var(--amber)' : tone === 'teal' ? 'var(--teal)' : 'var(--text)'
  return (
    <div className="lift glass-2 rounded-2xl border border-edge p-4">
      <p className="tnum text-3xl" style={{ color, textShadow: `0 0 24px ${color}55` }}>
        {value}
      </p>
      <p className="mt-1 text-xs text-text-faint">{label}</p>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-text-soft">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function Chart({ series }: { series: PredictionPoint[] }) {
  const W = 640
  const H = 220
  const padX = 24
  const padY = 18
  const innerW = W - padX * 2
  const innerH = H - padY * 2
  const n = series.length

  const x = (i: number) => (n <= 1 ? padX + innerW / 2 : padX + (i / (n - 1)) * innerW)
  const y = (v: number) => padY + (1 - v / 100) * innerH

  const pred = series
    .map((p, i) => (p.predicted != null ? `${x(i)},${y(p.predicted)}` : null))
    .filter((s): s is string => s !== null)
  const act = series.map((p, i) => `${x(i)},${y(p.actual)}`)

  if (n === 0) {
    return (
      <div className="mt-4 flex h-40 items-center justify-center text-sm text-text-faint">
        No debriefs yet — your first one draws the first point.
      </div>
    )
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="Predicted vs actual distress over time">
      <defs>
        <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--amber)" floodOpacity="0.55" />
        </filter>
        <filter id="glowTeal" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--teal)" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* target band 40–60 */}
      <rect
        x={padX}
        y={y(60)}
        width={innerW}
        height={y(40) - y(60)}
        fill="rgba(231,234,243,0.05)"
        stroke="rgba(231,234,243,0.12)"
        strokeDasharray="3 4"
      />
      <text x={padX + 4} y={y(60) - 4} fontSize="9" fill="var(--text-faint)">
        challenge band
      </text>

      {/* predicted line */}
      {pred.length > 1 && (
        <polyline points={pred.join(' ')} fill="none" stroke="var(--amber)" strokeWidth="2" opacity="0.9" filter="url(#glowAmber)" />
      )}
      {/* actual line */}
      {act.length > 1 && (
        <polyline points={act.join(' ')} fill="none" stroke="var(--teal)" strokeWidth="2.25" filter="url(#glowTeal)" />
      )}

      {/* points */}
      {series.map((p, i) => (
        <g key={p.mission_id}>
          {p.predicted != null && (
            <circle cx={x(i)} cy={y(p.predicted)} r="3.5" fill="var(--amber)" filter="url(#glowAmber)" />
          )}
          <circle cx={x(i)} cy={y(p.actual)} r="3.5" fill="var(--teal)" filter="url(#glowTeal)" />
        </g>
      ))}
    </svg>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header
        right={
          <Link href="/mission" className="text-sm text-text-soft transition hover:text-amber">
            Mission
          </Link>
        }
      />
      {children}
      <Footer />
      <CrisisSheet />
    </>
  )
}
