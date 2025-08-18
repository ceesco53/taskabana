import React from 'react'
import Modal from './Modal'

export type AddTaskValues = {
  title: string
  due?: string // yyyy-mm-dd
  notes?: string
}

export default function AddTaskModal({
  open,
  onClose,
  onCreate,
  initialTitle = '',
}: {
  open: boolean
  onClose: () => void
  onCreate: (values: AddTaskValues) => void
  initialTitle?: string
}) {
  const [title, setTitle] = React.useState(initialTitle)
  const [due, setDue] = React.useState('')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (open) { setTitle(initialTitle); setDue(''); setNotes('') }
  }, [open, initialTitle])

  return (
    <Modal open={open} onClose={onClose} title="Add Task">
      <div className="field">
        <label>Title</label>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What needs doing?"
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Due date</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} />
        </div>
        <div style={{ flex: 1 }} />
      </div>

      <div className="field">
        <label>Notes (optional)</label>
        <textarea rows={5} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Details, links, checklists…" />
      </div>

      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button
          className="btn primary"
          onClick={() => { if (title.trim()) { onCreate({ title: title.trim(), due, notes: notes.trim() || undefined }); onClose() } }}
        >
          Create
        </button>
      </div>
    </Modal>
  )
}