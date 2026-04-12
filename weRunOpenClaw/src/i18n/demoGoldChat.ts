import type { AppLocale } from "./detectBrowserLocale";
import type { AssistantStepItem } from "../ui/ChatPanel/types";

export function getGoldDemoUserMessage(locale: AppLocale): string {
  return locale === "en" ? "Can you check today's gold prices?" : "帮我看看今天金价";
}

export function getGoldDemoAssistantSteps(locale: AppLocale): AssistantStepItem[] {
  if (locale === "en") {
    return [
      {
        text: "Search for the latest gold price information",
        subtitle: "Web search · gold price today Mar 17, 2026",
      },
      {
        text: "Fetch detailed gold price data for today",
        subtitle: "Web fetch · example gold price site",
      },
      {
        text: "Fetch intraday gold price details",
        subtitle: "Web fetch · historical prices Mar 17, 2026",
      },
      { text: "Here is a summary of gold prices for Mar 17, 2026 (today)." },
    ];
  }
  return [
    { text: "搜索今日最新金价信息", subtitle: "网页搜索 · 今日黄金价格 2026年3月17日" },
    { text: "获取今日黄金价格详细信息", subtitle: "网页获取 · www.huangjinjiage.cn" },
    {
      text: "获取今日金价详情",
      subtitle: "网页获取 · 2026年3月17日历史金价 · 搜金价网",
    },
    { text: "以下是 2026年3月17日（今天） 最新金价汇总。" },
  ];
}
