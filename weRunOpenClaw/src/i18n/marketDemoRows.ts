import type { AppLocale } from "./detectBrowserLocale";
import type { MarketPriceRow } from "../ui/MarketPriceTable/types";

export function getMarketDemoRows(locale: AppLocale): MarketPriceRow[] {
  if (locale === "en") {
    return [
      { name: "Spot gold (intl.)", price: "USD 5,007.79 / oz", change: "+0.06%", up: true },
      { name: "NY gold", price: "USD 5,013 / oz", change: "+0.03%", up: true },
      {
        name: "SGE Au9999",
        price: "CNY 1,116 / g",
        change: "+0.13%",
        up: true,
      },
      { name: "ICBC paper gold", price: "CNY 1,108.59 / g", change: "+0.38%", up: true },
      { name: "Buyback (est.)", price: "CNY 1,105 / g", change: "+0.27%", up: true },
    ];
  }
  return [
    { name: "国际现货黄金", price: "5,007.79 美元/盎司", change: "+0.06%", up: true },
    { name: "纽约黄金", price: "5,013 美元/盎司", change: "+0.03%", up: true },
    {
      name: "上海黄金交易所（Au9999）",
      price: "1,116 元/克",
      change: "+0.13%",
      up: true,
    },
    { name: "工行纸黄金", price: "1,108.59 元/克", change: "+0.38%", up: true },
    { name: "黄金回收价", price: "1,105 元/克", change: "+0.27%", up: true },
  ];
}
