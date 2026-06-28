import { getLedgerEntries, getUser } from '@/lib/missions'
import { summarizeLedger } from '@/lib/ledger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const owner = new URL(req.url).searchParams.get('owner') ?? ''
    if (!owner) return Response.json({ error: 'Missing owner' }, { status: 400 })
    const user = await getUser(owner)
    const entries = await getLedgerEntries(owner)
    const stats = summarizeLedger(entries, user?.level ?? 25)
    return Response.json({ stats })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
