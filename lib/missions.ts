import { q, q1 } from './db'
import { hasApiKey } from './anthropic'
import { fillMission, reflectOnDebrief } from './prompts'
import { checkMission, tripsCrisisKeywords } from './safety'
import {
  titrate,
  shrinkLevel,
  seedLevelFromIntake,
  classifyBand,
  type TitrationResult,
} from './titration'
import { packGapNote, validateDebrief, type DebriefInput } from './ledger'
import type {
  DebriefRow,
  Intake,
  LedgerEntry,
  MissionRow,
  MissionTemplate,
  UserRow,
} from './types'

// ── pure template selection (unit-tested) ─────────────────────────────

/** A template's overall difficulty = mean of its four latent dimensions. */
export function templateDifficulty(t: MissionTemplate): number {
  const { intimacy, audience, rejection_risk, performance } = t.dims
  return (intimacy + audience + rejection_risk + performance) / 4
}

/**
 * Pick the eligible template whose difficulty sits closest to the user's level.
 * Eligible = active AND min_level <= level. A small bonus pulls toward templates
 * whose category matches the user's salient contexts. Excludes the last template
 * so the user doesn't get the same mission twice in a row. Pure.
 */
export function selectTemplate(
  templates: MissionTemplate[],
  level: number,
  opts: { excludeId?: string; contexts?: string[] } = {},
): MissionTemplate | null {
  const { excludeId, contexts = [] } = opts
  const eligible = templates.filter(
    (t) => t.active && t.min_level <= level && t.id !== excludeId,
  )
  const pool = eligible.length
    ? eligible
    : templates.filter((t) => t.active && t.id !== excludeId)
  if (pool.length === 0) return null

  const wantsContext = (t: MissionTemplate) =>
    contexts.some((c) => categoryMatchesContext(t.category, c))

  let best: MissionTemplate | null = null
  let bestScore = Infinity
  for (const t of pool) {
    const distance = Math.abs(templateDifficulty(t) - level)
    const bonus = wantsContext(t) ? -6 : 0
    const score = distance + bonus
    if (score < bestScore) {
      bestScore = score
      best = t
    }
  }
  return best
}

function categoryMatchesContext(category: string, context: string): boolean {
  const c = context.toLowerCase()
  const map: Record<string, string[]> = {
    phone_call: ['call', 'calls', 'phone'],
    transactional: ['café', 'cafe', 'store', 'shop', 'errands'],
    small_talk: ['campus', 'café', 'cafe', 'gym', 'work', 'neighborhood'],
    compliment: ['café', 'cafe', 'store', 'gym', 'work'],
    ask_for_help: ['campus', 'help', 'work', 'store'],
    group: ['campus', 'work', 'group', 'class'],
    spotlight: ['campus', 'work', 'group', 'class'],
  }
  return (map[category] ?? []).some((k) => c.includes(k))
}

// ── safe slot filling (LLM → safety → deterministic fallback) ──────────

export interface FilledMission {
  filled_action: string
  handler_line: string
}

/** Deterministic, always-safe fill from authored slot defaults (no LLM). */
function deterministicFill(t: MissionTemplate): FilledMission {
  let action = t.action_template
  for (const [name, def] of Object.entries(t.slots)) {
    action = action.split(`{${name}}`).join(def.safe)
  }
  const check = checkMission(action)
  return {
    filled_action: check.ok ? action : t.title,
    handler_line: 'One small, doable step. The attempt is the win — go at your pace.',
  }
}

/** Fill a template safely: try the LLM, validate against the deny-list, else fall back. */
export async function safelyFill(
  t: MissionTemplate,
  intake: Intake | null,
  level: number,
): Promise<FilledMission> {
  if (hasApiKey()) {
    try {
      const out = await fillMission({ template: t, intake, level })
      if (out.filled_action?.trim() && checkMission(out.filled_action).ok) {
        return { filled_action: out.filled_action.trim(), handler_line: out.handler_line?.trim() || deterministicFill(t).handler_line }
      }
    } catch {
      // fall through to deterministic
    }
  }
  return deterministicFill(t)
}

// ── users ─────────────────────────────────────────────────────────────

function normalizeUser(u: UserRow): UserRow {
  return {
    ...u,
    contexts: Array.isArray(u.contexts) ? u.contexts : [],
    level: u.level ?? 25,
  }
}

export async function getOrCreateUser(id: string): Promise<UserRow> {
  const existing = await q1<UserRow>(
    `select * from nerve.users_anon where id = $1`,
    [id],
  )
  if (existing) return normalizeUser(existing)
  const created = await q1<UserRow>(
    `insert into nerve.users_anon (id) values ($1)
     on conflict (id) do update set updated_at = now()
     returning *`,
    [id],
  )
  if (!created) throw new Error('Could not create user')
  return normalizeUser(created)
}

export async function getUser(id: string): Promise<UserRow | null> {
  const u = await q1<UserRow>(`select * from nerve.users_anon where id = $1`, [id])
  return u ? normalizeUser(u) : null
}

export async function saveIntake(id: string, intake: Intake): Promise<UserRow> {
  await getOrCreateUser(id)
  const level = seedLevelFromIntake(intake.baseline)
  const u = await q1<UserRow>(
    `update nerve.users_anon
       set intake = $2, contexts = $3, level = $4, updated_at = now()
     where id = $1
     returning *`,
    [id, JSON.stringify(intake), JSON.stringify(intake.contexts), level],
  )
  if (!u) throw new Error('Could not save intake')
  return normalizeUser(u)
}

async function setLevel(id: string, level: number): Promise<void> {
  await q(
    `update nerve.users_anon set level = $2, updated_at = now() where id = $1`,
    [id, level],
  )
}

// ── templates ─────────────────────────────────────────────────────────

export async function getActiveTemplates(): Promise<MissionTemplate[]> {
  return q<MissionTemplate>(
    `select id, title, action_template, dims, min_level, slots, category, active
     from nerve.mission_templates where active = true order by min_level asc`,
  )
}

// ── missions ──────────────────────────────────────────────────────────

export interface IssuedMission {
  mission: MissionRow
  handler_line: string
}

/** Reuse the still-open mission if one exists, otherwise issue a fresh one. */
export async function getOrIssueMission(userId: string): Promise<IssuedMission> {
  const open = await q1<MissionRow>(
    `select * from nerve.missions
     where user_id = $1 and status = 'issued' order by created_at desc limit 1`,
    [userId],
  )
  if (open) {
    return {
      mission: open,
      handler_line: 'Here when you are. Set your prediction, then go.',
    }
  }
  return issueMission(userId)
}

/** Issue a new mission sized to the user's current level. */
export async function issueMission(userId: string): Promise<IssuedMission> {
  const user = await getOrCreateUser(userId)
  const last = await q1<{ template_id: string | null }>(
    `select template_id from nerve.missions where user_id = $1 order by created_at desc limit 1`,
    [userId],
  )
  const templates = await getActiveTemplates()
  const template = selectTemplate(templates, user.level, {
    excludeId: last?.template_id ?? undefined,
    contexts: user.contexts,
  })
  if (!template) throw new Error('No mission templates available yet.')

  const filled = await safelyFill(template, user.intake, user.level)
  const mission = await q1<MissionRow>(
    `insert into nerve.missions
       (user_id, template_id, filled_action, dims, level_at_issue, status)
     values ($1, $2, $3, $4, $5, 'issued')
     returning *`,
    [
      userId,
      template.id,
      filled.filled_action,
      JSON.stringify(template.dims),
      user.level,
    ],
  )
  if (!mission) throw new Error('Could not issue mission')
  return { mission, handler_line: filled.handler_line }
}

export async function getMission(
  missionId: string,
  userId: string,
): Promise<MissionRow | null> {
  return q1<MissionRow>(
    `select * from nerve.missions where id = $1 and user_id = $2`,
    [missionId, userId],
  )
}

/** Count consecutive most-recent 'skipped' (not yet) missions before `excludeId`. */
async function recentNotYetCount(
  userId: string,
  excludeId: string,
): Promise<number> {
  const rows = await q<{ status: MissionRow['status'] }>(
    `select status from nerve.missions
     where user_id = $1 and id <> $2 order by created_at desc limit 12`,
    [userId, excludeId],
  )
  let n = 0
  for (const r of rows) {
    if (r.status === 'skipped') n++
    else break
  }
  return n
}

export interface LogResult {
  status: MissionRow['status']
  needsDebrief: boolean
  titration: TitrationResult | null
}

/**
 * Log a mission outcome.
 *  - did_it / retreated  → persist + status; titration is deferred to the debrief
 *    (we need the ACTUAL suds first). needsDebrief = true.
 *  - not_yet             → status 'skipped'; titrate now (no debrief). needsDebrief = false.
 */
export async function logOutcome(args: {
  userId: string
  missionId: string
  outcome: 'did_it' | 'retreated' | 'not_yet'
  predictedSuds: number | null
}): Promise<LogResult> {
  const { userId, missionId, outcome, predictedSuds } = args
  const mission = await getMission(missionId, userId)
  if (!mission) throw new Error('Mission not found')
  if (mission.status !== 'issued') throw new Error('This mission was already logged.')

  const predicted =
    predictedSuds == null ? null : Math.max(0, Math.min(100, Math.round(predictedSuds)))

  if (outcome === 'not_yet') {
    const recentNotYet = await recentNotYetCount(userId, missionId)
    await q(
      `update nerve.missions set status = 'skipped', predicted_suds = $2 where id = $1`,
      [missionId, predicted],
    )
    const user = await getOrCreateUser(userId)
    const result = titrate({
      level: user.level,
      outcome: 'not_yet',
      actualSuds: null,
      recentNotYet,
    })
    await setLevel(userId, result.level)
    return { status: 'skipped', needsDebrief: false, titration: result }
  }

  const status = outcome === 'did_it' ? 'did_it' : 'retreated'
  await q(`update nerve.missions set status = $2, predicted_suds = $3 where id = $1`, [
    missionId,
    status,
    predicted,
  ])
  return { status, needsDebrief: true, titration: null }
}

export interface DebriefResult {
  reflection: string
  titration: TitrationResult
  crisis: boolean
}

/** Submit the 90-second debrief, file the evidence, and titrate the next mission. */
export async function submitDebrief(args: {
  userId: string
  missionId: string
  input: DebriefInput
}): Promise<DebriefResult> {
  const { userId, missionId, input } = args
  const mission = await getMission(missionId, userId)
  if (!mission) throw new Error('Mission not found')
  if (mission.status !== 'did_it' && mission.status !== 'retreated') {
    throw new Error('This mission has no attempt to debrief.')
  }

  const validationError = validateDebrief(input)
  if (validationError) throw new Error(validationError)

  const crisis = tripsCrisisKeywords(
    `${input.predicted_catastrophe}\n${input.actual_outcome}\n${input.gap_note ?? ''}`,
  )

  const attempted = mission.status === 'did_it'

  // Handler reflection — LLM if available, otherwise a warm deterministic line.
  let reflection = fallbackReflection({
    verdict: input.fear_verdict,
    attempted,
    predictedSuds: mission.predicted_suds,
    actualSuds: input.actual_suds,
  })
  if (hasApiKey()) {
    try {
      const out = await reflectOnDebrief({
        filledAction: mission.filled_action,
        predictedSuds: mission.predicted_suds,
        actualSuds: input.actual_suds,
        predictedCatastrophe: input.predicted_catastrophe,
        actualOutcome: input.actual_outcome,
        fearHappened: input.fear_verdict,
        attempted,
      })
      if (out.reflection?.trim()) reflection = out.reflection.trim()
    } catch {
      // keep fallback
    }
  }

  // Persist the debrief. The fear verdict is packed into gap_note (the fixed
  // schema has no boolean column) alongside the handler's gap reflection.
  await q(
    `insert into nerve.debriefs
       (mission_id, actual_suds, predicted_catastrophe, actual_outcome, gap_note)
     values ($1, $2, $3, $4, $5)`,
    [
      missionId,
      input.actual_suds,
      input.predicted_catastrophe.trim(),
      input.actual_outcome.trim(),
      packGapNote(input.fear_verdict, reflection),
    ],
  )

  // Titrate now that we know the actual distress.
  const user = await getOrCreateUser(userId)
  const result = titrate({
    level: user.level,
    outcome: attempted ? 'did_it' : 'retreated',
    actualSuds: input.actual_suds,
    recentNotYet: 0,
  })
  await setLevel(userId, result.level)

  return { reflection, titration: result, crisis }
}

function fallbackReflection(args: {
  verdict: DebriefInput['fear_verdict']
  attempted: boolean
  predictedSuds: number | null
  actualSuds: number
}): string {
  const { verdict, attempted, predictedSuds, actualSuds } = args
  const lead = attempted
    ? 'You did it — that is the whole game.'
    : 'You walked up to it and pulled back. That is real exposure, and it counts.'
  const gap =
    predictedSuds != null
      ? actualSuds < predictedSuds
        ? ` You braced for ${predictedSuds} and it came in at ${actualSuds}. The fear ran hotter than the moment did.`
        : actualSuds > predictedSuds
          ? ` It ran a little harder than you expected (${actualSuds} vs ${predictedSuds}) — and you stayed in it anyway.`
          : ` You read it almost exactly (${actualSuds}). Your gut is getting calibrated.`
      : ''
  const ev =
    verdict === 'did_not_happen'
      ? ' The thing you feared did not happen. That goes in the evidence pile.'
      : verdict === 'partly'
        ? ' Some of it brushed past you, and you handled it.'
        : ' Even the part you feared showed up — and here you are, logging it.'
  return `${lead}${gap}${ev}`
}

/** Explicit "make it smaller": skip the current mission, step the level down, reissue. */
export async function shrinkAndReissue(userId: string): Promise<IssuedMission> {
  const open = await q1<MissionRow>(
    `select * from nerve.missions where user_id = $1 and status = 'issued'
     order by created_at desc limit 1`,
    [userId],
  )
  if (open) {
    await q(`update nerve.missions set status = 'skipped' where id = $1`, [open.id])
  }
  const user = await getOrCreateUser(userId)
  await setLevel(userId, shrinkLevel(user.level))
  return issueMission(userId)
}

// ── ledger ────────────────────────────────────────────────────────────

export async function getLedgerEntries(userId: string): Promise<LedgerEntry[]> {
  const missions = await q<MissionRow>(
    `select * from nerve.missions where user_id = $1 order by created_at asc`,
    [userId],
  )
  const debriefs = await q<DebriefRow>(
    `select d.* from nerve.debriefs d
       join nerve.missions m on m.id = d.mission_id
     where m.user_id = $1`,
    [userId],
  )
  const byMission = new Map(debriefs.map((d) => [d.mission_id, d]))
  return missions.map((m) => ({ mission: m, debrief: byMission.get(m.id) ?? null }))
}

export { classifyBand }
