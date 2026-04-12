import { useCallback, useEffect, useState } from "react";
import type { PersistedChatMessage, TaskRecord } from "../lib/opfsTaskStore";
import {
  deleteTaskRecord,
  listTaskRecords,
  loadTaskRecord,
  opfsTasksSupported,
  saveTaskRecord,
} from "../lib/opfsTaskStore";
import { deleteOpfsTaskWorkspace } from "../lib/opfsTaskWorkspaceStore";
import { useLocale } from "../i18n/LocaleContext";
import {
  formatTaskListSubtitle,
  getNewTaskTitle,
  isDefaultNewTaskTitle,
} from "../i18n/messages";

export interface TaskListEntry {
  id: string;
  title: string;
  subtitle: string;
}

export function useOpfsTasks() {
  const { locale } = useLocale();
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<TaskListEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRecord, setActiveRecord] = useState<TaskRecord | null>(null);

  const refreshList = useCallback(async () => {
    const list = await listTaskRecords();
    setTasks(
      list.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: formatTaskListSubtitle(locale, r.updatedAt, r.messages.length),
      }))
    );
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshList();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshList]);

  const selectTask = useCallback(
    async (id: string) => {
      const rec = await loadTaskRecord(id);
      if (!rec) return;
      setActiveId(id);
      setActiveRecord(rec);
    },
    []
  );

  const createTask = useCallback(async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: TaskRecord = {
      id,
      title: getNewTaskTitle(locale),
      subtitle: "",
      updatedAt: now,
      sessionId: null,
      messages: [],
    };
    await saveTaskRecord(record);
    await refreshList();
    setActiveId(id);
    setActiveRecord(record);
    return id;
  }, [refreshList, locale]);

  const deleteTask = useCallback(
    async (id: string) => {
      await deleteTaskRecord(id);
      await deleteOpfsTaskWorkspace(id);
      setActiveId((cur) => (cur === id ? null : cur));
      setActiveRecord((cur) => (cur?.id === id ? null : cur));
      await refreshList();
    },
    [refreshList]
  );

  const persistConversation = useCallback(
    async (
      taskId: string,
      messages: PersistedChatMessage[],
      sessionId: string | null
    ): Promise<TaskRecord | null> => {
      const prev = await loadTaskRecord(taskId);
      if (!prev) return null;
      const now = new Date().toISOString();
      const firstUser = messages.find((m) => m.role === "user");
      const line = firstUser?.content?.trim() ?? "";
      const nextTitle =
        isDefaultNewTaskTitle(prev.title) && line
          ? line.length > 40
            ? `${line.slice(0, 40)}…`
            : line
          : prev.title;

      const next: TaskRecord = {
        ...prev,
        title: nextTitle,
        updatedAt: now,
        messages,
        sessionId,
      };
      await saveTaskRecord(next);
      await refreshList();
      setActiveRecord((cur) => (cur?.id === taskId ? next : cur));
      return next;
    },
    [refreshList]
  );

  return {
    ready,
    opfsSupported: opfsTasksSupported(),
    tasks,
    activeId,
    activeRecord,
    selectTask,
    createTask,
    deleteTask,
    persistConversation,
    refreshList,
  };
}
