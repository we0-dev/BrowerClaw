// NOTE: This file lives at weRunOpenClaw/src/lib/. The correct relative path to
// the sibling openclaw/skills directory is "../../../openclaw/skills/...".
const SKILL_MD_GLOB = import.meta.glob("../../../openclaw/skills/*/SKILL.md", {
  as: "raw",
  eager: true,
}) as Record<string, string>;

export type BundledSkillRow = {
  /** 仓库内 skills 子目录名，作为稳定 id */
  folder: string;
  defaultSkillMd: string;
};

/** 从 SKILL.md 前置元数据解析 `name:`，供写入 openclaw.json skills.entries */
export function parseSkillNameFromSkillMd(content: string): string | null {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const block = m[1];
  const line = block.match(/^\s*name:\s*(.+?)\s*$/m);
  if (!line) return null;
  let v = line[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v || null;
}

export function getBundledSkillCatalog(): BundledSkillRow[] {
  const rows: BundledSkillRow[] = [];
  for (const [path, raw] of Object.entries(SKILL_MD_GLOB)) {
    const match = path.match(/\/skills\/([^/]+)\/SKILL\.md$/);
    if (!match) continue;
    rows.push({ folder: match[1], defaultSkillMd: raw });
  }
  rows.sort((a, b) => a.folder.localeCompare(b.folder));
  return rows;
}
