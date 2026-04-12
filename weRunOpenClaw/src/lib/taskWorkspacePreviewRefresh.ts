import { statIsDirectory, type StatLike } from "./fsStatLike";
import { openclawTaskWorkspaceVfsPath } from "./syncChatToOpenclawWorkspace";

type PreviewWatchFs = {
  readdir?: (path: string) => Promise<string[] | { name: string }[]>;
  readdirSync?: (path: string) => string[];
  stat?: (path: string) => Promise<StatLike>;
  statSync?: (path: string) => StatLike;
};

const IGNORED_DIR_NAMES = new Set([".cache", ".git", ".vite", "node_modules"]);
const IGNORED_FILE_NAMES = new Set(["chat.md", "task.json", "weclaw-chat.jsonl"]);

function getFs(weNode: unknown): PreviewWatchFs | null {
  return (weNode as { fs?: PreviewWatchFs })?.fs ?? null;
}

function normalizeReaddirNames(raw: string[] | { name: string }[]): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => (typeof entry === "string" ? entry : entry?.name))
    .filter((entry): entry is string => !!entry && entry !== "." && entry !== "..")
    .sort((a, b) => a.localeCompare(b));
}

function statMtimeMs(
  stat: { mtimeMs?: number; mtime?: Date | string | number } | null | undefined
): number {
  if (!stat) return 0;
  if (typeof stat.mtimeMs === "number" && Number.isFinite(stat.mtimeMs)) return stat.mtimeMs;
  const raw = stat.mtime;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

async function readDirNames(fs: PreviewWatchFs, dirPath: string): Promise<string[]> {
  if (typeof fs.readdir === "function") {
    return normalizeReaddirNames(await fs.readdir(dirPath));
  }
  if (typeof fs.readdirSync === "function") {
    return [...fs.readdirSync(dirPath)].map(String).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }
  return [];
}

async function readStat(
  fs: PreviewWatchFs,
  filePath: string
): Promise<StatLike | null> {
  try {
    if (typeof fs.stat === "function") return await fs.stat(filePath);
    if (typeof fs.statSync === "function") return fs.statSync(filePath);
  } catch {
    return null;
  }
  return null;
}

async function collectWorkspaceFingerprint(
  fs: PreviewWatchFs,
  dirPath: string,
  prefix: string,
  out: string[]
): Promise<void> {
  let names: string[] = [];
  try {
    names = await readDirNames(fs, dirPath);
  } catch {
    return;
  }

  for (const name of names) {
    const rel = prefix ? `${prefix}/${name}` : name;
    const fullPath = `${dirPath.replace(/\/+$/, "")}/${name}`;
    const stat = await readStat(fs, fullPath);
    const isDirectory = statIsDirectory(stat);

    if (isDirectory) {
      if (IGNORED_DIR_NAMES.has(name)) continue;
      await collectWorkspaceFingerprint(fs, fullPath, rel, out);
      continue;
    }

    if (IGNORED_FILE_NAMES.has(name)) continue;
    out.push(`${rel}:${stat?.size ?? 0}:${statMtimeMs(stat)}`);
  }
}

export async function buildTaskWorkspacePreviewFingerprint(
  weNode: unknown,
  taskId: string
): Promise<string | null> {
  const fs = getFs(weNode);
  if (!fs) return null;
  const root = openclawTaskWorkspaceVfsPath(taskId);
  const out: string[] = [];
  await collectWorkspaceFingerprint(fs, root, "", out);
  return out.join("|");
}
