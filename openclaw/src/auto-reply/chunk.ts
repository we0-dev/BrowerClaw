export function chunkText(text: string, limit: number): string[] {
  if (!text) return [];
  if (!Number.isFinite(limit) || limit <= 0 || text.length <= limit) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += limit) {
    chunks.push(text.slice(i, i + limit));
  }
  return chunks;
}
