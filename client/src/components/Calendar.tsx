import React, { useMemo, useState } from 'react'

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0) }

export default function Calendar({ value, onChange }: { value?: string, onChange: (ymd: string) => void }) {
  const initial = value ? new Date(value) : new Date()
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1))

  const weeks = useMemo(() => {
    const first = startOfMonth(cursor)
    const last = endOfMonth(cursor)
    const start = new Date(first)
    start.setDate(first.getDate() - ((first.getDay()+6)%7)) // Monday=0
    const days: Date[] = []
    for (let d = new Date(start); d <= last || d.getDay() !== 1; d.setDate(d.getDate()+1)) {
      days.push(new Date(d))
      if (days.length > 41) break
    }
    const w: Date[][] = []
    for (let i=0;i<days.length;i+=7) w.push(days.slice(i,i+7))
    return w
  }, [cursor])

  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const isSameDay = (a?: string, d?: Date) => (a && d) ? a === ymd(d) : false

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 8, background: 'var(--bg)', color: 'var(--fg)', width: 260 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1))}>{'<'}</button>
        <div style={{ fontWeight: 600 }}>{cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1))}>{'>'}</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 12, marginBottom: 4 }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} style={{ textAlign: 'center', color: 'var(--muted)' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {weeks.map((week,i) => week.map((d,j) => {
          const inMonth = d.getMonth() === cursor.getMonth()
          const selected = isSameDay(value, d)
          return (
            <button
              key={`${i}-${j}`}
              onClick={() => onChange(ymd(d))}
              style={{
                padding: '6px 0', border: '1px solid var(--border)', borderRadius: 8,
                opacity: inMonth ? 1 : 0.5,
                fontWeight: selected ? 700 : 400
              }}
            >
              {d.getDate()}
            </button>
          )
        }))}
      </div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => onChange('')}>Clear</button>
        <button onClick={() => onChange(ymd(new Date()))}>Today</button>
      </div>
    </div>
  )
}
