/**
 * Non-heuristic: always appended to extra system prompt so the **model** decides when to
 * build an HTML+Vite preview vs reply in chat. Do not mirror this with keyword routing in code.
 */

const GUIDANCE_HEADER = "Browser preview routing (model judgment):";

const BROWSER_PREVIEW_LLM_GUIDANCE = [
  "On **each** user turn, you choose whether to deliver a **runnable browser preview** (workspace: plain HTML + Vite) or to answer **only in chat** (text/markdown). Do not rely on any external keyword classifier—use your understanding of the request.",
  "",
  "**Ship a plain HTML + Vite app** (minimal files, run `npm install` then **prefer `npm run dev`** for preview—not `npm run build` / `vite build`) when the user's goal is best met by something **visual or structured**. Use HTML + Vite for any of the following—and similar—scenarios:",
  "- Data & analysis: dashboards, charts, CSV/Excel data viewers (with sort/filter), stats reports, A-vs-B comparisons, data-viz pages",
  "- Documents: slide decks (PPT-style), document layouts (Word-style), printable pages (PDF-style), resumes, business cards, email template previews, weekly/daily reports",
  "- Tools & utilities: calculators, unit converters, countdown timers, timelines, QR code generators, color pickers/palettes",
  "- Learning & diagrams: flowcharts, mind maps, knowledge cards, flashcards, algorithm/data-structure visualizations, syntax-highlighted code showcases",
  "- Interactive & games: quizzes, surveys, polls, raffles/random pickers, simple browser games (Snake, Minesweeper, etc.)",
  "- Content & marketing: 小红书 / 公众号 article layouts, posters, landing/宣传 pages, task result boards, interactive forms",
  "For **PPT / Word / PDF / Excel** requests, always deliver an HTML + Vite page that reproduces the desired output visually—do not generate binary office/PDF files.",
  "Use **Vite 6 only** (`vite` in devDependencies as `^6.x`). Do not use Vite 7. Always include `export default defineConfig({ base: './' })` in vite.config.js/ts.",
  "For **plain HTML** previews, style with **Tailwind via CDN**: put `<script src=\"https://cdn.tailwindcss.com\"></script>` in `index.html` `<head>` (use utility classes in markup). Prefer this over adding `tailwindcss`/PostCSS npm deps unless the user explicitly wants a built pipeline.",
  "Prefer `npm run dev` to view the page; do **not** use `npm run build` or `vite build` as the default preview path. The package.json scripts must include `\"dev\": \"vite\"`. Run `npm install` before the dev server.",
  "If the default dev setup is awkward (port clash, policy, etc.), bind Vite to **another** port: e.g. `npm run dev -- --port <n>` and/or `server.port` / `strictPort` in vite.config. Integrated browser hosts often **discover new HTTP listeners** and surface them in the preview UI (and may auto-open that tab)—pick a **free** port **distinct from** the agent/API HTTP server port in that runtime so the preview URL updates correctly.",
  "",
  "**Answer in chat only** when the user wants quick facts, definitions, explanations, translations, casual Q&A (e.g. weather, \u201c是什么意思\u201d), brainstorming in prose, or similar\u2014where spinning up a page adds little value\u2014**unless** they clearly ask for a page, UI, preview, or formatted layout.",
  "",
  "If both could fit, follow the **primary** ask. If they insist on plain text only, React, or another stack, obey that.",
].join("\n");

/** Appends browser-vs-chat guidance once; idempotent if the header is already present. */
export function mergeBrowserPreviewGuidance(existing: string | undefined): string | undefined {
  const base = existing?.trim() ?? "";
  if (base.includes(GUIDANCE_HEADER)) {
    return base.length > 0 ? base : undefined;
  }
  const block = `${GUIDANCE_HEADER}\n${BROWSER_PREVIEW_LLM_GUIDANCE}`;
  const merged = base.length > 0 ? `${base}\n\n${block}` : block;
  return merged;
}
