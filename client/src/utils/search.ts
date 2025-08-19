// Lightweight search + quick-filters for Taskabana

export type GTaskLike = {
  id: string
  title?: string | null
  notes?: string | null // HTML from Quill
  due?: string | null   // ISO
  status?: 'needsAction' | 'completed'
}

export type ParsedQuery = {
  text: string[]              // free text terms
  tags: string[]              // tag:xyz or tag:#xyz
  dueToday?: boolean          // due:today
  dueTomorrow?: boolean       // due:tomorrow
  dueThisWeek?: boolean       // due:week
  overdue?: boolean           // overdue
  onlyCompleted?: boolean     // status:completed
  excludeCompleted?: boolean  // -status:completed
}

export function parseQuery(q: string): ParsedQuery {
  const parts = (q || '').trim().split(/\s+/).filter(Boolean)
  const out: ParsedQuery = { text: [], tags: [] }

  for (const p of parts) {
    const low = p.toLowerCase()

    if (low.startsWith('tag:')) {
      let tag = low.slice(4)
      if (tag.startsWith('#')) tag = tag.slice(1)
      if (tag) out.tags.push(tag)
      continue
    }
    if (low === 'due:today') { out.dueToday = true; continue }
    if (low === 'due:tomorrow') { out.dueTomorrow = true; continue }
    if (low === 'due:week') { out.dueThisWeek = true; continue }
    if (low === 'overdue' || low === 'due:overdue') { out.overdue = true; continue }

    if (low === 'status:completed') { out.onlyCompleted = true; continue }
    if (low === '-status:completed' || low === '!completed') { out.excludeCompleted = true; continue }

    out.text.push(p)
  }
  return out
}

function htmlToText(html?: string | null): string {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || '').trim()
}

function firstParagraphText(html?: string | null): string {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  const p = div.querySelector('p')
  return (p?.textContent || '').trim().toLowerCase()
}

function normalizeTagFromNotes(notes?: string | null): string | null {
  const first = firstParagraphText(notes)
  if (first.startsWith('#')) return first.slice(1)
  return null
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate()
}

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = x.getDay() // 0 Sun .. 6 Sat
  x.setHours(0,0,0,0)
  x.setDate(x.getDate() - day) // Sunday start
  return x
}

export function buildPredicate(q: ParsedQuery) {
  const now = new Date()
  const sow = startOfWeek(now)
  return (t: GTaskLike) => {
    // status filters
    if (q.onlyCompleted && t.status !== 'completed') return false
    if (q.excludeCompleted && t.status === 'completed') return false

    // due filters
    if (q.dueToday || q.dueTomorrow || q.dueThisWeek || q.overdue) {
      if (!t.due) return false
      const due = new Date(t.due)
      if (Number.isNaN(due.getTime())) return false

      if (q.dueToday && !sameDay(due, now)) return false
      if (q.dueTomorrow) {
        const tm = new Date(now); tm.setDate(now.getDate()+1)
        if (!sameDay(due, tm)) return false
      }
      if (q.dueThisWeek) {
        const end = new Date(sow); end.setDate(sow.getDate()+7)
        if (!(due >= sow && due < end)) return false
      }
      if (q.overdue && !(due < new Date() && t.status !== 'completed')) return false
    }

    // tag filters
    if (q.tags.length > 0) {
      const tag = normalizeTagFromNotes(t.notes) // ex: "icebucket"
      if (!tag) return false
      const ok = q.tags.some(w => w === tag)
      if (!ok) return false
    }

    // free text terms: match in title or notes text
    if (q.text.length > 0) {
      const hay = (t.title || '') + ' ' + htmlToText(t.notes)
      const H = hay.toLowerCase()
      for (const term of q.text) {
        if (!H.includes(term.toLowerCase())) return false
      }
    }
    return true
  }
}

/** Convenience: filter tasks in one call */
export function filterTasks<T extends GTaskLike>(tasks: T[], query: string): T[] {
  const pq = parseQuery(query)
  const pred = buildPredicate(pq)
  return tasks.filter(pred)
}