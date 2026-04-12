import fs from "node:fs/promises";
import path from "node:path";

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    case ".heic":
      return "image/heic";
    case ".heif":
      return "image/heif";
    default:
      return "image/png";
  }
}

export async function loadWebMedia(target: string, maxBytes?: number) {
  const filePath = target.startsWith("file://") ? target.slice("file://".length) : target;
  const buffer = await fs.readFile(filePath);
  if (typeof maxBytes === "number" && maxBytes > 0 && buffer.length > maxBytes) {
    throw new Error(`Media exceeds maxBytes (${buffer.length} > ${maxBytes})`);
  }
  return {
    kind: "image" as const,
    buffer,
    contentType: mimeFromPath(filePath),
  };
}
