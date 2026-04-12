/** 虚拟 OpenClaw 配置偏好（OPFS 持久化） */
export type VirtualOpenclawConfigPrefsV1 = {
  version: 1;
  /** 完整 openclaw.json 文本；为空表示使用内置默认 */
  openclawConfigJson: string;
};

const FILENAME = "virtual-openclaw-config-prefs.json";
const DIR = "weclaw";

const defaultPrefs = (): VirtualOpenclawConfigPrefsV1 => ({
  version: 1,
  openclawConfigJson: "",
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

export async function loadVirtualOpenclawConfigPrefs(): Promise<VirtualOpenclawConfigPrefsV1> {
  const dir = await getWeclawDir();
  if (!dir) return { ...defaultPrefs(), openclawConfigJson: memory.openclawConfigJson };
  try {
    const fh = await dir.getFileHandle(FILENAME);
    const file = await fh.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<VirtualOpenclawConfigPrefsV1>;
    if (parsed?.version !== 1) return defaultPrefs();
    return {
      version: 1,
      openclawConfigJson:
        typeof parsed.openclawConfigJson === "string" ? parsed.openclawConfigJson : "",
    };
  } catch {
    return defaultPrefs();
  }
}

export async function saveVirtualOpenclawConfigPrefs(
  prefs: VirtualOpenclawConfigPrefsV1
): Promise<void> {
  memory.openclawConfigJson = prefs.openclawConfigJson;
  const dir = await getWeclawDir();
  if (!dir) return;
  const json = `${JSON.stringify(prefs, null, 2)}\n`;
  const w = await dir.getFileHandle(FILENAME, { create: true });
  const stream = await w.createWritable();
  await stream.write(json);
  await stream.close();
}
