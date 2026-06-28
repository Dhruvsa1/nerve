// NERVE domain types — the contract the whole app is built on.
// A "mission template" is a human-reviewed action skeleton with {slots}.
// The LLM only fills slots; everything passes the safety deny-list before display.

/** Latent difficulty dimensions, each 0–100. */
export interface Dims {
  intimacy: number // transactional → personal
  audience: number // 1:1 → group / spotlight
  rejection_risk: number
  performance: number
}

/** A slot the LLM fills, with a hint and a guaranteed-safe deterministic default. */
export interface SlotDef {
  hint: string
  /** used to render a safe mission when no LLM / when generation fails safety */
  safe: string
}

export type MissionCategory =
  | 'transactional'
  | 'small_talk'
  | 'compliment'
  | 'ask_for_help'
  | 'phone_call'
  | 'group'
  | 'spotlight'

export interface MissionTemplate {
  id: string
  title: string
  /** e.g. "Ask {who} {small_request} at {place}" */
  action_template: string
  dims: Dims
  /** minimum user level before this template is eligible */
  min_level: number
  /** slot name → definition */
  slots: Record<string, SlotDef>
  category: MissionCategory
  active: boolean
}

/** The once-per-user fear inventory. */
export interface Intake {
  /** overall self-rated social anxiety, 0–100 */
  baseline: number
  /** salient contexts the user wants to practice in */
  contexts: string[]
  /** optional one-line goal in the user's words */
  goal?: string
}

export interface UserRow {
  id: string
  intake: Intake | null
  level: number
  contexts: string[]
  created_at: string
  updated_at: string
}

export type MissionStatus = 'issued' | 'did_it' | 'retreated' | 'skipped'

export interface MissionRow {
  id: string
  user_id: string
  template_id: string | null
  filled_action: string
  dims: Dims
  level_at_issue: number
  predicted_suds: number | null
  status: MissionStatus
  created_at: string
}

export interface DebriefRow {
  id: string
  mission_id: string
  actual_suds: number
  predicted_catastrophe: string
  actual_outcome: string
  /** packed: "<verdict>::<gap text>" — see ledger.ts pack/unpack */
  gap_note: string | null
  created_at: string
}

/** Did the feared thing actually happen? The therapeutic payload. */
export type FearVerdict = 'did_not_happen' | 'partly' | 'happened'

/** How the user logs an outcome from the mission card. */
export type LogOutcome = 'did_it' | 'retreated' | 'not_yet'

/** A mission joined with its debrief (for the ledger). */
export interface LedgerEntry {
  mission: MissionRow
  debrief: DebriefRow | null
}
