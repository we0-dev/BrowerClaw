export type NormalizedChatType = "dm" | "group" | "thread" | "channel";

export function normalizeChatType(raw?: string | null): NormalizedChatType | undefined {
  const normalized = raw?.trim().toLowerCase();
  if (
    normalized === "dm" ||
    normalized === "group" ||
    normalized === "thread" ||
    normalized === "channel"
  ) {
    return normalized;
  }
  return undefined;
}
