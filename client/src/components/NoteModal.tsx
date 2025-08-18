import React from 'react'
import ReactQuill from 'react-quill'
import 'quill/dist/quill.snow.css' // Quill v2 stylesheet
import { cleanNotesHtml } from '../utils/cleanNotesHtml'
import Modal from './Modal'

type Props =
  // New-style props (isOpen/note) OR old-style props (open/initialNotes)
  | {
      isOpen: boolean
      onClose: () => void
      note: string
      onSave: (noteHtml: string) => void
      title?: string
    }
  | {
      open: boolean
      onClose: () => void
      initialNotes: string
      onSave: (noteHtml: string) => void
      title?: string
    }

// Quill config (works for Quill v2)
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

export default function NoteModal(props: Props) {
  // Map both prop shapes to a common shape
  const isOpen = 'isOpen' in props ? props.isOpen : props.open
  const onClose = props.onClose
  const initial = 'note' in props ? props.note : props.initialNotes
  const onSaveProp = props.onSave
  const modalTitle = ('title' in props && props.title) || 'Task Notes'

  const [tab, setTab] = React.useState<'edit' | 'preview'>('edit')
  const [html, setHtml] = React.useState<string>('')

  // Normalize on open so we don’t accumulate blank blocks
  React.useEffect(() => {
    if (!isOpen) return
    setTab('edit')
    setHtml(cleanNotesHtml(initial || ''))
  }, [isOpen, initial])

  if (!isOpen) return null

  return (
    <Modal open={true} onClose={onClose} title={modalTitle} width={780}>
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
            onSaveProp(cleaned)
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}

// Local import to avoid TS error in JSX sanitization (DOMPurify used at runtime)
import DOMPurify from 'dompurify'