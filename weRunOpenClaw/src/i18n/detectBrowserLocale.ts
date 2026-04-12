export type AppLocale = "zh" | "en";

/** 根据浏览器首选语言判断界面语言：中文变体为 zh，其余为 en */
export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return "zh";
  const list =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  for (const raw of list) {
    const tag = String(raw || "").trim();
    if (!tag) continue;
    if (/^zh/i.test(tag)) return "zh";
  }
  return "en";
}
