import React from 'react'
import Modal from './Modal'

function mdBasic(src: string) {
  // super-light markdown for preview (bold, italics, links, code)
  let s = src
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/gim, '<em>$1</em>')
    .replace(/`(.+?)`/gim, '<code>$1</code>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s]+)\)/gim, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  s = s.replace(/\n$/g, '<br/>').replace(/\n/g, '<br/>')
  return { __html: s }
}

export default function NoteModal({
  open,
  onClose,
  initialNotes,
  onSave
}: {
  open: boolean
  onClose: () => void
  initialNotes: string
  onSave: (notes: string) => void
}) {
  const [notes, setNotes] = React.useState(initialNotes || '')
  const [tab, setTab] = React.useState<'edit'|'preview'>('edit')
  React.useEffect(() => { if (open) { setNotes(initialNotes || ''); setTab('edit') } }, [open, initialNotes])

  return (
    <Modal open={open} onClose={onClose} title="Task Notes" width={720}>
      <div className="tabs">
        <button className={`tab ${tab==='edit'?'active':''}`} onClick={() => setTab('edit')}>Edit</button>
        <button className={`tab ${tab==='preview'?'active':''}`} onClick={() => setTab('preview')}>Preview</button>
      </div>

      {tab === 'edit' ? (
        <textarea rows={12} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Markdown supported: **bold**, *italics*, [link](https://…)" />
      ) : (
        <div className="note-preview" dangerouslySetInnerHTML={mdBasic(notes)} />
      )}

      <div className="modal-footer">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={() => { onSave(notes); onClose() }}>Save</button>
      </div>
    </Modal>
  )
}