import { logOutcome } from '@/lib/missions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { anonOwner, missionId, outcome, predictedSuds } =
      (await req.json()) ?? {}
    if (!anonOwner) return Response.json({ error: 'Missing anonOwner' }, { status: 400 })
    if (!missionId) return Response.json({ error: 'Missing missionId' }, { status: 400 })
    if (
      outcome !== 'did_it' &&
      outcome !== 'retreated' &&
      outcome !== 'not_yet'
    ) {
      return Response.json({ error: 'Invalid outcome' }, { status: 400 })
    }
    const result = await logOutcome({
      userId: anonOwner,
      missionId,
      outcome,
      predictedSuds:
        predictedSuds == null || predictedSuds === ''
          ? null
          : Number(predictedSuds),
    })
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }
}
