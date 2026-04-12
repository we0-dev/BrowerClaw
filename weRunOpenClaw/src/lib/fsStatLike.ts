/** Node fs.Stats 用方法；经 postMessage / 序列化后可能是布尔字段 */

export type StatLike = {
  isDirectory?: (() => boolean) | boolean;
  size?: number;
  mtimeMs?: number;
  mtime?: Date | string | number;
};

export function statIsDirectory(stat: StatLike | null | undefined): boolean {
  if (!stat) return false;
  const v = stat.isDirectory;
  if (typeof v === "function") return v.call(stat as object) === true;
  if (typeof v === "boolean") return v;
  return false;
}
