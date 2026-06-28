import type { LogOutcome } from './types'

/**
 * The titration engine. A transparent heuristic — NOT a black box.
 *
 * Per-user state is a single scalar `level` (0–100) ≈ current comfortable
 * difficulty. We aim for an *actual* SUDS in the activation band ~40–60
 * (challenging, not overwhelming) and move `level` toward it based on what
 * actually happened. Everything here is pure and unit-tested.
 */

export const TARGET_LOW = 40
export const TARGET_HIGH = 60
export const MIN_LEVEL = 0
export const MAX_LEVEL = 100

export type Band = 'below' | 'in' | 'above' | 'unknown'

export function classifyBand(actualSuds: number | null): Band {
  if (actualSuds == null) return 'unknown'
  if (actualSuds < TARGET_LOW) return 'below'
  if (actualSuds > TARGET_HIGH) return 'above'
  return 'in'
}

export interface TitrationInput {
  /** current level 0–100 */
  level: number
  outcome: LogOutcome
  /** actual SUDS from the debrief (for did_it / retreated); null otherwise */
  actualSuds: number | null
  /** consecutive 'not_yet' logs immediately preceding this one */
  recentNotYet: number
}

export interface TitrationResult {
  /** new clamped level */
  level: number
  /** actual change applied after clamping (can differ from intended at bounds) */
  delta: number
  /** surface a prominent "make it smaller" path next */
  offerSmaller: boolean
  /** where the actual SUDS landed vs the target band */
  band: Band
  /** legible, handler-voice explanation of WHY the level moved */
  rationale: string
}

function clamp(n: number): number {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(n)))
}

/**
 * Decide the next level from one logged outcome. Rules (from the spec):
 *  - attempted + low actual  → step up (it was too easy; ready for more)
 *  - attempted + in-band     → small step up (the sweet spot)
 *  - attempted + high actual → hold / tiny step (that took real nerve)
 *  - retreated               → step down + offer smaller (the attempt still counts)
 *  - "not yet" (repeated)    → shrink more + gentle anti-avoidance nudge
 */
export function titrate(input: TitrationInput): TitrationResult {
  const { level, outcome, actualSuds, recentNotYet } = input
  const band = classifyBand(actualSuds)

  let intended = 0
  let offerSmaller = false
  let rationale = ''

  if (outcome === 'did_it') {
    if (band === 'below') {
      intended = 10
      rationale =
        actualSuds != null
          ? `You did it and it landed at ${actualSuds} — under your challenge band. You're ready for a bigger ask, so I'm nudging the difficulty up.`
          : `You did it, and it sounded easy. Nudging the difficulty up.`
    } else if (band === 'above') {
      intended = 2
      rationale = `You did it at ${actualSuds} — top of the band. That took real nerve. We hold about here and let it settle.`
    } else if (band === 'in') {
      intended = 5
      rationale = `You did it at ${actualSuds} — squarely in the challenge band. That's the sweet spot. A small step up next.`
    } else {
      intended = 3
      rationale = `You did it. Holding roughly steady until I see how the next one feels.`
    }
  } else if (outcome === 'retreated') {
    intended = -8
    offerSmaller = true
    rationale = `You walked over intending to, and pulled back. That's real exposure — it counts, and it's logged. We go again, a little smaller.`
  } else {
    // not_yet
    offerSmaller = true
    if (recentNotYet + 1 >= 2) {
      intended = -10
      rationale = `A few "not yet"s in a row is information, not failure. I'm shrinking the next one so the first step is almost too easy to refuse.`
    } else {
      intended = -4
      rationale = `No rush. I'll bring the next one down a notch so it's easier to start.`
    }
  }

  const next = clamp(level + intended)
  return { level: next, delta: next - level, offerSmaller, band, rationale }
}

/** Seed the starting level from the intake's baseline anxiety (higher anxiety → easier start). */
export function seedLevelFromIntake(baseline: number): number {
  const b = Math.max(0, Math.min(100, baseline))
  return clamp(50 - b * 0.4) // baseline 80 → ~18, baseline 20 → ~42, baseline 0 → 50
}

/** Force a step down for the explicit "make it smaller" tap (no attempt logged). */
export function shrinkLevel(level: number): number {
  return clamp(level - 8)
}
