import { z } from 'zod'

// Zod schemas mirroring the LLM-produced shapes. Kept simple (objects/strings) to
// satisfy structured-output JSON-schema limits. These validate model output BEFORE
// it touches the safety layer.

/** The LLM fills a chosen template's slots and returns one concrete, safe action. */
export const zFilledMission = z.object({
  /** the full concrete action sentence, slots resolved */
  filled_action: z.string(),
  /** one warm, steady handler line to sit under the mission */
  handler_line: z.string(),
})

/** The handler's warm reflection on the predicted-vs-actual gap, post-debrief. */
export const zDebriefReflection = z.object({
  /** 1–3 sentences, warm, names the gap, never diagnoses */
  reflection: z.string(),
})

export type FilledMissionOut = z.infer<typeof zFilledMission>
export type DebriefReflectionOut = z.infer<typeof zDebriefReflection>
