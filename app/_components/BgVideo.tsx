'use client'

import { useEffect, useState } from 'react'

/**
 * The living aurora background. A fixed, full-viewport video drifts behind all
 * content; a dark gradient overlay + film grain keep text legible. The still
 * (aurora.jpg) is always painted underneath as the base layer, and is the sole
 * fallback when prefers-reduced-motion is set or on small screens (where the
 * video is never mounted, to save bandwidth and battery).
 */
export function BgVideo() {
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const big = window.matchMedia('(min-width: 641px)')
    const decide = () => setShowVideo(!reduce.matches && big.matches)
    decide()
    reduce.addEventListener('change', decide)
    big.addEventListener('change', decide)
    return () => {
      reduce.removeEventListener('change', decide)
      big.removeEventListener('change', decide)
    }
  }, [])

  return (
    <div className="aurora-bg" aria-hidden="true">
      {/* always-present still: base layer + reduced-motion / small-screen fallback */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/art/aurora.jpg" alt="" className="aurora-still" />

      {showVideo && (
        <video
          className="aurora-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/art/aurora.jpg"
        >
          <source src="/art/aurora.mp4" type="video/mp4" />
        </video>
      )}

      {/* legibility overlay + vignette, then film grain on top */}
      <div className="aurora-veil" />
      <div className="aurora-grain" />
    </div>
  )
}
