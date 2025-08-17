import React from 'react'

export default function QuickAdd({ placeholder, onAdd }: { placeholder: string, onAdd: (title: string) => void }) {
  const [v, setV] = React.useState('')
  function submit() {
    const t = v.trim()
    if (!t) return
    onAdd(t)
    setV('')
  }
  return (
    <div style={{display:'flex', gap:8, marginBottom:8}}>
      <input
        value={v}
        onChange={e => setV(e.target.value)}
        placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        style={{flex:1, border:'1px solid var(--border)', borderRadius:10, padding:'8px 10px', background:'var(--bg)', color:'var(--fg)'}}
      />
      <button className="btn primary" onClick={submit}>Add</button>
    </div>
  )
}