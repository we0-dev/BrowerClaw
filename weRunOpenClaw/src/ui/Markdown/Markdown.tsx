import { useMemo } from "react";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHref(href: string): string {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^mailto:/i.test(trimmed)) return trimmed;
  if (/^\/\//i.test(trimmed)) return `https:${trimmed}`;
  return "#";
}

function renderInline(escapedText: string): string {
  let out = escapedText;

  // inline code: `...`
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);

  // links: [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, text, href) => {
      const safeHref = sanitizeHref(href);
      const safeText = text;
      return `<a href="${safeHref}" target="_blank" rel="noreferrer">${safeText}</a>`;
    }
  );

  // bold: **...**
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, content) => `<strong>${content}</strong>`);

  // italic: *...* (simple heuristic)
  out = out.replace(/\*([^*]+)\*/g, (_m, content) => `<em>${content}</em>`);

  // strikethrough: ~~...~~
  out = out.replace(/~~([^~]+)~~/g, (_m, content) => `<del>${content}</del>`);

  return out;
}

function isFenceStart(line: string): { lang?: string } | null {
  const m = line.match(/^```(\w+)?\s*$/);
  return m ? { lang: m[1] } : null;
}

function renderMarkdownToHtml(markdown: string): string {
  const src = (markdown ?? "").replace(/\r\n/g, "\n");
  const lines = src.split("\n");

  const blocks: string[] = [];
  let i = 0;

  const isHeading = (line: string) => /^(#{1,6})\s+/.test(line);
  const isBlockquote = (line: string) => /^>\s?/.test(line);
  const isUl = (line: string) => /^(\-|\*|\+)\s+/.test(line);
  const isOl = (line: string) => /^(\d+)\.\s+/.test(line);

  while (i < lines.length) {
    const line = lines[i] ?? "";

    const fence = isFenceStart(line);
    if (fence) {
      const lang = fence.lang;
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !(lines[i] ?? "").match(/^```/)) {
        codeLines.push(lines[i] ?? "");
        i++;
      }
      // skip closing ```
      if (i < lines.length) i++;

      const code = escapeHtml(codeLines.join("\n"));
      blocks.push(
        `<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ""}>${code}</code></pre>`
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    if (isHeading(line)) {
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      const level = Math.min(6, Math.max(1, m?.[1]?.length ?? 1));
      const text = m?.[2] ?? "";
      const content = renderInline(escapeHtml(text));
      blocks.push(`<h${level}>${content}</h${level}>`);
      i++;
      continue;
    }

    if (isBlockquote(line)) {
      const qLines: string[] = [];
      while (i < lines.length && isBlockquote(lines[i] ?? "")) {
        qLines.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i++;
      }
      const content = qLines
        .map((l) => renderInline(escapeHtml(l)))
        .join("<br />");
      blocks.push(`<blockquote>${content}</blockquote>`);
      continue;
    }

    if (isUl(line)) {
      const items: string[] = [];
      while (i < lines.length && isUl(lines[i] ?? "")) {
        const m = (lines[i] ?? "").match(/^(\-|\*|\+)\s+(.+)$/);
        const itemText = m?.[2] ?? "";
        items.push(`<li>${renderInline(escapeHtml(itemText))}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (isOl(line)) {
      const items: string[] = [];
      while (i < lines.length && isOl(lines[i] ?? "")) {
        const m = (lines[i] ?? "").match(/^(\d+)\.\s+(.+)$/);
        const itemText = m?.[2] ?? "";
        items.push(`<li>${renderInline(escapeHtml(itemText))}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // paragraph
    const pLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i] ?? "";
      if (!l.trim()) break;
      if (isFenceStart(l) || isHeading(l) || isBlockquote(l) || isUl(l) || isOl(l)) break;
      pLines.push(l);
      i++;
    }

    const content = pLines
      .map((l) => renderInline(escapeHtml(l)))
      .join("<br />");
    blocks.push(`<p>${content}</p>`);
  }

  return blocks.join("");
}

export function Markdown({
  markdown,
  className = "",
}: {
  markdown: string;
  className?: string;
}) {
  const html = useMemo(() => renderMarkdownToHtml(markdown ?? ""), [markdown]);

  return (
    <div
      className={["we-markdown", className].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

