import React from 'react'
import TaskCard from './TaskCard'
import type { GTask, ColumnKey } from '../kanban'

type Props = {
  title: string
  columnKey: ColumnKey
  tasks: GTask[]
  onDrop: (taskId: string, target: ColumnKey) => void
  onAdd: (column: ColumnKey) => void
  onDelete: (taskId: string) => void
  childrenByParent: Record<string, GTask[]>
  onAddSubtask: (parentId: string, column: ColumnKey) => void
  onDeleteSubtask: (taskId: string) => void
  onMoveSubtaskToEnd: (taskId: string, parentId: string) => void
  onReorderSubtask: (taskId: string, parentId: string, beforeId?: string) => void
}

export default function KanbanColumn({ title, tasks, columnKey, onDrop, onAdd, onDelete, childrenByParent, onAddSubtask, onDeleteSubtask, onMoveSubtaskToEnd, onReorderSubtask }: Props) {
  function handleDragOver(e: React.DragEvent) { e.preventDefault() }
  function handleDrop(e: React.DragEvent) {
    const id = e.dataTransfer.getData('text/taskId')
    if (id) onDrop(id, columnKey)
  }
  return (
    <div className="column" onDragOver={handleDragOver} onDrop={handleDrop}>
      <h3>
        {title} <span className="badge">{tasks.length}</span>
        <span style={{ flex: 1 }} />
        <button style={{ marginLeft: 'auto' }} onClick={() => onAdd(columnKey)}>+ Add</button>
      </h3>
      {tasks.map(t => (
        <TaskCard
          key={t.id}
          task={t}
          subtasks={childrenByParent[t.id] || []}
          onDelete={() => onDelete(t.id)}
          onAddSubtask={() => onAddSubtask(t.id, columnKey)}
          onDeleteSubtask={(sid) => onDeleteSubtask(sid)}
          onMoveSubtaskToEnd={(sid) => onMoveSubtaskToEnd(sid, t.id)}
        />
      ))}
    </div>
  )
}
