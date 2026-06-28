import { generateJSON } from './anthropic'
import { zFilledMission, zDebriefReflection } from './schemas'
import type { FilledMissionOut, DebriefReflectionOut } from './schemas'
import type { Intake, MissionTemplate } from './types'

/**
 * The LLM's ONLY job is to fill a chosen template's slots with the user's context
 * and to write the handler's warm lines. It never invents a mission. Every output
 * here is post-validated by safety.ts in the data layer before display.
 */

const HANDLER_VOICE = `You are NERVE — a calm, warm "handler" guiding someone through real-world
social-courage practice. You speak in steady, second-person voice, like a wise presence in
their ear. Brief. No hype, no therapy-speak, no diagnosing. The attempt is always the win.`

export async function fillMission(args: {
  template: MissionTemplate
  intake: Intake | null
  level: number
}): Promise<FilledMissionOut> {
  const { template, intake, level } = args
  const slotList = Object.entries(template.slots)
    .map(([name, def]) => `  - {${name}}: ${def.hint} (safe example: "${def.safe}")`)
    .join('\n')

  const system = `${HANDLER_VOICE}

You are given a HUMAN-REVIEWED mission template and must fill its slots to produce ONE
concrete, doable, real-world social action. HARD RULES:
- Only fill the named slots. Do NOT change the shape of the action or add new asks.
- Keep it utterly benign, legal, and doable by anyone today: transactional asks, small talk,
  genuine compliments to staff, asking for simple help, brief calls, low-key group moments.
- NEVER produce anything romantic/sexual, anything involving minors, anything illegal or
  dangerous, harassment, medical/substance content, or targeting a specific named person.
- Address roles, not names ("a barista", "a classmate", "the front-desk staff").
- Match the user's salient contexts when natural. Keep the action to one clear sentence.`

  const ctx = intake
    ? `User contexts: ${intake.contexts.join(', ') || 'none given'}. ${
        intake.goal ? `Their goal: "${intake.goal}".` : ''
      } Baseline anxiety ~${intake.baseline}/100.`
    : 'No intake yet; keep it general and easy.'

  const prompt = `MISSION TEMPLATE
title: ${template.title}
category: ${template.category}
action_template: ${template.action_template}
slots:
${slotList}

USER
current difficulty level: ${level}/100
${ctx}

Fill the slots to produce "filled_action" (one concrete sentence) plus a "handler_line"
(one warm sentence of encouragement that fits this exact mission).`

  return generateJSON<FilledMissionOut>({
    schema: zFilledMission,
    system,
    prompt,
    maxTokens: 1200,
    effort: 'low',
    thinking: false,
  })
}

export async function reflectOnDebrief(args: {
  filledAction: string
  predictedSuds: number | null
  actualSuds: number
  predictedCatastrophe: string
  actualOutcome: string
  fearHappened: 'did_not_happen' | 'partly' | 'happened'
  attempted: boolean
}): Promise<DebriefReflectionOut> {
  const system = `${HANDLER_VOICE}

Write ONE short reflection (1–3 sentences) that mirrors the gap between what the user
PREDICTED would happen and what ACTUALLY happened. Be warm and specific. If they retreated,
honor it as real exposure. Name the prediction error plainly when it exists ("you braced for
X; what showed up was Y"). Never diagnose, never give medical advice, never promise outcomes.`

  const prompt = `MISSION: ${args.filledAction}
Predicted distress (SUDS): ${args.predictedSuds ?? 'not set'} / Actual distress: ${args.actualSuds}
They ${args.attempted ? 'attempted it' : 'did not attempt it'}.
Predicted catastrophe: "${args.predictedCatastrophe}"
What actually happened: "${args.actualOutcome}"
Did the feared thing happen? ${args.fearHappened.replace(/_/g, ' ')}

Write the reflection.`

  return generateJSON<DebriefReflectionOut>({
    schema: zDebriefReflection,
    system,
    prompt,
    maxTokens: 800,
    effort: 'low',
    thinking: false,
  })
}
