import React, { useEffect, useMemo, useState } from 'react'
import KanbanColumn from './components/Column'
import TaskCard from './components/TaskCard' // Column renders TaskCard, but we import types below
import AddTaskModal, { AddTaskValues } from './components/AddTaskModal'
import { useToast } from './hooks/useToast'
// branding
import Brand from './components/Brand'
import { useRememberedTaskList } from "./hooks/useRememberedTaskList"; // adjust path if needed
import SearchBar from './components/SearchBar'
import { filterTasks } from './utils/search'
// Heartbeat modal (new)
import { useAuthHeartbeat } from './hooks/useAuthHeartbeat'
import AuthGateModal from './components/AuthGateModal'

// theme helpers
type ThemeKey = 'light' | 'dark' | 'hc'
function applyTheme(t: ThemeKey) {
  document.documentElement.setAttribute('data-theme', t === 'hc' ? 'high-contrast' : t)
  localStorage.setItem('theme', t)
}
function loadTheme(): ThemeKey {
  const t = (localStorage.getItem('theme') as ThemeKey) || 'dark'
  return t
}
async function logout() {
  try {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' })
  } finally {
    window.location.href = '/'
  }
}

// ---- API helpers (adjust paths if yours differ) ----
import {
  getSession,
  getTaskLists,
  getTasks,
  createTask,
  deleteTask,
  moveTask,
  patchTask,
  pingServer,
} from './api'

// ---- Types ----
export type ColumnKey = 'inprogress' | 'icebucket' | 'completed'
export type GTask = {
  id: string
  title?: string
  notes?: string
  status?: 'needsAction' | 'completed'
  due?: string
  parent?: string
  position?: string
}

// ---- Little utils ----
function isIcebucket(t: GTask) {
  return (t.notes || '').toLowerCase().includes('#icebucket')
}
function byDueAsc(a: GTask, b: GTask) {
  const da = a.due ? new Date(a.due).getTime() : Infinity
  const db = b.due ? new Date(b.due).getTime() : Infinity
  return da - db
}
function notEmpty<T>(x: T | undefined | null): x is T { return !!x }

export default function App() {
  const toast = useToast()
  const [activeListId, setActiveListId] = useState<string | null>(null);

  // theme stuff
  const [theme, setTheme] = React.useState<ThemeKey>(loadTheme())
  React.useEffect(() => { applyTheme(theme) }, [theme])

  // ---- session + lists ----
  const [authenticated, setAuthed] = React.useState(false)
  const [tasklists, setTasklists] = React.useState<{ id: string; title: string }[]>([])
  const [listId, setListId] = React.useState<string | null>(null)

  // ---- search ----
  const [query, setQuery] = useState<string>('')

  // ---- tasks + derived ----
  const [tasks, setTasks] = React.useState<GTask[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sortMode, setSortMode] = React.useState<'manual' | 'due'>('manual')

  // ---- modals ----
  const [addOpen, setAddOpen] = React.useState<{ open: boolean; column?: ColumnKey }>({ open: false })

  // ---- error banner ----
  const [serverDown, setServerDown] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const [session, setSession] = React.useState<any | null>(null);
  const [sessionLoading, setSessionLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/session', { credentials: 'include' });
        const j = r.ok ? await r.json() : { authenticated: false };
        if (!cancelled) setSession(j);
      } catch {
        if (!cancelled) setSession({ authenticated: false });
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // authenticated flag
  const serverAuthed =
    (session && typeof session === 'object' && (
      ('authenticated' in session && !!session.authenticated) 
    )) || false;

  // If you use the heartbeat hook:
  const { authDown, recheck } = useAuthHeartbeat({
    intervalMs: 30000,
    failThreshold: 2,
    pauseWhenHidden: true,
    successPredicate: (j: any) => {
      if (!j || typeof j !== 'object') return false;
      if ('authenticated' in j) return !!j.authenticated;
      return false;
    },
  });

  // Final decision: only treat user as signed out if server says not authenticated
  // OR the heartbeat currently detects a down/expired session.
  const effectiveAuthed = serverAuthed && !authDown;

  // expose list for helpers used inside TaskCard
  React.useEffect(() => {
    ;(window as any).CURRENT_LIST_ID = listId || ''
  }, [listId])

  // boot
  React.useEffect(() => {
    ;(async () => {
      try {
        const ok = await pingServer()
        setServerDown(!ok)
      } catch {
        setServerDown(true)
      }

      const sessionRes = await getSession()
      const isAuthed = !!(sessionRes?.authenticated)
      setAuthed(isAuthed)

      if (isAuthed) {
        const lists = await getTaskLists()
        const items = (lists.items || []) as any[]
        setTasklists(items.map((x) => ({ id: x.id, title: x.title })))
        if (!listId && items[0]?.id) setListId(items[0].id)
      }
    })().catch((e) => console.error(e))
  }, [])

  React.useEffect(() => {
    if (!effectiveAuthed || !listId) return
    refreshTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAuthed, listId])

  // remember last selected task list
  const [me, setMe] = useState<{ email: string | null }>({ email: null });
  const { selectedListId, onSelectList } = useRememberedTaskList(tasklists, me.email);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : { email: null }))
      .then((m) => setMe(m ?? { email: null }))
      .catch(() => setMe({ email: null }));
  }, []);

  async function refreshTasks() {
    if (!listId) return
    setLoading(true)
    try {
      const resp = await getTasks(listId)
      setTasks((resp.items || []) as GTask[])
    } catch (e) {
      console.error(e)
      setServerDown(true)
    } finally {
      setLoading(false)
    }
  }

  async function retryServer() {
    setBusy(true)
    try {
      const ok = await pingServer()
      setServerDown(!ok)
      if (ok && authenticated && listId) await refreshTasks()
    } catch {
      setServerDown(true)
    } finally {
      setBusy(false)
    }
  }

  // ---- filter tasks by search ----
  const visibleTasks = React.useMemo(
    () => (query ? filterTasks(tasks, query) : tasks),
    [tasks, query]
  )

  // ---- derive columns + subtask map (use visibleTasks!) ----
  const topLevel = React.useMemo(
    () => visibleTasks.filter((t) => !t.parent),
    [visibleTasks]
  )

  const childrenByParent = React.useMemo(() => {
    const map: Record<string, GTask[]> = {}
    for (const t of visibleTasks) {
      if (!t.parent) continue
      if (!map[t.parent]) map[t.parent] = []
      map[t.parent].push(t)
    }
    // keep API order; optionally sort by due for predictability
    for (const k of Object.keys(map)) {
      map[k] = sortMode === 'due' ? [...map[k]].sort(byDueAsc) : map[k]
    }
    return map
  }, [visibleTasks, sortMode])

  const colInProgress = React.useMemo(() => {
    const list = topLevel.filter((t) => t.status !== 'completed' && !isIcebucket(t))
    return sortMode === 'due' ? [...list].sort(byDueAsc) : list
  }, [topLevel, sortMode])

  const colIcebucket = React.useMemo(() => {
    const list = topLevel.filter((t) => t.status !== 'completed' && isIcebucket(t))
    return sortMode === 'due' ? [...list].sort(byDueAsc) : list
  }, [topLevel, sortMode])

  const colCompleted = React.useMemo(() => {
    const list = topLevel.filter((t) => t.status === 'completed')
    return sortMode === 'due' ? [...list].sort(byDueAsc) : list
  }, [topLevel, sortMode])

  // ---- helpers for manual ordering ----
  function endOfColumnPreviousId(column: ColumnKey): string | undefined {
    const arr =
      column === 'inprogress' ? colInProgress
      : column === 'icebucket' ? colIcebucket
      : colCompleted
    return arr.length ? arr[arr.length - 1].id : undefined
  }

  // ---- CRUD: tasks ----
  function openAdd(column: ColumnKey) {
    setAddOpen({ open: true, column })
  }

  async function createFromModal(values: AddTaskValues) {
    if (!listId || !addOpen.column) return
    const { title, due, notes } = values
    const task: any = {
      title,
      notes: notes || (addOpen.column === 'icebucket' ? '#icebucket' : undefined),
      status: addOpen.column === 'completed' ? 'completed' : 'needsAction',
    }
    if (due) task.due = `${due}T12:00:00.000Z`

    try {
      const created = await createTask(listId, task)
      if (sortMode === 'manual') {
        const prev = endOfColumnPreviousId(addOpen.column)
        await moveTask(listId, created.id, prev)
      }
      await refreshTasks()
      toast('Task created')
    } catch (e) {
      console.error(e); toast('Create failed')
    }
  }

  async function onDelete(taskId: string) {
    if (!listId) return
    try {
      await deleteTask(listId, taskId)
      await refreshTasks()
      toast('Task deleted')
    } catch (e) {
      console.error(e); toast('Delete failed')
    }
  }

  // Drop between columns (change status/notes and optionally order)
  async function onDrop(taskId: string, target: ColumnKey) {
    if (!listId) return
    const t = tasks.find((x) => x.id === taskId)
    if (!t) return
    const updates: Partial<GTask> = {}

    // status
    updates.status = target === 'completed' ? 'completed' : 'needsAction'
    // icebucket tag
    const n = (t.notes || '')
    const clean = n.replace(/#icebucket/gi, '').trim()
    updates.notes = target === 'icebucket' ? `${clean} ${clean ? ' ' : ''}#icebucket`.trim() : clean || undefined

    try {
      await patchTask(listId, taskId, updates)
      if (sortMode === 'manual') {
        const prev = endOfColumnPreviousId(target)
        await moveTask(listId, taskId, prev)
      }
      await refreshTasks()
      toast('Updated')
    } catch (e) {
      console.error(e); toast('Move failed')
    }
  }

  // ---- Subtasks ----
  async function onAddSubtask(parentId: string, column: ColumnKey) {
    if (!listId) return
    const title = prompt('New subtask title?')
    if (!title) return
    let dueInput = ''
    if (confirm('Add a due date?')) {
      dueInput = prompt('Enter due date (YYYY-MM-DD) or leave blank', '') || ''
    }
    const notesBase = column === 'icebucket' ? '#icebucket' : ''
    const task: any = { title, notes: notesBase || undefined, status: column === 'completed' ? 'completed' : 'needsAction' }
    if (dueInput) task.due = `${dueInput}T12:00:00.000Z`
    try {
      const prev = (childrenByParent[parentId] || []).slice(-1)[0]?.id
      const created = await createTask(listId, task, { parent: parentId, previous: prev })
      if ((created as any)?.parent !== parentId) {
        await moveTask(listId, created.id, prev, parentId)
      }
      await refreshTasks()
    } catch (e) {
      console.error(e); alert('Create subtask failed')
    }
  }

  async function onDeleteSubtask(taskId: string) {
    if (!listId) return
    try {
      await deleteTask(listId, taskId)
      await refreshTasks()
    } catch (e) {
      console.error(e); alert('Delete subtask failed')
    }
  }

  async function onMoveSubtaskToEnd(taskId: string, parentId: string) {
    if (!listId) return
    try {
      const siblings = childrenByParent[parentId] || []
      const prev = siblings.length ? siblings[siblings.length - 1].id : undefined
      await moveTask(listId, taskId, prev, parentId)
      await refreshTasks()
    } catch (e) {
      console.error(e); alert('Reorder subtask failed')
    }
  }

  async function onReorderSubtask(taskId: string, parentId: string, beforeId?: string) {
    if (!listId) return
    try {
      // move before `beforeId` by passing previous = sibling *before* target; if none, it means at start → previous undefined
      // For simplicity we rely on API that interprets previous as immediate predecessor.
      const siblings = childrenByParent[parentId] || []
      let prev: string | undefined = undefined
      if (beforeId) {
        const idx = siblings.findIndex((s) => s.id === beforeId)
        if (idx > 0) prev = siblings[idx - 1].id
      } else if (siblings.length) {
        prev = siblings[siblings.length - 1].id
      }
      await moveTask(listId, taskId, prev, parentId)
      await refreshTasks()
    } catch (e) {
      console.error(e); alert('Reorder subtask failed')
    }
  }

  // optional: show a tiny loading state while the initial session probe runs
  if (sessionLoading) {
    return <div className="loading" style={{ padding: 16 }}>Loading…</div>
  }

  if (!effectiveAuthed) {
    return (
      <>
        <AuthGateModal open={!!authDown} onClose={() => recheck()} />
      </>
    )
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      {/* Error banner */}
      {serverDown && (
        <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)' }}>
          <strong>Server unreachable.</strong> Some actions may fail.
          <div style={{ marginTop: 6 }}>
            <button className="btn" onClick={retryServer} disabled={busy}>{busy ? 'Retrying…' : 'Retry'}</button>
          </div>
        </div>
      )}

      {/* Header bar */}
      <header style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        border: '1px solid var(--border)',
        borderRadius: 14,
        background: 'var(--surface)',
      }}>

        {/* Left: App title (or your logo) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Brand size={28} showWordmark />
      </div>

      {/* Center: List picker */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <select
          value={selectedListId ?? ''}
          onChange={(e) => {
            const id = e.target.value;
            onSelectList(id);     // persist to localStorage (scoped by user email if available)
            setListId(id);        // keep your existing app state in sync
          }}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '8px 10px',
            background: 'var(--bg)',
            color: 'var(--fg)',
            minWidth: 260
          }}
        >
          {tasklists.map((tl) => (
            <option key={tl.id} value={tl.id}>{tl.title}</option>
          ))}
        </select>
      </div>

        {/* Right: sort mode, theme, logout */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button
              className={`btn${sortMode === 'manual' ? ' primary' : ''}`}
              onClick={() => setSortMode('manual')}
              title="Manual order"
            >
              Manual
            </button>
            <button
              className={`btn${sortMode === 'due' ? ' primary' : ''}`}
              onClick={() => setSortMode('due')}
              title="Sort by due date"
            >
              Due date
            </button>
          </div>
          <SearchBar value={query} onChange={setQuery} />
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeKey)}
            title="Theme"
            style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', background: 'var(--bg)', color: 'var(--fg)' }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="hc">High contrast</option>
          </select>

          <button className="btn" onClick={logout}>Log out</button>
        </div>
      </header>


      {/* Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 12,
        alignItems: 'start'
      }}>
        <KanbanColumn
          title="In Progress"
          columnKey="inprogress"
          tasks={colInProgress}
          onDrop={onDrop}
          onAdd={(c, t) => openAdd(c)}
          onDelete={onDelete}
          childrenByParent={childrenByParent}
          onAddSubtask={(parent, c) => onAddSubtask(parent, c)}
          onDeleteSubtask={(sid) => onDeleteSubtask(sid)}
          onMoveSubtaskToEnd={(sid, parentId) => onMoveSubtaskToEnd(sid, parentId)}
          onReorderSubtask={(sid, parentId, beforeId) => onReorderSubtask(sid, parentId, beforeId)}
        />

        <KanbanColumn
          title="Icebucket"
          columnKey="icebucket"
          tasks={colIcebucket}
          onDrop={onDrop}
          onAdd={(c, t) => openAdd(c)}
          onDelete={onDelete}
          childrenByParent={childrenByParent}
          onAddSubtask={(parent, c) => onAddSubtask(parent, c)}
          onDeleteSubtask={(sid) => onDeleteSubtask(sid)}
          onMoveSubtaskToEnd={(sid, parentId) => onMoveSubtaskToEnd(sid, parentId)}
          onReorderSubtask={(sid, parentId, beforeId) => onReorderSubtask(sid, parentId, beforeId)}
        />

        <KanbanColumn
          title="Completed"
          columnKey="completed"
          tasks={colCompleted}
          onDrop={onDrop}
          onAdd={(c, t) => openAdd(c)}
          onDelete={onDelete}
          childrenByParent={childrenByParent}
          onAddSubtask={(parent, c) => onAddSubtask(parent, c)}
          onDeleteSubtask={(sid) => onDeleteSubtask(sid)}
          onMoveSubtaskToEnd={(sid, parentId) => onMoveSubtaskToEnd(sid, parentId)}
          onReorderSubtask={(sid, parentId, beforeId) => onReorderSubtask(sid, parentId, beforeId)}
        />
      </div>

      {/* Add Task modal */}
      <AddTaskModal
        open={addOpen.open}
        onClose={() => setAddOpen({ open: false })}
        onCreate={createFromModal}
      />

      {/* Loading overlay (simple) */}
      {loading && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div className="skeleton" style={{ width: 160, height: 12 }} />
        </div>
      )}
    </div>
  )
}