/** 每任务工作区文件（dist/output 等）存 OPFS，与 task/*.json 会话记录用同一 task id，避免任务间串数据 */

const ROOT_DIR = "task_ws";

function isOpfsAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.storage?.getDirectory;
}

function safeSegment(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function getRoot(): Promise<FileSystemDirectoryHandle | null> {
  if (!isOpfsAvailable()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(ROOT_DIR, { create: true });
  } catch {
    return null;
  }
}

async function getTaskDir(taskId: string, create: boolean): Promise<FileSystemDirectoryHandle | null> {
  const root = await getRoot();
  if (!root) return null;
  try {
    return await root.getDirectoryHandle(safeSegment(taskId), { create });
  } catch {
    return null;
  }
}

async function removeEntryRecursive(dir: FileSystemDirectoryHandle, name: string): Promise<void> {
  try {
    await dir.removeEntry(name, { recursive: true });
  } catch {
    // ignore
  }
}

/** 删除某任务在 OPFS 中的工作区目录 */
export async function deleteOpfsTaskWorkspace(taskId: string): Promise<void> {
  const root = await getRoot();
  if (!root) return;
  await removeEntryRecursive(root, safeSegment(taskId));
}

type OpfsWrite = { rel: string; data: Uint8Array };

async function ensureParentDirs(root: FileSystemDirectoryHandle, rel: string): Promise<FileSystemFileHandle> {
  const parts = rel.split("/").filter(Boolean);
  const fileName = parts.pop()!;
  let cur: FileSystemDirectoryHandle = root;
  for (const p of parts) {
    cur = await cur.getDirectoryHandle(p, { create: true });
  }
  return cur.getFileHandle(fileName, { create: true });
}

export async function writeOpfsTaskWorkspaceFiles(taskId: string, files: OpfsWrite[]): Promise<void> {
  const dir = await getTaskDir(taskId, true);
  if (!dir || files.length === 0) return;
  for (const { rel, data } of files) {
    try {
      const handle = await ensureParentDirs(dir, rel);
      const writable = await handle.createWritable();
      await writable.write(new Uint8Array(data));
      await writable.close();
    } catch {
      // skip bad path
    }
  }
}

export async function clearOpfsTaskWorkspace(taskId: string): Promise<void> {
  const root = await getRoot();
  if (!root) return;
  await removeEntryRecursive(root, safeSegment(taskId));
  await getTaskDir(taskId, true);
}

export type OpfsWorkspaceFile = { rel: string; data: Uint8Array };

async function readDirRecursive(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  out: OpfsWorkspaceFile[]
): Promise<void> {
  for await (const [name, handle] of dir.entries()) {
    const rel = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "directory") {
      await readDirRecursive(handle as FileSystemDirectoryHandle, rel, out);
    } else {
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        const buf = new Uint8Array(await file.arrayBuffer());
        out.push({ rel, data: buf });
      } catch {
        // skip
      }
    }
  }
}

/** 列出某任务 OPFS 工作区内所有文件（相对 task_ws/<id>/） */
export async function listOpfsTaskWorkspaceFiles(taskId: string): Promise<OpfsWorkspaceFile[]> {
  const dir = await getTaskDir(taskId, false);
  if (!dir) return [];
  const out: OpfsWorkspaceFile[] = [];
  await readDirRecursive(dir, "", out);
  return out;
}
