// client/src/components/TaskListPicker.tsx
import { useEffect, useState } from "react";
import { useRememberedTaskList, type TaskList } from "../hooks/useRememberedTaskList";

/**
 * Drop-in TaskList picker that:
 * - fetches /api/me (to scope localStorage key by email if present)
 * - fetches /api/tasklists
 * - remembers last selected list across refreshes/logins
 *
 * Use this component directly, or copy the hook usage into your own UI.
 * Emits the selected list id via `onChange`.
 */
export default function TaskListPicker({
  onChange,
  className,
}: {
  onChange?: (listId: string) => void;
  className?: string;
}) {
  const [me, setMe] = useState<{ email: string | null }>({ email: null });
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : { email: null }))
      .then((m) => setMe(m ?? { email: null }))
      .catch(() => setMe({ email: null }));
  }, []);

  useEffect(() => {
    fetch("/api/tasklists")
      .then((r) => r.json())
      .then((lists: TaskList[]) => setTaskLists(lists))
      .catch(() => setTaskLists([]));
  }, []);

  const { selectedListId, onSelectList } = useRememberedTaskList(taskLists, me.email);

  useEffect(() => {
    if (selectedListId && onChange) onChange(selectedListId);
  }, [selectedListId, onChange]);

  if (!taskLists.length) {
    return <div className={className}>Loading task lists…</div>;
  }

  return (
    <select
      className={className}
      value={selectedListId ?? ""}
      onChange={(e) => onSelectList(e.target.value)}
    >
      {taskLists.map((l) => (
        <option key={l.id} value={l.id}>
          {l.title}
        </option>
      ))}
    </select>
  );
}
