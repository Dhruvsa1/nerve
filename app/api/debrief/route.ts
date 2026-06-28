import { submitDebrief } from '@/lib/missions'
import type { FearVerdict } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VERDICTS: FearVerdict[] = ['did_not_happen', 'partly', 'happened']

export async function POST(req: Request) {
  try {
    const body = (await req.json()) ?? {}
    const { anonOwner, missionId } = body
    if (!anonOwner) return Response.json({ error: 'Missing anonOwner' }, { status: 400 })
    if (!missionId) return Response.json({ error: 'Missing missionId' }, { status: 400 })

    const verdict: FearVerdict = VERDICTS.includes(body.fear_verdict)
      ? body.fear_verdict
      : 'partly'

    const result = await submitDebrief({
      userId: anonOwner,
      missionId,
      input: {
        actual_suds: Number(body.actual_suds),
        predicted_catastrophe: String(body.predicted_catastrophe ?? ''),
        actual_outcome: String(body.actual_outcome ?? ''),
        fear_verdict: verdict,
        gap_note:
          typeof body.gap_note === 'string' ? body.gap_note : undefined,
      },
    })
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }
}
