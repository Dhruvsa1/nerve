import { getOrIssueMission } from '@/lib/missions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  try {
    const owner = new URL(req.url).searchParams.get('owner') ?? ''
    if (!owner) return Response.json({ error: 'Missing owner' }, { status: 400 })
    const { mission, handler_line } = await getOrIssueMission(owner)
    return Response.json({ mission, handler_line })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }
}
