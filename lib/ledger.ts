import type {
  DebriefRow,
  FearVerdict,
  LedgerEntry,
  MissionRow,
} from './types'

/**
 * Pure helpers for the Courage Ledger: packing the "did the feared thing happen?"
 * verdict into the debrief's gap_note (the fixed schema has no boolean column),
 * validating debrief input, and aggregating the evidence + streaks. No DB here.
 */

const VERDICTS: FearVerdict[] = ['did_not_happen', 'partly', 'happened']

/** Pack the verdict + the user/handler gap text into one gap_note string. */
export function packGapNote(verdict: FearVerdict, text: string): string {
  return `${verdict}::${text ?? ''}`
}

/** Unpack a stored gap_note back into { verdict, text }. Defensive against legacy/plain text. */
export function unpackGapNote(stored: string | null | undefined): {
  verdict: FearVerdict
  text: string
} {
  const s = stored ?? ''
  const idx = s.indexOf('::')
  if (idx === -1) return { verdict: 'partly', text: s }
  const head = s.slice(0, idx) as FearVerdict
  const text = s.slice(idx + 2)
  return { verdict: VERDICTS.includes(head) ? head : 'partly', text }
}

export interface DebriefInput {
  actual_suds: number
  predicted_catastrophe: string
  actual_outcome: string
  fear_verdict: FearVerdict
  gap_note?: string
}

/** Validate the required debrief fields. Returns an error message, or null if valid. */
export function validateDebrief(input: Partial<DebriefInput>): string | null {
  if (input.actual_suds == null || Number.isNaN(input.actual_suds)) {
    return 'Please set how distressed you actually felt (0–100).'
  }
  if (input.actual_suds < 0 || input.actual_suds > 100) {
    return 'Actual distress must be between 0 and 100.'
  }
  if (!input.predicted_catastrophe || !input.predicted_catastrophe.trim()) {
    return 'What did you fear would happen? A few words is enough.'
  }
  if (!input.actual_outcome || !input.actual_outcome.trim()) {
    return 'What actually happened? A few words is enough.'
  }
  if (!input.fear_verdict || !VERDICTS.includes(input.fear_verdict)) {
    return 'Did the thing you feared actually happen?'
  }
  return null
}

export interface Evidence {
  /** every debrief logged a predicted catastrophe */
  predictedCount: number
  happenedCount: number
  partlyCount: number
  notHappenedCount: number
}

/** "You predicted X catastrophes; Y actually happened." The therapeutic payload. */
export function aggregateEvidence(debriefs: DebriefRow[]): Evidence {
  const ev: Evidence = {
    predictedCount: 0,
    happenedCount: 0,
    partlyCount: 0,
    notHappenedCount: 0,
  }
  for (const d of debriefs) {
    if (!d.predicted_catastrophe || !d.predicted_catastrophe.trim()) continue
    ev.predictedCount++
    const { verdict } = unpackGapNote(d.gap_note)
    if (verdict === 'happened') ev.happenedCount++
    else if (verdict === 'partly') ev.partlyCount++
    else ev.notHappenedCount++
  }
  return ev
}

/** An attempt = a mission that was actually attempted (did it OR retreated). */
export function isAttempt(m: MissionRow): boolean {
  return m.status === 'did_it' || m.status === 'retreated'
}

/**
 * Current streak of consecutive ATTEMPTS, counting back from the most recent
 * resolved mission. A "not yet" (skipped) breaks the streak gently; an unattempted
 * issued mission at the head is ignored.
 */
export function attemptStreak(missions: MissionRow[]): number {
  // newest first, skip a still-open issued mission at the head
  const resolved = [...missions]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .filter((m) => m.status !== 'issued')
  let streak = 0
  for (const m of resolved) {
    if (isAttempt(m)) streak++
    else break
  }
  return streak
}

export interface PredictionPoint {
  mission_id: string
  created_at: string
  predicted: number | null
  actual: number
  outcome: MissionRow['status']
}

/** Predicted-vs-actual SUDS series for the chart (only resolved missions w/ a debrief). */
export function predictionSeries(entries: LedgerEntry[]): PredictionPoint[] {
  return entries
    .filter((e) => e.debrief != null)
    .map((e) => ({
      mission_id: e.mission.id,
      created_at: e.mission.created_at,
      predicted: e.mission.predicted_suds,
      actual: e.debrief!.actual_suds,
      outcome: e.mission.status,
    }))
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
}

export interface LedgerStats {
  totalMissions: number
  attempts: number
  didIt: number
  retreated: number
  notYet: number
  currentStreak: number
  evidence: Evidence
  series: PredictionPoint[]
  level: number
}

/** Roll up everything the Courage Ledger needs from raw rows. Pure. */
export function summarizeLedger(
  entries: LedgerEntry[],
  level: number,
): LedgerStats {
  const missions = entries.map((e) => e.mission)
  const debriefs = entries
    .map((e) => e.debrief)
    .filter((d): d is DebriefRow => d != null)

  const didIt = missions.filter((m) => m.status === 'did_it').length
  const retreated = missions.filter((m) => m.status === 'retreated').length
  const notYet = missions.filter((m) => m.status === 'skipped').length

  return {
    totalMissions: missions.filter((m) => m.status !== 'issued').length,
    attempts: didIt + retreated,
    didIt,
    retreated,
    notYet,
    currentStreak: attemptStreak(missions),
    evidence: aggregateEvidence(debriefs),
    series: predictionSeries(entries),
    level,
  }
}
