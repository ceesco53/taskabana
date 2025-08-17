import React, { useEffect, useMemo, useState } from 'react'
import { getSession, login, logout, getTaskLists, getTasks, patchTask, getUserInfo, createTask, deleteTask, moveTask, pingServer } from './api'
import { categorize, applyCategory, type GTask, type ColumnKey } from './kanban'
import KanbanColumn from './components/Column'
import ThemeSwitcher from './components/ThemeSwitcher'

type TaskList = { id: string, title: string }
type SortMode = 'manual' | 'due'

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [lists, setLists] = useState<TaskList[]>([])
  const [listId, setListId] = useState<string>('')
  const [tasks, setTasks] = useState<GTask[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [sortMode, setSortMode] = useState<SortMode>(() => (localStorage.getItem('kanban-sort') as SortMode) || 'manual')

  // new banner states
  const [serverDown, setServerDown] = useState(false)
  const [initTried, setInitTried] = useState(false)

  useEffect(() => {
    (async () => {
      const alive = await pingServer()
      if (!alive) {
        setServerDown(true)
        setLoading(false)
        setInitTried(true)
        return
      }
      setServerDown(false)
      const s = await getSession()
      setAuthed(s.authed)
      if (s.authed) {
        try {
          const u = await getUserInfo().catch(() => null)
          if (u) setUser(u)
          const data = await getTaskLists()
          const items = data.items || []
          setLists(items.map((i: any) => ({ id: i.id, title: i.title })))
          if (items[0]) setListId(items[0].id)
        } catch (e) {
          console.error(e)
        }
      }
      setLoading(false)
      setInitTried(true)
    })()
  }, [])

  useEffect(() => {
    (window as any).CURRENT_LIST_ID = listId;
  }, [listId])

  useEffect(() => {
    if (!listId || !authed) return
    refreshTasks()
  }, [listId, authed])

  function refreshTasks() {
    getTasks(listId).then(data => {
      setTasks((data.items || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        notes: t.notes,
        status: t.status,
        updated: t.updated,
        completed: t.completed,
        due: t.due,
        parent: t.parent,
        position: t.position
      })))
    })
  }

  async function retryServer() {
    setServerDown(false)
    setLoading(true)
    const alive = await pingServer()
    if (!alive) {
      setServerDown(true)
      setLoading(false)
      return
    }
    const s = await getSession()
    setAuthed(s.authed)
    if (s.authed) {
      try {
        const u = await getUserInfo().catch(() => null)
        if (u) setUser(u)
        const data = await getTaskLists()
        const items = data.items || []
        setLists(items.map((i: any) => ({ id: i.id, title: i.title })))
        if (items[0]) setListId(items[0].id)
      } catch (e) {
        console.error(e)
      }
    }
    setLoading(false)
  }

  const childrenByParent = useMemo(() => {
    const map: Record<string, GTask[]> = {}
    for (const t of tasks) {
      const anyT: any = t as any
      if (anyT.parent) (map[anyT.parent] ||= []).push(t)
    }
    if (sortMode === 'due') {
      const sorter = (a: GTask, b: GTask) => {
        const ad = a.due ? Date.parse(a.due) : Number.POSITIVE_INFINITY
        const bd = b.due ? Date.parse(b.due) : Number.POSITIVE_INFINITY
        return ad - bd
      }
      Object.values(map).forEach(arr => arr.sort(sorter))
    }
    return map
  }, [tasks, sortMode])

  const columns = useMemo(() => {
    const groups: Record<ColumnKey, GTask[]> = { inprogress: [], completed: [], icebucket: [] }
    const byId = new Map<string, GTask>(tasks.map(t => [t.id, t]))
    for (const t of tasks) {
      const anyT: any = t as any
      const hasParent = !!anyT.parent
      const parentMissing = hasParent && !byId.has(anyT.parent as string)
      if (!hasParent || parentMissing) {
        groups[categorize(t)].push(t)
      }
    }
    if (sortMode === 'due') {
      const sorter = (a: GTask, b: GTask) => {
        const ad = a.due ? Date.parse(a.due) : Number.POSITIVE_INFINITY
        const bd = b.due ? Date.parse(b.due) : Number.POSITIVE_INFINITY
        return ad - bd
      }
      groups.inprogress.sort(sorter)
      groups.completed.sort(sorter)
      groups.icebucket.sort(sorter)
    }
    return groups
  }, [tasks, sortMode])

  function endOfColumnPreviousId(target: ColumnKey, excludeId?: string): string | undefined {
    const list = columns[target].filter(t => t.id !== excludeId)
    return list.length ? list[list.length - 1].id : undefined
  }

  async function onDrop(taskId: string, target: ColumnKey) {
    const t = tasks.find(x => x.id === taskId)
    if (!t || !listId) return
    try {
      const payload = applyCategory(t, target)
      await patchTask(listId, taskId, payload)
      if (sortMode === 'manual') {
        const prev = endOfColumnPreviousId(target, taskId)
        await moveTask(listId, taskId, prev)
      }
      refreshTasks()
    } catch (e) {
      console.error(e)
      alert('Update failed')
    }
  }

  async function onAdd(column: ColumnKey) {
    if (!listId) return
    const title = prompt(`New task title (${column})?`)
    if (!title) return
    let dueInput = ''
    if (confirm('Add a due date?')) dueInput = prompt('Enter due date (YYYY-MM-DD) or leave blank', '') || ''
    const notesBase = column === 'icebucket' ? '#icebucket' : ''
    const task: any = { title, notes: notesBase || undefined }
    if (dueInput) task.due = `${dueInput}T12:00:00.000Z`
    if (column === 'completed') task.status = 'completed'
    else task.status = 'needsAction'
    try {
      const created = await createTask(listId, task)
      if (sortMode === 'manual') {
        const prev = endOfColumnPreviousId(column)
        await moveTask(listId, created.id, prev)
      }
      refreshTasks()
    } catch (e) {
      console.error(e)
      alert('Create failed')
    }
  }

  async function onDelete(taskId: string) {
    if (!listId) return
    if (!confirm('Delete this task?')) return
    try {
      await deleteTask(listId, taskId)
      refreshTasks()
    } catch (e) {
      console.error(e)
      alert('Delete failed')
    }
  }

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
      await createTask(listId, task, { parent: parentId, previous: prev })
      refreshTasks()
    } catch (e) {
      console.error(e); alert('Create subtask failed')
    }
  }

  async function onDeleteSubtask(taskId: string) {
    if (!listId) return
    if (!confirm('Delete this subtask?')) return
    try {
      await deleteTask(listId, taskId)
      refreshTasks()
    } catch (e) {
      console.error(e); alert('Delete failed')
    }
  }

  async function onMoveSubtaskToEnd(taskId: string, parentId: string) {
    if (!listId) return
    try {
      const prev = (childrenByParent[parentId] || []).filter(t => t.id !== taskId).slice(-1)[0]?.id
      await moveTask(listId, taskId, prev, parentId)
      refreshTasks()
    } catch (e) {
      console.error(e); alert('Reorder failed')
    }
  }

  async function onReorderSubtask(taskId: string, parentId: string, beforeId?: string) {
    if (!listId) return
    try {
      const siblings = (childrenByParent[parentId] || []).filter(t => t.id !== taskId)
      const prev = !beforeId ? (siblings.slice(-1)[0]?.id) : (function(){
        const idx = siblings.findIndex(t => t.id === beforeId)
        return idx <= 0 ? undefined : siblings[idx-1].id
      })()
      await moveTask(listId, taskId, prev, parentId)
      refreshTasks()
    } catch (e) {
      console.error(e); alert('Reorder failed')
    }
  }

  useEffect(() => {
    localStorage.setItem('kanban-sort', sortMode)
  }, [sortMode])

  if (loading) return <div className="container">Loading…</div>

  return (
    <div>
      <header className="header">
        <div className="left">
          <strong>Google Tasks Kanban</strong>
          <span className="badge">PKCE</span>
        </div>
        <div className="right">
          <ThemeSwitcher />
          {authed ? (
            <>
              <div className="select">
                <label htmlFor="sort">Sort:</label>
                <select id="sort" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
                  <option value="manual">Manual (saved)</option>
                  <option value="due">Due date</option>
                </select>
              </div>
              <div className="select">
                <label htmlFor="list">List:</label>
                <select id="list" value={listId} onChange={(e) => setListId(e.target.value)}>
                  {lists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
              <button onClick={() => { logout().then(() => window.location.reload()) }}>Sign out{user?.name ? ` (${user.name})` : ''}</button>
            </>
          ) : (
            <button className="primary" onClick={() => login()}>Sign in with Google</button>
          )}
        </div>
      </header>

      {serverDown && (
        <div className="banner-error">
          <strong>Can’t reach the server (http://localhost:4000).</strong>
          <span className="footer-note">Make sure the server is running: <code>cd server && npm run dev</code></span>
          <span style={{ flex: 1 }} />
          <button onClick={retryServer}>Retry</button>
        </div>
      )}

      {!authed ? (
        <div className="container">
          <p>Sign in to view your Google Tasks as a Kanban board.</p>
        </div>
      ) : (
        <div className="container">
          {columns.inprogress.length + columns.completed.length + columns.icebucket.length === 0 ? (
            <div className="footer-note">No tasks found in this list. Try another list or add a task.</div>
          ) : null}
          <div className="kanban">
            <KanbanColumn
              title="In Progress"
              columnKey="inprogress"
              tasks={columns.inprogress}
              childrenByParent={childrenByParent}
              onDrop={onDrop}
              onAdd={onAdd}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              onDeleteSubtask={onDeleteSubtask}
              onMoveSubtaskToEnd={onMoveSubtaskToEnd}
              onReorderSubtask={onReorderSubtask}
            />
            <KanbanColumn
              title="Completed"
              columnKey="completed"
              tasks={columns.completed}
              childrenByParent={childrenByParent}
              onDrop={onDrop}
              onAdd={onAdd}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              onDeleteSubtask={onDeleteSubtask}
              onMoveSubtaskToEnd={onMoveSubtaskToEnd}
              onReorderSubtask={onReorderSubtask}
            />
            <KanbanColumn
              title="Icebucket"
              columnKey="icebucket"
              tasks={columns.icebucket}
              childrenByParent={childrenByParent}
              onDrop={onDrop}
              onAdd={onAdd}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              onDeleteSubtask={onDeleteSubtask}
              onMoveSubtaskToEnd={onMoveSubtaskToEnd}
              onReorderSubtask={onReorderSubtask}
            />
          </div>
          <div className="footer-note">
            Drag & drop between columns. Icebucket is marked with <code>#icebucket</code> in task notes.
            {sortMode === 'due' ? ' (sorted by due date)' : ' (manual order is saved)'} — Loaded {tasks.length} items.
          </div>
        </div>
      )}
    </div>
  )
}