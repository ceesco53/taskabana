import React from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = 'Search…  (e.g. tag:#icebucket due:today overdue)' }: Props) {
  return (
    <div className="searchbar" style={{ display:'flex', alignItems:'center', gap:8 }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search tasks"
        style={{
          minWidth: 280,
          padding: '8px 10px',
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'var(--panel)',
          color: 'var(--fg)',
          outline: 'none'
        }}
      />
    </div>
  )
}