import React, { useEffect, useState } from 'react'
import DueBadge from './DueBadge'
import NoteModal from './NoteModal'
import DOMPurify from 'dompurify'
import { patchTask } from '../api'
import type { GTask } from '../kanban' // adjust if your type path differs

type Props = {
  task: GTask
  subtasks: GTask[]
  onDelete: () => void

  // subtask handlers
  onAddSubtask?: () => void
  onDeleteSubtask?: (subId: string) => void
  onMoveSubtaskToEnd?: (subId: string) => void
  onReorderSubtask?: (subId: string, beforeId?: string) => void
}

export default function TaskCard(props: Props) {
  const {
    task,
    subtasks,
    onDelete,
    onAddSubtask,
    onDeleteSubtask,
    onMoveSubtaskToEnd,
    onReorderSubtask,
  } = props

  const [title, setTitle] = useState(task.title || '')
  const [noteOpen, setNoteOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  // local copy so snippet updates immediately after modal save
  const [notesHtml, setNotesHtml] = useState<string>(task.notes || '')

  useEffect(() => { setTitle(task.title || '') }, [task.title])
  useEffect(() => { setNotesHtml(task.notes || '') }, [task.notes])

  async function saveTitle() {
    try {
      await patchTask((window as any).CURRENT_LIST_ID, task.id, { title })
    } catch (e) { console.error(e) }
  }

  // ------------ task-level drag ------------
  function onDragStart(e: React.DragEvent) {
    setDragging(true)
    e.dataTransfer.setData('text/taskId', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragEnd() { setDragging(false) }

  return (
    <div
      className={`task ${dragging ? 'dragging' : ''}`}
      tabIndex={0}
      data-card
      data-id={task.id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onKeyDown={(e) => {
        const card = e.currentTarget as HTMLElement
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
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: 12,
        display: 'grid',
        gap: 8
      }}
    >
      {/* Header: drag handle, title, delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="drag-handle" aria-hidden>≡</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{
            fontWeight: 600,
            flex: 1,
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '8px 10px',
            background: 'var(--bg)',
            color: 'var(--fg)',
          }}
        />
        <button
          className="icon-btn danger"
          title="Delete task"
          aria-label="Delete task"
          onClick={onDelete}
        >
          🗑️
        </button>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <label className="badge">Due</label>
        <DueBadge iso={task.due} />
        <button className="btn" onClick={() => setNoteOpen(true)}>Notes</button>
        {onAddSubtask && <button className="btn" onClick={() => onAddSubtask()}>+ Subtask</button>}
      </div>

      {/* -------- Notes snippet (shows ~10 lines, scrolls if longer) -------- */}
      {notesHtml?.trim() ? (
        <div
          className="note-snippet clickable"
          role="button"
          tabIndex={0}
          aria-label="Open notes editor"
          onClick={(e) => {
            // If user clicked a link or any interactive element inside the snippet, respect that
            const interactive = (e.target as HTMLElement).closest('a,button,input,textarea,select,code,pre')
            if (interactive) return
            setNoteOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setNoteOpen(true)
            }
          }}
          // keep sanitized HTML
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(notesHtml) }}
        />
      ) : null}

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', marginTop: 4 }} />

      {/* Subtasks (ALWAYS stacked one per line) */}
      {(subtasks.length > 0 || onAddSubtask) ? (
        <div style={{ marginTop: 4 }}>
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

          <div className="footer-note" style={{ marginTop: 8 }}>
            Drag a subtask row into a dashed gap to reorder.
          </div>
        </div>
      ) : null}

      {/* Notes modal */}
      <NoteModal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        initialNotes={notesHtml}
        onSave={async (html) => {
          setNotesHtml(html) // optimistic so the snippet updates immediately
          try {
            await patchTask((window as any).CURRENT_LIST_ID, task.id, { notes: html || null })
          } catch (e) { console.error(e) }
        }}
      />
    </div>
  )
}

/* ----------------- helpers ----------------- */

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
              borderRadius: 8,
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

function onSubDragStart(e: React.DragEvent, sid: string) {
  e.dataTransfer.setData('text/subtaskId', sid)
  e.dataTransfer.effectAllowed = 'move'
}

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

  useEffect(() => { setTitle(st.title || '') }, [st.title])
  useEffect(() => { setDue(toDateInputValue(st.due)) }, [st.due])

  async function saveTitle() {
    try { await patchTask((window as any).CURRENT_LIST_ID, st.id, { title }) } catch (e) { console.error(e) }
  }
  async function saveDue(newVal: string) {
    const iso = fromDateInputValue(newVal)
    try { await patchTask((window as any).CURRENT_LIST_ID, st.id, { due: iso }) } catch (e) { console.error(e) }
  }

  return (
    <div
      draggable
      onDragStart={(e) => onSubDragStart(e, st.id)}
      title={st.notes || ''}
      className="subtask-chip"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        border: '1px solid var(--border)',
        borderRadius: 12,
        width: '100%',
        background: 'var(--card)',
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '6px 8px',
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
          borderRadius: 8,
          padding: '6px 8px',
          color: 'var(--fg)',
        }}
      />
      {onDeleteSubtask && (
        <button
          className="icon-btn danger"
          title="Delete subtask"
          aria-label="Delete subtask"
          onClick={() => onDeleteSubtask(st.id)}
        >
          🗑️
        </button>
      )}
    </div>
  )
}

/* --------- date helpers --------- */
function toDateInputValue(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function fromDateInputValue(v?: string) {
  if (!v) return undefined
  return `${v}T12:00:00.000Z`
}