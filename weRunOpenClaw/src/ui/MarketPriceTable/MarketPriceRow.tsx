import type { MarketPriceRow as RowType } from "./types";

export interface MarketPriceRowProps {
  row: RowType;
}

export function MarketPriceRow({ row }: MarketPriceRowProps) {
  return (
    <tr className="text-zinc-800">
      <td className="px-4 py-3">{row.name}</td>
      <td className="px-4 py-3">{row.price}</td>
      <td className="px-4 py-3 text-right">
        <span
          className={row.up !== false ? "text-emerald-600" : "text-rose-600"}
        >
          {row.change}
        </span>
        <span className="text-zinc-400 ml-1">{row.up !== false ? "↑" : "↓"}</span>
      </td>
    </tr>
  );
}
