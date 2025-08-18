import React from 'react'
import Modal from './Modal'
import ReactQuill from 'react-quill'
import DOMPurify from 'dompurify'
import 'react-quill/dist/quill.snow.css'

/**
 * We store notes as HTML so formatting persists in Google Tasks `notes` (string).
 * If you previously stored Markdown, it will just appear as plain text in the editor.
 * (We could add md<->html conversion later if you want.)
 */

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
  const [html, setHtml] = React.useState<string>(initialNotes || '')

  React.useEffect(() => {
    if (open) {
      setHtml(initialNotes || '')
      setTab('edit')
    }
  }, [open, initialNotes])

  return (
    <Modal open={open} onClose={onClose} title="Task Notes" width={780}>
      <div className="tabs">
        <button className={`tab ${tab === 'edit' ? 'active' : ''}`} onClick={() => setTab('edit')}>
          Edit
        </button>
        <button className={`tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>
          Preview
        </button>
      </div>

      {tab === 'edit' ? (
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
      ) : (
        <div
          className="note-preview"
          // Sanitize before rendering
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html || '') }}
        />
      )}

      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button
          className="btn primary"
          onClick={() => {
            onSave(html || '')
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}