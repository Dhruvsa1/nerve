import { getOrCreateUser, getUser, saveIntake } from '@/lib/missions'
import type { Intake } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clampNum(n: unknown, lo: number, hi: number, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (Number.isNaN(v)) return fallback
  return Math.max(lo, Math.min(hi, Math.round(v)))
}

export async function GET(req: Request) {
  try {
    const owner = new URL(req.url).searchParams.get('owner') ?? ''
    if (!owner) return Response.json({ error: 'Missing owner' }, { status: 400 })
    const user = await getUser(owner)
    if (!user) return Response.json({ user: null })
    return Response.json({
      user: {
        id: user.id,
        level: user.level,
        contexts: user.contexts,
        hasIntake: user.intake != null,
        intake: user.intake,
      },
    })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) ?? {}
    const { anonOwner, intake } = body
    if (!anonOwner || typeof anonOwner !== 'string') {
      return Response.json({ error: 'Missing anonOwner' }, { status: 400 })
    }
    if (!intake || typeof intake !== 'object') {
      await getOrCreateUser(anonOwner)
      return Response.json({ ok: true })
    }
    const clean: Intake = {
      baseline: clampNum(intake.baseline, 0, 100, 50),
      contexts: Array.isArray(intake.contexts)
        ? intake.contexts.filter((c: unknown) => typeof c === 'string').slice(0, 12)
        : [],
      goal:
        typeof intake.goal === 'string' && intake.goal.trim()
          ? intake.goal.trim().slice(0, 280)
          : undefined,
    }
    const user = await saveIntake(anonOwner, clean)
    return Response.json({ ok: true, level: user.level })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }
}
