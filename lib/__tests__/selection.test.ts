import { describe, it, expect } from 'vitest'
import { selectTemplate, templateDifficulty } from '../missions'
import type { MissionTemplate } from '../types'

const tmpl = (
  id: string,
  dimAvg: number,
  min_level: number,
  category: MissionTemplate['category'] = 'transactional',
  active = true,
): MissionTemplate => ({
  id,
  title: id,
  action_template: `do ${id}`,
  dims: {
    intimacy: dimAvg,
    audience: dimAvg,
    rejection_risk: dimAvg,
    performance: dimAvg,
  },
  min_level,
  slots: {},
  category,
  active,
})

const SET: MissionTemplate[] = [
  tmpl('easy', 10, 0),
  tmpl('mid', 45, 20),
  tmpl('hard', 80, 60),
  tmpl('call', 50, 20, 'phone_call'),
  tmpl('off', 50, 20, 'transactional', false),
]

describe('templateDifficulty', () => {
  it('averages the four dims', () => {
    expect(templateDifficulty(tmpl('x', 40, 0))).toBe(40)
  })
})

describe('selectTemplate', () => {
  it('picks the eligible template closest to the level', () => {
    const t = selectTemplate(SET, 45)
    expect(t?.id).toBe('mid')
  })

  it('respects min_level (will not over-issue a hard mission)', () => {
    const t = selectTemplate(SET, 15) // hard needs 60, mid needs 20
    expect(t?.id).toBe('easy')
  })

  it('never returns an inactive template', () => {
    const t = selectTemplate([tmpl('off', 45, 0, 'transactional', false)], 45)
    expect(t).toBeNull()
  })

  it('excludes the last template to avoid back-to-back repeats', () => {
    const t = selectTemplate(SET, 45, { excludeId: 'mid' })
    expect(t?.id).not.toBe('mid')
  })

  it('nudges toward a category matching the user contexts', () => {
    // both mid and call are at difficulty 45/50 near level 50; contexts pull to the call
    const t = selectTemplate(SET, 50, { contexts: ['calls'] })
    expect(t?.id).toBe('call')
  })

  it('returns null on an empty set', () => {
    expect(selectTemplate([], 50)).toBeNull()
  })
})
