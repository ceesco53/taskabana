export function toDateInputValue(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  // convert to YYYY-MM-DD in local tz
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateInputValue(v: string): string | undefined {
  if (!v) return undefined
  // set to noon UTC to avoid tz off-by-one
  return `${v}T12:00:00.000Z`
}
