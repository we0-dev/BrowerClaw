import type { MarketPriceTableProps } from "./types";
import { useMemo } from "react";
import { MarketPriceRow } from "./MarketPriceRow";
import { useLocale } from "../../i18n/LocaleContext";
import { getMarketDemoRows } from "../../i18n/marketDemoRows";

export function MarketPriceTable({
  title: titleProp,
  rows: rowsProp,
  className = "",
}: MarketPriceTableProps) {
  const { locale, t } = useLocale();
  const title = titleProp ?? t("marketTitle");
  const rows = useMemo(
    () => rowsProp ?? getMarketDemoRows(locale),
    [rowsProp, locale]
  );
  return (
    <div className={`mt-3 ${className}`}>
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">{t("marketColSymbol")}</th>
              <th className="text-left font-medium px-4 py-2.5">{t("marketColPrice")}</th>
              <th className="text-right font-medium px-4 py-2.5">{t("marketColChange")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <MarketPriceRow key={row.name} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
