import { shrinkAndReissue } from '@/lib/missions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { anonOwner } = (await req.json()) ?? {}
    if (!anonOwner) return Response.json({ error: 'Missing anonOwner' }, { status: 400 })
    const { mission, handler_line } = await shrinkAndReissue(anonOwner)
    return Response.json({ mission, handler_line })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }
}
