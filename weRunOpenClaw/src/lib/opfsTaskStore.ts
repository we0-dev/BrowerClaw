export interface PersistedChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  sessionId: string | null;
  messages: PersistedChatMessage[];
}

const TASK_DIR = "task";
const memoryStore = new Map<string, TaskRecord>();

function isOpfsAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.storage?.getDirectory;
}

async function getTaskDir(): Promise<FileSystemDirectoryHandle | null> {
  if (!isOpfsAvailable()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(TASK_DIR, { create: true });
  } catch {
    return null;
  }
}

function taskFileName(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safe}.json`;
}

export async function loadTaskRecord(id: string): Promise<TaskRecord | null> {
  const dir = await getTaskDir();
  if (!dir) {
    return memoryStore.get(id) ?? null;
  }
  try {
    const handle = await dir.getFileHandle(taskFileName(id));
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text) as TaskRecord;
    if (!parsed?.id || parsed.id !== id) return null;
    if (!Array.isArray(parsed.messages)) parsed.messages = [];
    memoryStore.set(id, parsed);
    return parsed;
  } catch {
    return memoryStore.get(id) ?? null;
  }
}

export async function saveTaskRecord(record: TaskRecord): Promise<void> {
  memoryStore.set(record.id, record);
  const dir = await getTaskDir();
  if (!dir) return;
  const handle = await dir.getFileHandle(taskFileName(record.id), { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(record, null, 0));
  await writable.close();
}

export async function deleteTaskRecord(id: string): Promise<void> {
  memoryStore.delete(id);
  const dir = await getTaskDir();
  if (!dir) return;
  try {
    await dir.removeEntry(taskFileName(id));
  } catch {
    // 文件不存在或无法删除时忽略
  }
}

export async function listTaskRecords(): Promise<TaskRecord[]> {
  const dir = await getTaskDir();
  if (!dir) {
    return Array.from(memoryStore.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  const out: TaskRecord[] = [];
  try {
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind !== "file" || !name.endsWith(".json")) continue;
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        const text = await file.text();
        const parsed = JSON.parse(text) as TaskRecord;
        if (parsed?.id && Array.isArray(parsed.messages)) {
          out.push(parsed);
          memoryStore.set(parsed.id, parsed);
        }
      } catch {
        // 跳过损坏条目
      }
    }
  } catch {
    return Array.from(memoryStore.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  return out.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function opfsTasksSupported(): boolean {
  return isOpfsAvailable();
}
