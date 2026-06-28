'use client'

/**
 * A 0–100 SUDS (Subjective Units of Distress) slider. `tone` picks the accent:
 * amber = a prediction (what you brace for), teal = the actual (what happened).
 * Shows the target activation band (40–60) so the scale reads as legible.
 */
export function SudsSlider({
  value,
  onChange,
  tone = 'amber',
  label,
  id,
}: {
  value: number
  onChange: (v: number) => void
  tone?: 'amber' | 'teal'
  label: string
  id: string
}) {
  const accent = tone === 'amber' ? 'var(--amber)' : 'var(--teal)'
  const descriptor =
    value < 20
      ? 'barely a flicker'
      : value < 40
        ? 'noticeable nerves'
        : value <= 60
          ? 'real challenge'
          : value < 80
            ? 'quite hard'
            : 'near my limit'

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm text-text-soft">
          {label}
        </label>
        <span className="tnum text-3xl leading-none" style={{ color: accent }}>
          {value}
        </span>
      </div>

      <div className="relative mt-3">
        {/* target band marker (40–60) */}
        <div
          className="pointer-events-none absolute top-1/2 h-3 -translate-y-1/2 rounded-sm"
          style={{
            left: '40%',
            width: '20%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px dashed rgba(231,234,243,0.18)',
          }}
        />
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="nerve-range relative w-full"
          style={{ accentColor: accent, color: accent }}
          aria-valuetext={`${value} of 100, ${descriptor}`}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] text-text-faint">
        <span>0 · calm</span>
        <span style={{ color: accent }}>{descriptor}</span>
        <span>100 · panic</span>
      </div>
    </div>
  )
}
