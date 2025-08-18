import React from 'react'
import Modal from './Modal'
import ReactQuill from 'react-quill'
import DOMPurify from 'dompurify'
import 'react-quill/dist/quill.snow.css'
import { cleanNotesHtml } from '../utils/cleanNotesHtml'

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    ['blockquote', 'code-block'],
    ['link'],
    [{ align: [] }],
    [{ color: [] }, { background: [] }],
    ['clean'],
  ],
}
const QUILL_FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent',
  'blockquote', 'code-block',
  'link',
  'align',
  'color', 'background',
]

export default function NoteModal({
  open,
  onClose,
  initialNotes,
  onSave,
}: {
  open: boolean
  onClose: () => void
  initialNotes: string
  onSave: (notesHtml: string) => void
}) {
  const [tab, setTab] = React.useState<'edit' | 'preview'>('edit')
  const [html, setHtml] = React.useState<string>('')

  // Normalize on open so we don't accumulate blank blocks across sessions
  React.useEffect(() => {
    if (!open) return
    setTab('edit')
    setHtml(cleanNotesHtml(initialNotes || ''))
  }, [open, initialNotes])

  return (
    <Modal open={open} onClose={onClose} title="Task Notes" width={780}>
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'edit' ? 'active' : ''}`} onClick={() => setTab('edit')}>Edit</button>
        <button className={`tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>Preview</button>
      </div>

      {/* Keep both panes mounted to avoid Quill re-init adding empties */}
      <div className="note-pane-stack">
        <div
          className="note-pane-editor"
          style={{ display: tab === 'edit' ? 'block' : 'none' }}
          aria-hidden={tab !== 'edit'}
        >
          <div className="wysiwyg-wrapper">
            <ReactQuill
              theme="snow"
              value={html}
              onChange={setHtml}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
              placeholder="Write your notes…"
            />
          </div>
        </div>

        <div
          className="note-pane-preview"
          style={{ display: tab === 'preview' ? 'block' : 'none' }}
          aria-hidden={tab !== 'preview'}
        >
          <div
            className="note-preview"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanNotesHtml(html || '')) }}
          />
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button
          className="btn primary"
          onClick={() => {
            const cleaned = cleanNotesHtml(html || '')
            onSave(cleaned)
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}