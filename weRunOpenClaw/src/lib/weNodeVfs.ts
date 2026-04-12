/** 与 weNode 暴露的 fs 做最小能力探测（不同版本 API 可能略有差异） */

import { statIsDirectory, type StatLike } from "./fsStatLike";

export type VfsEntry = {
  name: string;
  path: string;
  kind: "file" | "dir";
};

type AnyFs = {
  readdir?: (path: string) => Promise<string[] | { name: string }[]>;
  readdirSync?: (path: string) => string[];
  stat?: (path: string) => Promise<StatLike>;
  statSync?: (path: string) => StatLike;
  readFile?: (path: string, enc?: string) => Promise<string | Uint8Array>;
  readFileSync?: (path: string, enc?: string) => string | Uint8Array;
};

function getFs(weNode: unknown): AnyFs | null {
  const fs = (weNode as { fs?: AnyFs })?.fs;
  return fs ?? null;
}

function normalizeReaddirNames(raw: string[] | { name: string }[]): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => (typeof x === "string" ? x : x.name)).filter(Boolean);
}

export async function vfsListDir(weNode: unknown, dirPath: string): Promise<VfsEntry[]> {
  const fs = getFs(weNode);
  if (!fs) return [];
  const posix = dirPath.replace(/\/+$/, "");
  let names: string[] = [];
  try {
    if (typeof fs.readdir === "function") {
      names = normalizeReaddirNames(await fs.readdir(posix));
    } else if (typeof fs.readdirSync === "function") {
      names = [...fs.readdirSync(posix)].map(String);
    }
  } catch {
    return [];
  }

  const out: VfsEntry[] = [];
  for (const name of names) {
    if (name === "." || name === "..") continue;
    const full = `${posix}/${name}`;
    let kind: VfsEntry["kind"] = "file";
    try {
      if (typeof fs.stat === "function") {
        const st = await fs.stat(full);
        kind = statIsDirectory(st) ? "dir" : "file";
      } else if (typeof fs.statSync === "function") {
        const st = fs.statSync(full);
        kind = statIsDirectory(st) ? "dir" : "file";
      } else {
        try {
          if (typeof fs.readdir === "function") {
            await fs.readdir(full);
            kind = "dir";
          } else if (typeof fs.readdirSync === "function") {
            fs.readdirSync(full);
            kind = "dir";
          }
        } catch {
          kind = "file";
        }
      }
    } catch {
      kind = "file";
    }
    out.push({ name, path: full, kind });
  }
  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

export async function vfsReadText(weNode: unknown, filePath: string): Promise<string | null> {
  const fs = getFs(weNode);
  if (!fs) return null;
  try {
    if (typeof fs.readFile === "function") {
      const buf = await fs.readFile(filePath, "utf8");
      if (typeof buf === "string") return buf;
      if (buf instanceof Uint8Array) return new TextDecoder().decode(buf);
      return null;
    }
    if (typeof fs.readFileSync === "function") {
      const buf = fs.readFileSync(filePath, "utf8");
      return typeof buf === "string" ? buf : null;
    }
  } catch {
    return null;
  }
  return null;
}

const ARTIFACT_EXT = /\.(html?|md|txt|json|css|js|mjs|cjs)$/i;

async function walkArtifacts(
  weNode: unknown,
  dir: string,
  maxDepth: number,
  prefix: string,
  out: { relPath: string; path: string }[]
): Promise<void> {
  if (maxDepth <= 0) return;
  const entries = await vfsListDir(weNode, dir);
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.kind === "dir") {
      await walkArtifacts(weNode, e.path, maxDepth - 1, rel, out);
    } else if (ARTIFACT_EXT.test(e.name)) {
      out.push({ relPath: rel, path: e.path });
    }
  }
}

/** 产物：dist/ 下常见文本产物 + 任务根目录的 md/html */
export async function vfsCollectTaskArtifacts(
  weNode: unknown,
  taskRootPath: string
): Promise<{ relPath: string; path: string }[]> {
  const out: { relPath: string; path: string }[] = [];
  const dist = `${taskRootPath.replace(/\/+$/, "")}/dist`;
  await walkArtifacts(weNode, dist, 6, "dist", out);

  const rootEntries = await vfsListDir(weNode, taskRootPath);
  for (const e of rootEntries) {
    if (e.kind !== "file") continue;
    if (e.name === "task.json") continue;
    if (/\.(md|html?)$/i.test(e.name)) {
      out.push({ relPath: e.name, path: e.path });
    }
  }
  const outputDir = `${taskRootPath.replace(/\/+$/, "")}/output`;
  await walkArtifacts(weNode, outputDir, 4, "output", out);

  const seen = new Set<string>();
  return out.filter((x) => {
    if (seen.has(x.path)) return false;
    seen.add(x.path);
    return true;
  });
}
