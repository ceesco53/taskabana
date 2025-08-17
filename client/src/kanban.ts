export type GTask = {
  id: string
  title?: string
  notes?: string
  status?: 'needsAction' | 'completed'
  due?: string
  updated?: string
  completed?: string
}

export type ColumnKey = 'inprogress' | 'completed' | 'icebucket'

export function categorize(task: GTask): ColumnKey {
  if (task.status === 'completed') return 'completed'
  const notes = (task.notes || '').toLowerCase()
  if (notes.includes('#icebucket')) return 'icebucket'
  return 'inprogress'
}

export function applyCategory(task: GTask, target: ColumnKey): Record<string, any> {
  // Returns minimal PATCH payload to flip categories
  const notes = task.notes || ''
  const hasIce = includesIcebucket(notes)

  if (target === 'completed') {
    return {
      status: 'completed',
      completed: new Date().toISOString(),
      notes: hasIce ? removeIcebucket(notes) : notes
    }
  }

  if (target === 'inprogress') {
    const payload: Record<string, any> = { status: 'needsAction' }
    // Clear 'completed' by not sending it (PATCH omits fields you don't want to change)
    if (hasIce) payload.notes = removeIcebucket(notes)
    return payload
  }

  // icebucket
  const maybeAdd = hasIce ? notes : (notes ? (notes + '\n#icebucket') : '#icebucket')
  const payload: Record<string, any> = { status: 'needsAction', notes: maybeAdd }
  return payload
}

function includesIcebucket(notes: string): boolean {
  return notes.toLowerCase().includes('#icebucket')
}

function removeIcebucket(notes: string): string {
  return notes
    .split('\n')
    .filter(line => line.trim().toLowerCase() !== '#icebucket')
    .join('\n')
    .trim()
}
