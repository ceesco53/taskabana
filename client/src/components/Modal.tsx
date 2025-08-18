import React from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}

export default function Modal({ open, title, onClose, children, footer, width = 560 }: ModalProps) {
  const overlayRef = React.useRef<HTMLDivElement | null>(null)
  const panelRef = React.useRef<HTMLDivElement | null>(null)

  // Lock background scroll + basic focus trap
  React.useEffect(() => {
    if (!open) return
    const root = document.documentElement
    root.classList.add('modal-open')

    // focus the panel
    const prevActive = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panelRef.current) {
        // tiny focus trap: keep tab within the modal
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href],button,textarea,input,select,[tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement
        if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
        if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      root.classList.remove('modal-open')
      prevActive?.focus?.()
    }
  }, [open, onClose])

  // Prevent scroll chaining to page (wheel/touch) when pointer is over the overlay
  const stopScrollChain = (e: React.WheelEvent | React.TouchEvent) => {
    // If the event started on the overlay (outside the panel), swallow it
    if (e.target === overlayRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="modal-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      onWheelCapture={stopScrollChain as any}
      onTouchMoveCapture={stopScrollChain as any}
    >
      <div
        ref={panelRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width }}
        tabIndex={-1}
      >
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}