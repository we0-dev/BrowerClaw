export function listChannelPlugins() {
  return [];
}

export function getChannelPlugin(_id?: string | null) {
  return undefined;
}

export function normalizeChannelId(raw?: string | null): string | undefined {
  const normalized = raw?.trim().toLowerCase();
  return normalized || undefined;
}
