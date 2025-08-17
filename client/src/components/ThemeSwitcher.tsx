import React, { useEffect, useState } from 'react'

const key = 'kanban-theme'

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>(localStorage.getItem(key) || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(key, theme)
  }, [theme])

  return (
    <div className="select">
      <label htmlFor="theme">Theme:</label>
      <select id="theme" value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="high-contrast">High Contrast</option>
      </select>
    </div>
  )
}
