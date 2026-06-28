import { describe, it, expect } from 'vitest'
import { checkMission, tripsCrisisKeywords } from '../safety'

// A battery of mission strings a slot-filling LLM might erroneously produce.
const BAD: Array<{ text: string; category: string }> = [
  { text: 'Ask the cute girl at the bar out on a date.', category: 'sexual_romantic' },
  { text: 'Get their number so you can flirt later.', category: 'sexual_romantic' },
  { text: 'Try to make out with someone at the party.', category: 'sexual_romantic' },
  { text: 'Go compliment a child at the playground.', category: 'minors' },
  { text: 'Ask a teenager at the high school for directions.', category: 'minors' },
  { text: 'Shoplift a candy bar and chat with the cashier.', category: 'illegal_dangerous' },
  { text: 'Trespass into the staff-only area and ask a question.', category: 'illegal_dangerous' },
  { text: 'Threaten the barista if they get your order wrong.', category: 'illegal_dangerous' },
  { text: 'Follow them home to keep the conversation going.', category: 'harassment' },
  { text: 'Keep bothering a stranger until they give you attention.', category: 'harassment' },
  { text: 'Ask a stranger which antidepressant they take.', category: 'medical_substance' },
  { text: 'Buy a beer and chat up the bartender.', category: 'medical_substance' },
  { text: 'Tell a stranger you want to hurt yourself.', category: 'self_harm' },
  { text: 'Go up to your ex and demand they talk to you.', category: 'targeting_individual' },
]

const GOOD: string[] = [
  'Ask a barista to recommend a drink at the café.',
  'Compliment the front-desk staff on how organized the lobby looks.',
  'Ask a classmate if you can borrow a pen before lecture.',
  'Call the library to ask what time it closes today.',
  'Say good morning to one person on your walk to campus.',
  'Ask a store employee where the oat milk is.',
  'Thank your bus driver out loud as you step off.',
  'Ask someone at the gym if a machine is free.',
]

describe('checkMission deny-list', () => {
  it('rejects every unsafe mission and tags the right category', () => {
    for (const b of BAD) {
      const r = checkMission(b.text)
      expect(r.ok, `should reject: ${b.text}`).toBe(false)
      expect(r.category, `category for: ${b.text}`).toBe(b.category)
    }
  })

  it('passes benign, doable missions', () => {
    for (const g of GOOD) {
      const r = checkMission(g)
      expect(r.ok, `should pass: ${g} (got ${r.reason})`).toBe(true)
      expect(r.category).toBeNull()
    }
  })

  it('rejects empty input', () => {
    expect(checkMission('').ok).toBe(false)
    expect(checkMission('   ').ok).toBe(false)
  })
})

describe('tripsCrisisKeywords', () => {
  it('detects self-harm / crisis language', () => {
    const hits = [
      'I keep thinking about killing myself.',
      'Honestly I want to die after that.',
      'There is no reason to live anymore.',
      'Everyone would be better off without me.',
      'I keep cutting myself when it gets bad.',
    ]
    for (const h of hits) expect(tripsCrisisKeywords(h), h).toBe(true)
  })

  it('does NOT fire on ordinary anxious debriefs', () => {
    const ok = [
      'I was terrified they would laugh at me.',
      'My heart was pounding but I asked anyway.',
      'I felt like dying of embarrassment but it was fine.',
      'It went better than I expected.',
    ]
    for (const o of ok) expect(tripsCrisisKeywords(o), o).toBe(false)
  })
})
