/** 虚拟 OpenClaw 技能偏好（OPFS 持久化） */
export type VirtualSkillsPrefsV1 = {
  version: 1;
  /** 按 folder 关闭的技能；应用时映射为 openclaw.json skills.entries[name].enabled */
  disabledFolders: string[];
  /** 覆盖整个 SKILL.md 正文（含 frontmatter），key 为 folder */
  skillMdOverrides: Record<string, string>;
};

const FILENAME = "virtual-skills-prefs.json";
const DIR = "weclaw";

const defaultPrefs = (): VirtualSkillsPrefsV1 => ({
  version: 1,
  disabledFolders: [],
  skillMdOverrides: {},
});

const memory = defaultPrefs();

function isOpfsAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.storage?.getDirectory;
}

async function getWeclawDir(): Promise<FileSystemDirectoryHandle | null> {
  if (!isOpfsAvailable()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(DIR, { create: true });
  } catch {
    return null;
  }
}

export async function loadVirtualSkillsPrefs(): Promise<VirtualSkillsPrefsV1> {
  const dir = await getWeclawDir();
  if (!dir) return { ...defaultPrefs(), skillMdOverrides: { ...memory.skillMdOverrides } };
  try {
    const fh = await dir.getFileHandle(FILENAME);
    const file = await fh.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<VirtualSkillsPrefsV1>;
    if (parsed?.version !== 1) return defaultPrefs();
    return {
      version: 1,
      disabledFolders: Array.isArray(parsed.disabledFolders)
        ? parsed.disabledFolders.map(String)
        : [],
      skillMdOverrides:
        parsed.skillMdOverrides && typeof parsed.skillMdOverrides === "object"
          ? { ...parsed.skillMdOverrides }
          : {},
    };
  } catch {
    return defaultPrefs();
  }
}

export async function saveVirtualSkillsPrefs(prefs: VirtualSkillsPrefsV1): Promise<void> {
  memory.disabledFolders = [...prefs.disabledFolders];
  memory.skillMdOverrides = { ...prefs.skillMdOverrides };
  const dir = await getWeclawDir();
  if (!dir) return;
  const json = `${JSON.stringify(prefs, null, 2)}\n`;
  const w = await dir.getFileHandle(FILENAME, { create: true });
  const stream = await w.createWritable();
  await stream.write(json);
  await stream.close();
}
