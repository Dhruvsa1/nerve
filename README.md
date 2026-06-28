# NERVE

**One social mission at a time. The attempt is the win.** NERVE is a calm AI "handler" for practicing social courage. It hands you a single real-world social mission sized to your nerve today, you predict how hard it'll feel, go do it, and debrief — turning the scary prediction into evidence.

🔗 **Live:** https://nerve.dhruvsa1.org

> NERVE is a self-help practice tool, not therapy or medical advice. Crisis resources are one tap away from every screen.

## The problem

Exposure is the most evidence-backed way through social anxiety, and it's responsive to self-administration — *if the exercises actually get done.* But the disorder is defined by avoidance, so static challenge-lists don't get done, and "talk to an AI" practice doesn't transfer to real humans. NERVE is built around the two things that actually move the needle: right-sized difficulty and a debrief that kills the post-event spiral.

## What makes it work

- **The attempt is the win, not the outcome.** "I did it" and "Attempted & retreated" are equal-weight — walking up and pulling back is real exposure and counts. **"Make it smaller"** is always one tap away. This removes any reason to lie to the app, and the harm of manufacturing failure.
- **Safety is a P0 feature.** Missions come from human-reviewed templates; the LLM only fills slots and every result passes a hard-coded deny-list (no romance/illegal/dangerous/targeting/medical content). Crisis-keyword detection surfaces resources; nothing claims to be therapy.
- **Legible titration.** A transparent heuristic moves your difficulty toward the ~40–60 distress "just-right" band, shown as a predicted-vs-actual curve so each next mission reads as a sensible response to your own data.
- **Evidence, not rumination.** The debrief logs your predicted catastrophe vs what actually happened — over time, *"you predicted humiliation 14 times; it happened 0."*

## Stack

- **Next.js 16** (App Router, TypeScript) on **Vercel**
- **Postgres** (Supabase) via a schema-scoped role, accessed only through server routes
- **Anthropic Claude (Opus 4.8)** to fill mission templates + write the handler's reflections (always post-validated by the deny-list), with a deterministic safe fallback
- 39 passing tests (titration reducer, safety deny-list, ledger, mission selection)

## Develop

```bash
npm install
# .env.local needs DATABASE_URL (scoped Postgres role) and ANTHROPIC_API_KEY
npm run dev
npm test
node --env-file=.env.local scripts/seed.mjs   # seed mission templates + crisis resources
```

Built by [Dhruvsai Dhulipudi](https://dhruvsa1.org).
