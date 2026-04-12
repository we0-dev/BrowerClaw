export function extractTextFromMessage(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const record = message as { content?: unknown };
  if (typeof record.content === "string") return record.content;
  if (!Array.isArray(record.content)) return "";
  return record.content
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const part = entry as { type?: unknown; text?: unknown };
      return part.type === "text" && typeof part.text === "string" ? part.text : "";
    })
    .filter(Boolean)
    .join("\n");
}
