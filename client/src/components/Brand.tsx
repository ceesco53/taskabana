import React from 'react'

type Props = {
  size?: number // height in px
  showWordmark?: boolean
}

export default function Brand({ size = 28, showWordmark = true }: Props) {
  // Icon is a transparent SVG; all colors come from CSS variables
  return (
    <div className="brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg
        width={size * (36 / 28)}
        height={size}
        viewBox="0 0 36 28"
        role="img"
        aria-label="Taskabana logo"
        style={{ display: 'block' }}
      >
        {/* two kanban cards */}
        <g fill="var(--brand-ink)" fillOpacity="var(--brand-ink-alpha)">
          <rect x="1" y="2" width="12" height="24" rx="4" />
          <rect x="15" y="2" width="12" height="24" rx="4" />
          {/* card slots (cutouts) */}
          <rect x="5" y="6.5" width="4" height="2.6" rx="1.3" fill="var(--brand-slot)" />
          <rect x="19" y="6.5" width="4" height="2.6" rx="1.3" fill="var(--brand-slot)" />
          <rect x="5" y="12.7" width="4" height="2.6" rx="1.3" fill="var(--brand-slot)" />
          <rect x="19" y="12.7" width="4" height="2.6" rx="1.3" fill="var(--brand-slot)" />
          <rect x="5" y="18.9" width="4" height="2.6" rx="1.3" fill="var(--brand-slot)" />
          <rect x="19" y="18.9" width="4" height="2.6" rx="1.3" fill="var(--brand-slot)" />
        </g>

        {/* check token overlapping the cards */}
        <g transform="translate(22,16)">
          <circle r="9" cx="9" cy="9" fill="var(--brand-accent)" fillOpacity="var(--brand-accent-alpha)" />
          <path
            d="M5.2 9.2l2.6 2.6 5.8-6.2"
            fill="none"
            stroke="var(--brand-check)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      {showWordmark && (
        <strong className="brand-wordmark" style={{ fontSize: 18, lineHeight: 1 }}>
          Taskabana
        </strong>
      )}
    </div>
  )
}