import { getBundledSkillCatalog, parseSkillNameFromSkillMd } from "./bundledOpenclawSkillCatalog";
import type { VirtualSkillsPrefsV1 } from "./opfsVirtualSkillsStore";
import {
  OPENCLAW_CONFIG_VFS_PATH,
  OPENCLAW_WORKSPACE_SKILLS_VFS_ROOT,
} from "./openclawVfsPaths";

type WeNodeFs = {
  mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<void>;
  writeFile: (path: string, data: string | Uint8Array) => Promise<void>;
  readFile?: (path: string, encoding?: string) => Promise<string | Uint8Array>;
};

function ensurePosixDirname(path: string) {
  const i = path.lastIndexOf("/");
  if (i <= 0) return "/";
  return path.slice(0, i);
}

async function readUtf8(fs: WeNodeFs, path: string): Promise<string | null> {
  if (typeof fs.readFile !== "function") return null;
  try {
    const buf = await fs.readFile(path, "utf8");
    if (typeof buf === "string") return buf;
    if (buf instanceof Uint8Array) return new TextDecoder().decode(buf);
    return null;
  } catch {
    return null;
  }
}

/**
 * 将 UI 中的技能开关与 SKILL.md 编辑同步到 weNode VFS：
 * - 写入 workspace skills 目录下对应技能的 SKILL.md
 * - 合并 openclaw.json 的 skills.entries[].enabled
 */
export async function applyVirtualOpenclawSkillsToWeNode(
  weNode: unknown,
  prefs: VirtualSkillsPrefsV1
): Promise<void> {
  const fs = (weNode as { fs?: WeNodeFs })?.fs;
  if (!fs?.mkdir || !fs?.writeFile) return;

  const catalog = getBundledSkillCatalog();
  const disabled = new Set(prefs.disabledFolders);

  for (const row of catalog) {
    const md = prefs.skillMdOverrides[row.folder] ?? row.defaultSkillMd;
    const skillKey = parseSkillNameFromSkillMd(md) ?? row.folder;
    const skillDir = `${OPENCLAW_WORKSPACE_SKILLS_VFS_ROOT}/${skillKey}`;
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(`${skillDir}/SKILL.md`, `${md.endsWith("\n") ? md : `${md}\n`}`);
  }

  const cfgText = await readUtf8(fs, OPENCLAW_CONFIG_VFS_PATH);
  if (!cfgText) return;

  let cfg: Record<string, unknown>;
  try {
    cfg = JSON.parse(cfgText) as Record<string, unknown>;
  } catch {
    return;
  }

  const skills =
    cfg.skills && typeof cfg.skills === "object"
      ? ({ ...(cfg.skills as object) } as Record<string, unknown>)
      : {};
  const entriesRaw = skills.entries;
  const entries: Record<string, Record<string, unknown>> =
    entriesRaw && typeof entriesRaw === "object"
      ? { ...(entriesRaw as object) as Record<string, Record<string, unknown>> }
      : {};

  for (const row of catalog) {
    const md = prefs.skillMdOverrides[row.folder] ?? row.defaultSkillMd;
    const skillKey = parseSkillNameFromSkillMd(md) ?? row.folder;

    if (disabled.has(row.folder)) {
      entries[skillKey] = { ...(entries[skillKey] ?? {}), enabled: false };
    } else {
      const cur = entries[skillKey];
      if (!cur) continue;
      const next = { ...cur };
      delete next.enabled;
      if (Object.keys(next).length === 0) {
        delete entries[skillKey];
      } else {
        entries[skillKey] = next;
      }
    }
  }

  skills.entries = entries;
  cfg.skills = skills;
  await fs.writeFile(OPENCLAW_CONFIG_VFS_PATH, `${JSON.stringify(cfg, null, 2)}\n`);
}
