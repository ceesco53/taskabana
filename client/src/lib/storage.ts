// client/src/lib/storage.ts
// Persist & retrieve the last-selected Google Task list (optionally per user).

const keyFor = (userEmail?: string | null) =>
  userEmail ? `taskabana:selectedTaskList:${userEmail}` : `taskabana:selectedTaskList`;

export const saveSelectedTaskList = (listId: string, userEmail?: string | null) => {
  try {
    localStorage.setItem(keyFor(userEmail), listId);
  } catch {}
};

export const loadSelectedTaskList = (userEmail?: string | null): string | null => {
  try {
    return localStorage.getItem(keyFor(userEmail));
  } catch {
    return null;
  }
};

export const clearSelectedTaskList = (userEmail?: string | null) => {
  try {
    localStorage.removeItem(keyFor(userEmail));
  } catch {}
};
