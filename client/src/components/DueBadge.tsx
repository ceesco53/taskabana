import React from 'react'

export default function DueBadge({ iso }: { iso?: string }) {
  if (!iso) return null
  const d = new Date(iso), now = new Date()
  const days = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
  let bg = 'var(--card)', fg = 'var(--fg)'
  if (days < 0) { bg = '#ffebee'; fg = '#b00020' }       // overdue
  else if (days === 0) { bg = '#fff8e1'; fg = '#a15c00' } // today
  else if (days <= 3) { bg = '#fff3e0'; fg = '#a15c00' }  // soon
  return <span className="badge" style={{ background: bg, color: fg }}>{days < 0 ? 'Overdue' : days === 0 ? 'Today' : `In ${days}d`}</span>
}