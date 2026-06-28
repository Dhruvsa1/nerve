import { describe, it, expect } from 'vitest'
import {
  packGapNote,
  unpackGapNote,
  validateDebrief,
  aggregateEvidence,
  attemptStreak,
  predictionSeries,
  summarizeLedger,
} from '../ledger'
import type { DebriefRow, LedgerEntry, MissionRow } from '../types'

const mission = (
  id: string,
  status: MissionRow['status'],
  ageMin: number,
  predicted: number | null = 60,
): MissionRow => ({
  id,
  user_id: 'u',
  template_id: 't',
  filled_action: 'do a thing',
  dims: { intimacy: 10, audience: 10, rejection_risk: 10, performance: 10 },
  level_at_issue: 30,
  predicted_suds: predicted,
  status,
  created_at: new Date(Date.now() - ageMin * 60_000).toISOString(),
})

const debrief = (
  missionId: string,
  actual: number,
  verdict: 'did_not_happen' | 'partly' | 'happened',
): DebriefRow => ({
  id: `d-${missionId}`,
  mission_id: missionId,
  actual_suds: actual,
  predicted_catastrophe: 'they will judge me',
  actual_outcome: 'it was fine',
  gap_note: packGapNote(verdict, 'nice gap'),
  created_at: new Date().toISOString(),
})

describe('gap note pack/unpack', () => {
  it('round-trips the verdict and text', () => {
    const packed = packGapNote('did_not_happen', 'the sky did not fall')
    const { verdict, text } = unpackGapNote(packed)
    expect(verdict).toBe('did_not_happen')
    expect(text).toBe('the sky did not fall')
  })
  it('defends against legacy plain text', () => {
    const { verdict, text } = unpackGapNote('just some old note')
    expect(verdict).toBe('partly')
    expect(text).toBe('just some old note')
  })
  it('handles null', () => {
    expect(unpackGapNote(null).text).toBe('')
  })
})

describe('validateDebrief', () => {
  const valid = {
    actual_suds: 40,
    predicted_catastrophe: 'they laugh',
    actual_outcome: 'nothing',
    fear_verdict: 'did_not_happen' as const,
  }
  it('accepts a complete debrief', () => {
    expect(validateDebrief(valid)).toBeNull()
  })
  it('requires actual_suds in range', () => {
    expect(validateDebrief({ ...valid, actual_suds: undefined })).toMatch(/distress/i)
    expect(validateDebrief({ ...valid, actual_suds: 200 })).toMatch(/between/i)
  })
  it('requires the predicted catastrophe', () => {
    expect(validateDebrief({ ...valid, predicted_catastrophe: '  ' })).toMatch(/fear/i)
  })
  it('requires the actual outcome', () => {
    expect(validateDebrief({ ...valid, actual_outcome: '' })).toMatch(/happened/i)
  })
  it('requires a valid verdict', () => {
    // @ts-expect-error testing bad input
    expect(validateDebrief({ ...valid, fear_verdict: 'nope' })).not.toBeNull()
  })
})

describe('aggregateEvidence', () => {
  it('counts predicted catastrophes vs what actually happened', () => {
    const ds = [
      debrief('m1', 30, 'did_not_happen'),
      debrief('m2', 40, 'did_not_happen'),
      debrief('m3', 70, 'partly'),
      debrief('m4', 80, 'happened'),
    ]
    const ev = aggregateEvidence(ds)
    expect(ev.predictedCount).toBe(4)
    expect(ev.notHappenedCount).toBe(2)
    expect(ev.partlyCount).toBe(1)
    expect(ev.happenedCount).toBe(1)
  })
  it('ignores debriefs with no predicted catastrophe', () => {
    const d = debrief('m1', 30, 'did_not_happen')
    d.predicted_catastrophe = ''
    expect(aggregateEvidence([d]).predictedCount).toBe(0)
  })
})

describe('attemptStreak', () => {
  it('counts consecutive attempts back from the most recent resolved mission', () => {
    const ms = [
      mission('a', 'did_it', 50),
      mission('b', 'retreated', 40),
      mission('c', 'did_it', 30),
      mission('d', 'issued', 5), // open mission at head is ignored
    ]
    expect(attemptStreak(ms)).toBe(3)
  })
  it('a not-yet (skipped) breaks the streak', () => {
    const ms = [
      mission('a', 'did_it', 50),
      mission('b', 'skipped', 40),
      mission('c', 'did_it', 30),
    ]
    expect(attemptStreak(ms)).toBe(1)
  })
})

describe('summarizeLedger', () => {
  it('rolls up counts, streak, evidence and the prediction series', () => {
    const entries: LedgerEntry[] = [
      { mission: mission('m1', 'did_it', 50, 70), debrief: debrief('m1', 30, 'did_not_happen') },
      { mission: mission('m2', 'retreated', 40, 80), debrief: debrief('m2', 75, 'partly') },
      { mission: mission('m3', 'skipped', 30, null), debrief: null },
      { mission: mission('m4', 'issued', 5, null), debrief: null },
    ]
    const s = summarizeLedger(entries, 33)
    expect(s.level).toBe(33)
    expect(s.didIt).toBe(1)
    expect(s.retreated).toBe(1)
    expect(s.notYet).toBe(1)
    expect(s.attempts).toBe(2)
    expect(s.totalMissions).toBe(3) // excludes the open 'issued' one
    expect(s.evidence.predictedCount).toBe(2)
    expect(s.series).toHaveLength(2)
    expect(s.series[0].predicted).toBe(70)
    expect(s.series[0].actual).toBe(30)
  })
})

describe('predictionSeries', () => {
  it('only includes missions that have a debrief, sorted oldest→newest', () => {
    const entries: LedgerEntry[] = [
      { mission: mission('new', 'did_it', 10, 50), debrief: debrief('new', 20, 'did_not_happen') },
      { mission: mission('old', 'did_it', 100, 60), debrief: debrief('old', 30, 'did_not_happen') },
      { mission: mission('nd', 'skipped', 5, null), debrief: null },
    ]
    const series = predictionSeries(entries)
    expect(series.map((p) => p.mission_id)).toEqual(['old', 'new'])
  })
})
