import { describe, it, expect } from 'vitest'
import {
  titrate,
  seedLevelFromIntake,
  shrinkLevel,
  classifyBand,
  TARGET_LOW,
  TARGET_HIGH,
} from '../titration'

describe('classifyBand', () => {
  it('classifies relative to the 40–60 activation band', () => {
    expect(classifyBand(null)).toBe('unknown')
    expect(classifyBand(TARGET_LOW - 1)).toBe('below')
    expect(classifyBand(TARGET_LOW)).toBe('in')
    expect(classifyBand(50)).toBe('in')
    expect(classifyBand(TARGET_HIGH)).toBe('in')
    expect(classifyBand(TARGET_HIGH + 1)).toBe('above')
  })
})

describe('seedLevelFromIntake', () => {
  it('higher baseline anxiety starts easier', () => {
    expect(seedLevelFromIntake(80)).toBeLessThan(seedLevelFromIntake(20))
  })
  it('clamps to 0–100', () => {
    expect(seedLevelFromIntake(0)).toBeLessThanOrEqual(100)
    expect(seedLevelFromIntake(100)).toBeGreaterThanOrEqual(0)
    expect(seedLevelFromIntake(200)).toBeLessThanOrEqual(100)
  })
})

describe('titrate — did_it', () => {
  it('steps UP when the attempt was too easy (below band)', () => {
    const r = titrate({ level: 30, outcome: 'did_it', actualSuds: 20, recentNotYet: 0 })
    expect(r.delta).toBeGreaterThan(0)
    expect(r.band).toBe('below')
    expect(r.offerSmaller).toBe(false)
    expect(r.rationale).toMatch(/\d/)
  })
  it('takes a small step up in the sweet spot (in band)', () => {
    const r = titrate({ level: 30, outcome: 'did_it', actualSuds: 50, recentNotYet: 0 })
    expect(r.delta).toBe(5)
    expect(r.band).toBe('in')
  })
  it('barely moves when it was very hard (above band)', () => {
    const inb = titrate({ level: 30, outcome: 'did_it', actualSuds: 50, recentNotYet: 0 })
    const above = titrate({ level: 30, outcome: 'did_it', actualSuds: 90, recentNotYet: 0 })
    expect(above.band).toBe('above')
    expect(above.delta).toBeLessThan(inb.delta)
    expect(above.delta).toBeGreaterThanOrEqual(0)
  })
})

describe('titrate — retreated', () => {
  it('steps down AND offers a smaller mission (the attempt still counts)', () => {
    const r = titrate({ level: 50, outcome: 'retreated', actualSuds: 70, recentNotYet: 0 })
    expect(r.delta).toBeLessThan(0)
    expect(r.offerSmaller).toBe(true)
    expect(r.rationale).toMatch(/counts/i)
  })
})

describe('titrate — not_yet', () => {
  it('shrinks gently on the first not-yet', () => {
    const r = titrate({ level: 50, outcome: 'not_yet', actualSuds: null, recentNotYet: 0 })
    expect(r.delta).toBe(-4)
    expect(r.offerSmaller).toBe(true)
  })
  it('shrinks harder after repeated not-yets', () => {
    const r = titrate({ level: 50, outcome: 'not_yet', actualSuds: null, recentNotYet: 2 })
    expect(r.delta).toBe(-10)
    expect(r.offerSmaller).toBe(true)
  })
})

describe('titrate — clamping', () => {
  it('never goes below 0', () => {
    const r = titrate({ level: 3, outcome: 'not_yet', actualSuds: null, recentNotYet: 5 })
    expect(r.level).toBeGreaterThanOrEqual(0)
    expect(r.level).toBe(0)
  })
  it('never goes above 100', () => {
    const r = titrate({ level: 98, outcome: 'did_it', actualSuds: 10, recentNotYet: 0 })
    expect(r.level).toBeLessThanOrEqual(100)
  })
  it('delta reflects the clamped change', () => {
    const r = titrate({ level: 2, outcome: 'not_yet', actualSuds: null, recentNotYet: 5 })
    expect(r.delta).toBe(r.level - 2)
  })
})

describe('shrinkLevel', () => {
  it('drops the level and clamps', () => {
    expect(shrinkLevel(50)).toBe(42)
    expect(shrinkLevel(2)).toBe(0)
  })
})
