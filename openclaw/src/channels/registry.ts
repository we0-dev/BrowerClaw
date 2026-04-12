export const CHANNEL_IDS: string[] = [];
export const CHAT_CHANNEL_ORDER: string[] = [];

export function normalizeChatChannelId(raw?: string | null): string | undefined {
  const normalized = raw?.trim().toLowerCase();
  return normalized || undefined;
}
