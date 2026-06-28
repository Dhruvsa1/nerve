'use client'

/**
 * A slow 4-7-8 breathing ring for the pre-mission / "handler thinking" states.
 * Purely decorative + calming; respects prefers-reduced-motion (see globals.css).
 */
export function BreathingRing({
  size = 180,
  children,
}: {
  size?: number
  children?: React.ReactNode
}) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="breathe absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(244,167,58,0.18) 0%, rgba(244,167,58,0.04) 60%, transparent 72%)',
          border: '1px solid rgba(244,167,58,0.35)',
        }}
      />
      <span
        className="breathe absolute rounded-full"
        style={{
          inset: size * 0.18,
          border: '1px solid rgba(70,214,198,0.3)',
          animationDelay: '0.6s',
        }}
      />
      <div className="relative z-10 text-center">{children}</div>
    </div>
  )
}
