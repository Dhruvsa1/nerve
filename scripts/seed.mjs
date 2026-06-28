// Seed NERVE content: curated mission templates + crisis resources.
// Run: node --env-file=.env.local scripts/seed.mjs
import pg from 'pg'

const d = (intimacy, audience, rejection_risk, performance) => ({
  intimacy,
  audience,
  rejection_risk,
  performance,
})
const s = (hint, safe) => ({ hint, safe })

// ~20 human-reviewed templates, low → high difficulty, spanning categories.
// Every slot has a guaranteed-safe default so a mission is always renderable
// even with no LLM. dims are 0–100; min_level gates eligibility.
const TEMPLATES = [
  // ── very low (warm-ups) ──────────────────────────────────────────────
  {
    title: 'A passing greeting',
    action_template: 'Say {greeting} to {who} as you pass them {place}.',
    category: 'small_talk',
    min_level: 0,
    dims: d(5, 10, 10, 10),
    slots: {
      greeting: s('a short friendly greeting', '"good morning"'),
      who: s('any one nearby person', 'one person'),
      place: s('a low-stakes public spot', 'on the sidewalk'),
    },
  },
  {
    title: 'Out-loud thanks',
    action_template: 'Thank {who} out loud and clearly {place}.',
    category: 'compliment',
    min_level: 0,
    dims: d(10, 15, 5, 15),
    slots: {
      who: s('a service worker you interact with', 'the bus driver'),
      place: s('where you encounter them', 'as you step off the bus'),
    },
  },
  {
    title: 'A small question',
    action_template: 'Ask {who} {small_question} at {place}.',
    category: 'transactional',
    min_level: 0,
    dims: d(10, 15, 20, 10),
    slots: {
      who: s('a staff member', 'a store employee'),
      small_question: s('a simple factual question', 'where the water is'),
      place: s('an everyday errand spot', 'the grocery store'),
    },
  },
  // ── low ──────────────────────────────────────────────────────────────
  {
    title: 'Ask for a small thing',
    action_template: 'Ask {who} for {small_request} at {place}.',
    category: 'transactional',
    min_level: 10,
    dims: d(15, 20, 35, 15),
    slots: {
      who: s('a staff member', 'a barista'),
      small_request: s('a tiny, reasonable request', 'a cup of water'),
      place: s('a café or shop', 'a café'),
    },
  },
  {
    title: 'A genuine compliment to staff',
    action_template: 'Give {who} a genuine compliment about {topic} at {place}.',
    category: 'compliment',
    min_level: 12,
    dims: d(30, 20, 30, 25),
    slots: {
      who: s('a service worker', 'a cashier'),
      topic: s('something real about their work or the space', 'how welcoming the shop feels'),
      place: s('where you are', 'the front counter'),
    },
  },
  {
    title: 'One line of small talk',
    action_template: 'Make one light comment about {topic} to {who} {place}.',
    category: 'small_talk',
    min_level: 15,
    dims: d(30, 30, 40, 30),
    slots: {
      topic: s('a shared, neutral observation', 'the weather'),
      who: s('someone near you', 'a person in line'),
      place: s('a waiting situation', 'while waiting in line'),
    },
  },
  {
    title: 'Borrow something small',
    action_template: 'Ask {who} if you can borrow {item} at {place}.',
    category: 'ask_for_help',
    min_level: 18,
    dims: d(25, 30, 45, 25),
    slots: {
      who: s('a peer near you', 'a classmate'),
      item: s('a trivial object', 'a pen'),
      place: s('a class or shared space', 'before a lecture'),
    },
  },
  // ── low-mid ──────────────────────────────────────────────────────────
  {
    title: 'A quick phone call',
    action_template: 'Call {who} to ask {question}.',
    category: 'phone_call',
    min_level: 22,
    dims: d(25, 20, 45, 50),
    slots: {
      who: s('a business with public info', 'the library'),
      question: s('a simple factual question', 'what time it closes today'),
    },
  },
  {
    title: 'Ask for a recommendation',
    action_template: 'Ask {who} to recommend {thing} at {place}.',
    category: 'transactional',
    min_level: 25,
    dims: d(35, 30, 50, 35),
    slots: {
      who: s('a knowledgeable staff member', 'a barista'),
      thing: s('something in their domain', 'their favorite drink'),
      place: s('a shop or café', 'the café'),
    },
  },
  {
    title: 'Join an in-progress moment',
    action_template: 'Ask {who} {question} at {place}.',
    category: 'small_talk',
    min_level: 28,
    dims: d(40, 40, 50, 40),
    slots: {
      who: s('a peer in a shared activity', 'someone at the gym'),
      question: s('a light, relevant question', 'if a machine is free'),
      place: s('an active shared space', 'the gym'),
    },
  },
  // ── mid ──────────────────────────────────────────────────────────────
  {
    title: 'Ask a stranger for directions',
    action_template: 'Ask {who} for {help} {place}.',
    category: 'ask_for_help',
    min_level: 32,
    dims: d(40, 45, 55, 45),
    slots: {
      who: s('a passerby', 'a passerby'),
      help: s('simple directions or guidance', 'directions to the nearest station'),
      place: s('out in public', 'on a busy street'),
    },
  },
  {
    title: 'Keep a chat going',
    action_template: 'Start and extend a short chat with {who} about {topic} at {place}.',
    category: 'small_talk',
    min_level: 36,
    dims: d(50, 45, 55, 50),
    slots: {
      who: s('an acquaintance or peer', 'a coworker'),
      topic: s('an easy shared topic', 'their weekend'),
      place: s('a casual setting', 'the break room'),
    },
  },
  {
    title: 'Ask a favor of a peer',
    action_template: 'Ask {who} for {favor} {place}.',
    category: 'ask_for_help',
    min_level: 40,
    dims: d(50, 45, 60, 45),
    slots: {
      who: s('a peer', 'a classmate'),
      favor: s('a modest, reasonable favor', 'to share their notes'),
      place: s('a shared context', 'after class'),
    },
  },
  {
    title: 'Speak up in a small group',
    action_template: 'Offer {contribution} in {group} at {place}.',
    category: 'group',
    min_level: 44,
    dims: d(45, 65, 55, 60),
    slots: {
      contribution: s('one idea, question, or opinion', 'one comment or question'),
      group: s('a small group setting', 'a small meeting'),
      place: s('where the group meets', 'at work'),
    },
  },
  // ── mid-high ─────────────────────────────────────────────────────────
  {
    title: 'Make a request that might be declined',
    action_template: 'Ask {who} for {ask} at {place}, knowing they might say no.',
    category: 'transactional',
    min_level: 48,
    dims: d(45, 50, 75, 45),
    slots: {
      who: s('a staff member with discretion', 'a café manager'),
      ask: s('a polite request that could be refused', 'to refill your water bottle'),
      place: s('a shop or café', 'the café'),
    },
  },
  {
    title: 'Introduce yourself to someone new',
    action_template: 'Introduce yourself to {who} and ask {question} at {place}.',
    category: 'small_talk',
    min_level: 52,
    dims: d(60, 55, 65, 60),
    slots: {
      who: s('a new peer', 'someone new in your class'),
      question: s('a friendly opener', 'how they are finding it'),
      place: s('a social or class setting', 'before class starts'),
    },
  },
  {
    title: 'Make a call that requires back-and-forth',
    action_template: 'Call {who} to {task}.',
    category: 'phone_call',
    min_level: 56,
    dims: d(45, 40, 70, 70),
    slots: {
      who: s('a business or office', 'a local clinic or office'),
      task: s('a multi-step but routine task', 'book or reschedule an appointment'),
    },
  },
  {
    title: 'Invite someone to something',
    action_template: 'Invite {who} to {activity} {place}.',
    category: 'small_talk',
    min_level: 60,
    dims: d(70, 50, 80, 55),
    slots: {
      who: s('an acquaintance', 'a coworker'),
      activity: s('a low-key, public activity', 'grab coffee sometime'),
      place: s('a casual context', 'after a meeting'),
    },
  },
  // ── high (mild spotlight) ────────────────────────────────────────────
  {
    title: 'Ask a question in a larger room',
    action_template: 'Ask {question} out loud in {setting} at {place}.',
    category: 'spotlight',
    min_level: 66,
    dims: d(50, 85, 70, 75),
    slots: {
      question: s('a genuine, relevant question', 'a clarifying question'),
      setting: s('a larger audience setting', 'a lecture or town hall'),
      place: s('where it is held', 'on campus'),
    },
  },
  {
    title: 'Voice a different opinion in a group',
    action_template: 'Respectfully share {opinion} in {group} at {place}.',
    category: 'group',
    min_level: 72,
    dims: d(60, 75, 85, 70),
    slots: {
      opinion: s('a calm, differing viewpoint', 'a different point of view'),
      group: s('a group discussion', 'a group discussion'),
      place: s('the setting', 'at work or in class'),
    },
  },
  {
    title: 'Give a brief toast or thanks aloud',
    action_template: 'Stand and say {words} to {audience} at {place}.',
    category: 'spotlight',
    min_level: 80,
    dims: d(65, 95, 75, 90),
    slots: {
      words: s('a short, warm few sentences', 'a brief thank-you'),
      audience: s('a gathered group', 'a small gathering'),
      place: s('a fitting occasion', 'a group dinner or meeting'),
    },
  },
]

const CRISIS = [
  {
    label: '988 Suicide & Crisis Lifeline',
    contact: 'Call or text 988',
    url: 'https://988lifeline.org',
    region: 'US',
    sort_order: 1,
  },
  {
    label: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    url: 'https://www.crisistextline.org',
    region: 'US',
    sort_order: 2,
  },
  {
    label: 'Veterans Crisis Line',
    contact: 'Dial 988 then press 1',
    url: 'https://www.veteranscrisisline.net',
    region: 'US',
    sort_order: 3,
  },
  {
    label: 'Find A Helpline (international)',
    contact: 'Free, confidential lines worldwide',
    url: 'https://findahelpline.com',
    region: 'Global',
    sort_order: 4,
  },
]

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})
await client.connect()

// Refresh templates: dedupe by title so re-running is idempotent.
const titles = TEMPLATES.map((t) => t.title)
await client.query(`delete from nerve.mission_templates where title = any($1::text[])`, [titles])
for (const t of TEMPLATES) {
  await client.query(
    `insert into nerve.mission_templates
       (title, action_template, dims, min_level, slots, category, active)
     values ($1,$2,$3,$4,$5,$6,true)`,
    [
      t.title,
      t.action_template,
      JSON.stringify(t.dims),
      t.min_level,
      JSON.stringify(t.slots),
      t.category,
    ],
  )
}
console.log(`seeded ${TEMPLATES.length} mission templates`)

const labels = CRISIS.map((c) => c.label)
await client.query(`delete from nerve.crisis_resources where label = any($1::text[])`, [labels])
for (const c of CRISIS) {
  await client.query(
    `insert into nerve.crisis_resources (label, contact, url, region, sort_order)
     values ($1,$2,$3,$4,$5)`,
    [c.label, c.contact, c.url, c.region, c.sort_order],
  )
}
console.log(`seeded ${CRISIS.length} crisis resources`)

await client.end()
console.log('done')
