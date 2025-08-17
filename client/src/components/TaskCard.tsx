import React, { useEffect, useState } from 'react'
import type { GTask } from '../kanban'
import { patchTask } from '../api'
import { toDateInputValue, fromDateInputValue } from '../utils'
import Calendar from './Calendar'
import { marked } from 'marked'
import DueBadge from './DueBadge'

type Props = {
  task: GTask
  subtasks?: GTask[]
  onDelete?: () => void
  onAddSubtask?: () => void
  onDeleteSubtask?: (subtaskId: string) => void
  onMoveSubtaskToEnd?: (subtaskId: string) => void
  onReorderSubtask?: (subtaskId: string, beforeId?: string) => void
}

export default function TaskCard({
  task,
  subtasks = [],
  onDelete,
  onAddSubtask,
  onDeleteSubtask,
  onMoveSubtaskToEnd,
  onReorderSubtask
}: Props) {
  const [dragging, setDragging] = useState(false)
  const [title, setTitle] = useState(task.title || '')
  const [editingNotes, setEditingNotes] = useState(false) // kept for backwards compat (unused)
  const [showNotes, setShowNotes] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [notes, setNotes] = useState(task.notes || '')
  const [due, setDue] = useState(toDateInputValue(task.due))
  const [showCal, setShowCal] = useState(false)

  useEffect(() => { setTitle(task.title || '') }, [task.title])
  useEffect(() => { setNotes(task.notes || '') }, [task.notes])
  useEffect(() => { setDue(toDateInputValue(task.due)) }, [task.due])

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/taskId', task.id)
    setDragging(true)
  }
  function onDragEnd() { setDragging(false) }

  async function saveTitle() {
    if ((task.title || '') === title) return
    try { await patchTask((window as any).CURRENT_LIST_ID, task.id, { title }) } catch {}
  }
  async function saveNotes() {
    if ((task.notes || '') === notes) return
    try { await patchTask((window as any).CURRENT_LIST_ID, task.id, { notes }) } catch {}
  }
  async function saveDue(newVal: string) {
    const iso = fromDateInputValue(newVal)
    try { await patchTask((window as any).CURRENT_LIST_ID, task.id, { due: iso }) } catch {}
  }

  // Subtask drag helpers
  function onSubDragStart(e: React.DragEvent, sid: string) {
    e.dataTransfer.setData('text/subtaskId', sid)
  }

  return (
    <div
      className={`task ${dragging ? 'dragging' : ''}`}
      tabIndex={0}
      onKeyDown={(e) => {
        const card = e.currentTarget
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          let el = card.nextElementSibling as HTMLElement | null
          while (el && !el.hasAttribute('data-card')) el = el.nextElementSibling as HTMLElement | null
          el?.focus()
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          let el = card.previousElementSibling as HTMLElement | null
          while (el && !el.hasAttribute('data-card')) el = el.previousElementSibling as HTMLElement | null
          el?.focus()
        }
      }}
      data-card
      data-id={task.id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="drag-handle" aria-hidden>≡</span>
        <input
          style={{ fontWeight: 600, flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', background: 'var(--bg)', color: 'var(--fg)' }}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        />
        <DueBadge iso={task.due} />
        {onDelete && <button title="Delete task" onClick={onDelete}>🗑️</button>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <label className="badge">Due</label>
        <button onClick={() => setShowCal(v => !v)}>{due || 'Pick a date'}</button>
        {showCal ? (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', zIndex: 20 }}>
              <Calendar
                value={due}
                onChange={(ymd) => { setDue(ymd); setShowCal(false); if (ymd !== toDateInputValue(task.due)) saveDue(ymd) }}
              />
            </div>
          </div>
        ) : null}
        <button onClick={() => setShowNotes(v => !v)}>{showNotes ? 'Hide notes' : 'Notes'}</button>
        {showNotes && <button onClick={() => setShowPreview(p => !p)}>{showPreview ? 'Edit' : 'Preview'}</button>}
        {onAddSubtask && <button onClick={onAddSubtask}>+ Subtask</button>}
      </div>

      {showNotes ? (
        showPreview ? (
          <div
            style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}
            dangerouslySetInnerHTML={{ __html: marked.parse(notes || '') as string }}
          />
        ) : (
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Notes… (Markdown supported)"
            style={{ width: '100%', marginTop: 8, minHeight: 90, border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: 'var(--bg)', color: 'var(--fg)' }}
          />
        )
      ) : null}

      {/* Subtask lane with precise reorder drop-zones */}
      {/* Subtask lane with precise reorder drop-zones (ALWAYS stacked 1-per-line) */}
      {(subtasks.length > 0 || onAddSubtask) ? (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--muted)' }}>Subtasks</div>

          <ul className="subtasks-list">
            {/* Drop at start */}
            <li className="subtask-drop">
              <DropZone
                stacked
                beforeId={subtasks[0]?.id}
                onDrop={(sid, beforeId) => onReorderSubtask && onReorderSubtask(sid, beforeId)}
              />
            </li>

            {subtasks.map((st, idx) => (
              <React.Fragment key={st.id}>
                <li className="subtask-row">
                  <SubtaskChip
                    st={st}
                    stacked
                    onSubDragStart={onSubDragStart}
                    onDeleteSubtask={onDeleteSubtask}
                  />
                </li>
                <li className="subtask-drop">
                  <DropZone
                    stacked
                    beforeId={subtasks[idx + 1]?.id}
                    onDrop={(sid, beforeId) => {
                      if (!beforeId && onMoveSubtaskToEnd) {
                        onMoveSubtaskToEnd(sid)
                      } else if (onReorderSubtask) {
                        onReorderSubtask(sid, beforeId)
                      }
                    }}
                  />
                </li>
              </React.Fragment>
            ))}
          </ul>

          <div className="footer-note">Drag a subtask row into a dashed gap to reorder.</div>
        </div>
      ) : null}
    </div>
  )
}

/** Thin dashed drop target used between subtask chips */
function DropZone({
  beforeId,
  onDrop,
  stacked,
}: {
  beforeId?: string
  onDrop: (sid: string, beforeId?: string) => void
  stacked?: boolean
}) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const sid = e.dataTransfer.getData('text/subtaskId')
        if (sid) onDrop(sid, beforeId)
      }}
      style={
        stacked
          ? {
              width: '100%',
              height: 8,
              border: '1px dashed var(--border)',
              borderRadius: 6,
            }
          : {
              width: 14,
              height: 28,
              border: '1px dashed var(--border)',
              borderRadius: 6,
              flex: '0 0 auto',
            }
      }
      title="Drop here"
    />
  )
}

/** Subtask chip with inline title + date edit */
function SubtaskChip({
  st,
  onSubDragStart,
  onDeleteSubtask,
}: {
  st: GTask
  onSubDragStart: (e: React.DragEvent, sid: string) => void
  onDeleteSubtask?: (sid: string) => void
}) {
  const [title, setTitle] = useState(st.title || '')
  const [due, setDue] = useState(toDateInputValue(st.due))

  useEffect(() => {
    setTitle(st.title || '')
  }, [st.title])
  useEffect(() => {
    setDue(toDateInputValue(st.due))
  }, [st.due])

  async function saveTitle() {
    try {
      await patchTask((window as any).CURRENT_LIST_ID, st.id, { title })
    } catch {}
  }
  async function saveDue(newVal: string) {
    const iso = fromDateInputValue(newVal)
    try {
      await patchTask((window as any).CURRENT_LIST_ID, st.id, { due: iso })
    } catch {}
  }

  return (
    <div
      draggable
      onDragStart={(e) => onSubDragStart(e, st.id)}
      title={st.notes || ''}
      className="subtask-chip"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        onKeyDown={(e) => {
          if (e.key === 'Enter')
            (e.target as HTMLInputElement).blur()
        }}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '2px 4px',
          color: 'var(--fg)',
          flex: 1,
        }}
      />
      <input
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        onBlur={(e) => saveDue(e.target.value)}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '2px 4px',
          color: 'var(--fg)',
        }}
      />
      {onDeleteSubtask && (
        <button
          title="Delete subtask"
          onClick={() => onDeleteSubtask(st.id)}
        >
          🗑️
        </button>
      )}
    </div>
  )
}