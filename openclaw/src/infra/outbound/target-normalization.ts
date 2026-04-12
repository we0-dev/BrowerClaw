export function normalizeTargetForProvider(
  _provider: string,
  target?: string | null,
): string | undefined {
  const normalized = target?.trim();
  return normalized || undefined;
}
