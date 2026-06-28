/**
 * SAFETY — a P0 feature, not polish.
 *
 * Missions come from human-reviewed templates; the LLM only fills slots. EVERY
 * generated mission string passes through `checkMission` before it can be shown.
 * The deny-list is hard-coded (regex + category) so a model slip can never put an
 * unsafe ask in front of a user. We also detect self-harm language in free text
 * (debriefs) so we can surface crisis resources — never to diagnose.
 */

export type DenyCategory =
  | 'sexual_romantic'
  | 'minors'
  | 'illegal_dangerous'
  | 'harassment'
  | 'medical_substance'
  | 'self_harm'
  | 'targeting_individual'

export interface SafetyResult {
  ok: boolean
  category: DenyCategory | null
  reason: string | null
}

interface Rule {
  category: DenyCategory
  pattern: RegExp
  reason: string
}

// Word-ish boundaries; case-insensitive. Kept deliberately broad — false positives
// are acceptable (we just regenerate / fall back), unsafe pass-throughs are not.
const RULES: Rule[] = [
  // ── romance / sexual ────────────────────────────────────────────────
  {
    category: 'sexual_romantic',
    pattern:
      /\b(ask(?:ing)?\s+(?:\w+\s+){0,3}out|on a date|out on a date|flirt\w*|hook ?up|hit on|romantic\w*|sexy?|sexual\w*|seduce|kiss\w*|make out|one[- ]night|get (?:their|her|his|your) number|phone number for a date|pick ?up line|cute (?:guy|girl)|attractive (?:guy|girl|stranger)|date them)\b/i,
    reason: 'No romantic or sexual asks.',
  },
  // ── minors ──────────────────────────────────────────────────────────
  {
    category: 'minors',
    pattern:
      /\b(minor|minors|child|children|kid|kids|toddler|infant|baby|babies|underage|teenager|teenagers|teen|teens|schoolchild|preteen|pre[- ]?teen|year[- ]?old|elementary school (?:kid|student)|middle school|high ?school (?:kid|student)|playground)\b/i,
    reason: 'Missions may never involve minors.',
  },
  // ── illegal / dangerous ─────────────────────────────────────────────
  {
    category: 'illegal_dangerous',
    pattern:
      /\b(steal|stole|stealing|shoplift\w*|theft|rob\b|robbing|trespass\w*|break in|breaking in|vandal\w*|graffiti|weapon|gun|knife|fight\b|fighting|punch|assault|threaten\w*|blackmail|bribe|smuggle|jaywalk|run a red|drive drunk|sneak into|climb over the fence|fare evade|fare-evade|dine and dash)\b/i,
    reason: 'No illegal or dangerous acts.',
  },
  // ── harassment / coercion ───────────────────────────────────────────
  {
    category: 'harassment',
    pattern:
      /\b(harass\w*|stalk\w*|follow (?:them|her|him|someone) (?:home|around)|insult\w*|mock\w*|demean\w*|humiliate\w*|belittle\w*|intimidat\w*|yell at|scream at|prank\w*|catcall\w*|corner (?:them|someone)|won't take no|refuse to leave (?:them|someone) alone|keep bothering)\b/i,
    reason: 'No harassment or coercion.',
  },
  // ── medical / substance ─────────────────────────────────────────────
  {
    category: 'medical_substance',
    pattern:
      /\b(medication|medicine|prescription|pill|pills|dose|dosage|diagnos\w*|symptom\w*|therapist|antidepressant|alcohol\w*|drink (?:a beer|booze|shots?)|beer|liquor|drunk|wasted|weed|marijuana|cannabis|vape|vaping|cigarette\w*|smoke a|nicotine|drug\b|drugs\b|get high)\b/i,
    reason: 'No medical, alcohol, or substance content.',
  },
  // ── self-harm in a mission (should never happen) ────────────────────
  {
    category: 'self_harm',
    pattern:
      /\b(self[- ]?harm|hurt yourself|harm yourself|kill yourself|end your life|cut yourself)\b/i,
    reason: 'Self-harm content is never permitted.',
  },
  // ── targeting a specific named individual ───────────────────────────
  {
    category: 'targeting_individual',
    pattern:
      /\b(your (?:ex|crush|enemy|landlord|neighbor)\b|named (?:[A-Z][a-z]+)|specifically (?:[A-Z][a-z]+)|go up to (?:[A-Z][a-z]+ ){1,2}(?:and|to))\b/,
    reason: 'Missions target roles (a barista, a classmate), never named individuals.',
  },
]

/** Validate a generated/filled mission string. Returns the FIRST tripped rule. */
export function checkMission(text: string): SafetyResult {
  const t = (text ?? '').trim()
  if (!t) {
    return { ok: false, category: null, reason: 'Empty mission.' }
  }
  for (const rule of RULES) {
    if (rule.pattern.test(t)) {
      return { ok: false, category: rule.category, reason: rule.reason }
    }
  }
  return { ok: true, category: null, reason: null }
}

// ── crisis / self-harm detection in free-text debriefs ────────────────
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(?:ing)? myself\b/i,
  /\b(?:want|going|plan) to die\b/i,
  /\bend(?:ing)? (?:it all|my life)\b/i,
  /\bsuicid\w*/i,
  /\bself[- ]?harm\w*/i,
  /\b(?:hurt(?:ing)?|harm(?:ing)?|cut(?:ting)?) myself\b/i,
  /\bno reason to (?:live|go on)\b/i,
  /\b(?:better off|everyone'?s better) (?:dead|without me)\b/i,
  /\bdon'?t want to (?:be here|live|exist) (?:anymore|any more)\b/i,
  /\bcan'?t go on\b/i,
]

/**
 * True if free text (e.g. a debrief) contains self-harm / crisis language.
 * The app reacts by surfacing crisis resources — it never diagnoses.
 */
export function tripsCrisisKeywords(text: string): boolean {
  const t = text ?? ''
  return CRISIS_PATTERNS.some((p) => p.test(t))
}
