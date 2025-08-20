import React from 'react'

type Props = {
  open: boolean
  onClose?: () => void
}

export default function AuthGateModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Authentication required"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        zIndex: 9999,
        // glassy backdrop
        background: 'color-mix(in oklab, var(--backdrop, rgba(0,0,0,0.45)) 85%, transparent)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 92vw)',
          borderRadius: 16,
          background: 'color-mix(in oklab, var(--panel) 92%, transparent)',
          boxShadow: '0 10px 30px rgba(0,0,0,.35)',
          border: '1px solid var(--border)',
          padding: 20,
          color: 'var(--fg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🔒</span>
          <h2 style={{ margin: 0 }}>You’re not signed in</h2>
        </div>
        <p style={{ marginTop: 8, lineHeight: 1.4, color: 'var(--muted)' }}>
          Your Google session looks inactive, unreachable, or you have not yet signed in. Please sign in to continue.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          {onClose && (
            <button
              onClick={onClose}
              className="btn"
              style={{ padding: '8px 12px', borderRadius: 10 }}
            >
              Dismiss
            </button>
          )}
          <a
            href="/auth/login"
            className="btn primary"
            style={{ padding: '8px 12px', borderRadius: 10, textDecoration: 'none' }}
          >
            Log in with Google
          </a>
        </div>
      </div>
    </div>
  )
}