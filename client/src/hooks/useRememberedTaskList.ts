// client/src/hooks/useRememberedTaskList.ts
import { useEffect, useMemo, useState, useCallback } from "react";
import { loadSelectedTaskList, saveSelectedTaskList } from "../lib/storage";

export type TaskList = { id: string; title: string };

/**
 * Given a set of Google Task lists and (optionally) a user email, returns
 * a remembered selection that persists across refreshes/logins.
 * - Restores remembered list if it still exists, otherwise first list.
 * - Persists on user change.
 */
export function useRememberedTaskList(
  taskLists: TaskList[] | undefined,
  userEmail?: string | null
) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Restore when lists (and identity) are known
  useEffect(() => {
    if (!taskLists || taskLists.length === 0) return;
    const restored = loadSelectedTaskList(userEmail);
    const match = restored && taskLists.find((l) => l.id === restored);
    const initial = (match?.id) || taskLists[0].id;
    setSelectedListId((prev) => prev ?? initial);
  }, [taskLists, userEmail]);

  // Persist whenever user selects a new list
  const onSelectList = useCallback(
    (listId: string) => {
      setSelectedListId(listId);
      saveSelectedTaskList(listId, userEmail);
    },
    [userEmail]
  );

  const selectedList = useMemo(
    () => (selectedListId ? taskLists?.find((l) => l.id === selectedListId) ?? null : null),
    [taskLists, selectedListId]
  );

  return { selectedListId, selectedList, onSelectList, setSelectedListId };
}
