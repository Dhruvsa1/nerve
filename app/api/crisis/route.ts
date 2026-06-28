import { getCrisisResources } from '@/lib/crisis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const resources = await getCrisisResources()
    return Response.json({ resources })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
