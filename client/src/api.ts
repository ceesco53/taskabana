export async function getSession(): Promise<{ authed: boolean }> {
  try {
    const resp = await fetch('/api/session', { credentials: 'include' });
    if (!resp.ok) return { authed: false };
    try {
      return await resp.json();
    } catch {
      return { authed: false };
    }
  } catch {
    return { authed: false };
  }
}

export async function getUserInfo() {
  const resp = await fetch('/api/userinfo', { credentials: 'include' });
  if (!resp.ok) throw new Error('Failed');
  return resp.json();
}

export function login() {
  window.location.href = '/auth/login';
}

export async function logout() {
  await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
}

export async function getTaskLists() {
  const resp = await fetch('/api/tasklists', { credentials: 'include' });
  if (!resp.ok) throw new Error('Failed to fetch lists');
  return resp.json();
}

export async function getTasks(tasklistId: string) {
  const url = new URL('/api/tasks', window.location.origin);
  url.searchParams.set('tasklist', tasklistId);
  const resp = await fetch(url.toString(), { credentials: 'include' });
  if (!resp.ok) throw new Error('Failed to fetch tasks');
  return resp.json();
}

export async function patchTask(tasklistId: string, taskId: string, updates: Record<string, any>) {
  const resp = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasklist: tasklistId, updates })
  });
  if (!resp.ok) throw new Error('Failed to update task');
  return resp.json();
}

export async function createTask(tasklistId: string, task: Record<string, any>, opts?: { parent?: string, previous?: string }) {
  const resp = await fetch(`/api/tasks`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasklist: tasklistId, task, parent: opts?.parent, previous: opts?.previous })
  })
  if (!resp.ok) throw new Error('Failed to create task')
  return resp.json()
}

export async function deleteTask(tasklistId: string, taskId: string) {
  const url = new URL(`/api/tasks/${encodeURIComponent(taskId)}`, window.location.origin)
  url.searchParams.set('tasklist', tasklistId)
  const resp = await fetch(url.toString(), { method: 'DELETE', credentials: 'include' })
  if (!resp.ok) throw new Error('Failed to delete task')
  return resp.json()
}

export async function moveTask(tasklistId: string, taskId: string, previous?: string, parent?: string) {
  const resp = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/move`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasklist: tasklistId, previous, parent })
  })
  if (!resp.ok) throw new Error('Failed to move task')
  return resp.json()
}

export async function pingServer(): Promise<boolean> {
  try {
    const resp = await fetch('/health', { credentials: 'include' });
    return resp.ok;
  } catch {
    return false;
  }
}