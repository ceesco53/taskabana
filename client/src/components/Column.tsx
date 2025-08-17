import React, { useState } from 'react'
import TaskCard from './TaskCard'
import type { GTask, ColumnKey } from '../kanban'
import QuickAdd from './QuickAdd'

type Props = {
  title: string
  columnKey: ColumnKey
  tasks: GTask[]
  onDrop: (taskId: string, target: ColumnKey) => void
  onAdd: (column: ColumnKey, title?: string) => void
  onDelete: (taskId: string) => void
  childrenByParent: Record<string, GTask[]>
  onAddSubtask: (parentId: string, column: ColumnKey) => void
  onDeleteSubtask: (taskId: string) => void
  onMoveSubtaskToEnd: (taskId: string, parentId: string) => void
  onReorderSubtask: (taskId: string, parentId: string, beforeId?: string) => void
}

export default function KanbanColumn({ title, tasks, columnKey, onDrop, onAdd, onDelete, childrenByParent, onAddSubtask, onDeleteSubtask, onMoveSubtaskToEnd, onReorderSubtask }: Props) {
  const [over, setOver] = useState(false)
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setOver(true) }
  function handleDragLeave() { setOver(false) }
  function handleDrop(e: React.DragEvent) {
    const id = e.dataTransfer.getData('text/taskId')
    if (id) onDrop(id, columnKey)
    setOver(false)
  }
  return (
    <div className={`column ${over ? 'is-over' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} role="list" aria-roledescription="Kanban column" data-column={columnKey}>
      <h3>
        {title} <span className="badge">{tasks.length}</span>
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={() => onAdd(columnKey)}>+ Add</button>
      </h3>
      <QuickAdd placeholder={`Add to ${title}`} onAdd={(t) => onAdd(columnKey, t)} />
      {tasks.map(t => (
        <TaskCard
          key={t.id}
          task={t}
          subtasks={childrenByParent[t.id] || []}
          onDelete={() => onDelete(t.id)}
          onAddSubtask={() => onAddSubtask(t.id, columnKey)}
          onDeleteSubtask={(sid) => onDeleteSubtask(sid)}
          onMoveSubtaskToEnd={(sid) => onMoveSubtaskToEnd(sid, t.id)}
          onReorderSubtask={(sid, beforeId) => onReorderSubtask(sid, t.id, beforeId)}
        />
      ))}
    </div>
  )
}