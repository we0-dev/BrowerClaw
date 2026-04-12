import type { TaskRecord } from "./opfsTaskStore";
import {
  clearOpfsTaskWorkspace,
  listOpfsTaskWorkspaceFiles,
  writeOpfsTaskWorkspaceFiles,
} from "./opfsTaskWorkspaceStore";
import { mirrorOneTask, openclawTaskWorkspaceVfsPath } from "./syncChatToOpenclawWorkspace";
import { vfsListDir, type VfsEntry } from "./weNodeVfs";

type WeNodeFs = {
  mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<void>;
  writeFile: (path: string, data: string | Uint8Array) => Promise<void>;
  readFile?: (path: string, enc?: string) => Promise<string | Uint8Array>;
  readdir?: (path: string) => Promise<string[] | { name: string }[]>;
  rm?: (path: string, opts?: { recursive?: boolean; force?: boolean }) => Promise<void>;
  unlink?: (path: string) => Promise<void>;
  rmdir?: (path: string) => Promise<void>;
};

function getFs(weNode: unknown): WeNodeFs | null {
  const fs = (weNode as { fs?: WeNodeFs })?.fs;
  if (!fs?.mkdir || !fs?.writeFile) return null;
  return fs;
}

/** task.json 与派生聊天记录以 OPFS task/*.json 与 mirror 为准，不写入 task_ws，避免旧副本覆盖 hydrate */
const SKIP_EXPORT_NAMES = new Set(["task.json", "chat.md", "weclaw-chat.jsonl"]);

async function vfsRmRecursive(weNode: unknown, dirPath: string): Promise<void> {
  const fs = getFs(weNode);
  if (!fs) return;
  const posix = dirPath.replace(/\/+$/, "");
  try {
    if (typeof fs.rm === "function") {
      await fs.rm(posix, { recursive: true, force: true });
      return;
    }
  } catch {
    // fall through
  }
  await vfsRmRecursiveManual(weNode, posix);
}

async function vfsRmRecursiveManual(weNode: unknown, dirPath: string): Promise<void> {
  const fs = getFs(weNode);
  if (!fs) return;
  let entries: VfsEntry[] = [];
  try {
    entries = await vfsListDir(weNode, dirPath);
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.kind === "dir") {
      await vfsRmRecursiveManual(weNode, e.path);
    } else if (typeof fs.unlink === "function") {
      try {
        await fs.unlink(e.path);
      } catch {
        // ignore
      }
    }
  }
  if (typeof fs.rmdir === "function") {
    try {
      await fs.rmdir(dirPath);
    } catch {
      // ignore
    }
  }
}

async function readVfsFileRaw(weNode: unknown, path: string): Promise<Uint8Array | null> {
  const fs = getFs(weNode);
  if (!fs?.readFile) return null;
  try {
    const buf = await fs.readFile(path);
    if (buf instanceof Uint8Array) return buf;
    if (typeof buf === "string") return new TextEncoder().encode(buf);
  } catch {
    return null;
  }
  return null;
}

async function exportVfsDirToBuffers(
  weNode: unknown,
  vfsDir: string,
  prefix: string,
  out: { rel: string; data: Uint8Array }[]
): Promise<void> {
  const entries = await vfsListDir(weNode, vfsDir);
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.kind === "dir") {
      await exportVfsDirToBuffers(weNode, e.path, rel, out);
    } else if (!SKIP_EXPORT_NAMES.has(e.name)) {
      const data = await readVfsFileRaw(weNode, e.path);
      if (data) out.push({ rel, data });
    }
  }
}

/** 虚拟任务工作区（除 task.json）写入 OPFS，供切换任务后恢复 */
export async function flushTaskWorkspaceVfsToOpfs(weNode: unknown, taskId: string): Promise<void> {
  const root = openclawTaskWorkspaceVfsPath(taskId);
  const out: { rel: string; data: Uint8Array }[] = [];
  await exportVfsDirToBuffers(weNode, root, "", out);
  await clearOpfsTaskWorkspace(taskId);
  if (out.length > 0) {
    await writeOpfsTaskWorkspaceFiles(taskId, out);
  }
}

/** 用 OPFS 中的工作区文件覆盖 VFS（不删整树；由 hydrate 先删） */
export async function importOpfsTaskWorkspaceToVfs(weNode: unknown, taskId: string): Promise<void> {
  const fs = getFs(weNode);
  if (!fs) return;
  const vfsRoot = openclawTaskWorkspaceVfsPath(taskId);
  const files = await listOpfsTaskWorkspaceFiles(taskId);
  for (const { rel, data } of files) {
    if (!rel || rel.split("/").some((p) => p === ".." || p === ".")) continue;
    const path = `${vfsRoot}/${rel}`;
    const i = path.lastIndexOf("/");
    const parent = i > 0 ? path.slice(0, i) : vfsRoot;
    await fs.mkdir(parent, { recursive: true });
    await fs.writeFile(path, data);
  }
}

/**
 * 重建当前任务在 VFS 中的目录：先清空再写入 task.json（与 OPFS 会话一致），再合并 OPFS 工作区文件。
 */
export async function hydrateTaskWorkspaceVfs(weNode: unknown, record: TaskRecord): Promise<void> {
  const fs = getFs(weNode);
  if (!fs) return;
  const root = openclawTaskWorkspaceVfsPath(record.id);
  await vfsRmRecursive(weNode, root);
  await mirrorOneTask(fs, record);
  await importOpfsTaskWorkspaceToVfs(weNode, record.id);
}

/** 仅删除 VFS 中该任务目录（OPFS 由 opfsTaskStore / deleteOpfsTaskWorkspace 处理） */
export async function purgeTaskWorkspaceVfsFolder(weNode: unknown, taskId: string): Promise<void> {
  await vfsRmRecursive(weNode, openclawTaskWorkspaceVfsPath(taskId));
}
