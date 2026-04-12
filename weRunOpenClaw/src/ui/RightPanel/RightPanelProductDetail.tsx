import { useMemo } from "react";
import type { RightPanelProductDetail as ProductDetailType } from "./types";
import { StatCard } from "./StatCard";
import { useLocale } from "../../i18n/LocaleContext";

export interface RightPanelProductDetailProps {
  detail?: ProductDetailType | null;
  className?: string;
}

export function RightPanelProductDetail({
  detail = null,
  className = "",
}: RightPanelProductDetailProps) {
  const { t } = useLocale();
  const defaultDetail = useMemo<ProductDetailType>(
    () => ({
      title: t("productDetailTitle"),
      description: t("productDetailDesc"),
      stats: [
        { label: t("productFieldStatus"), value: t("productStatusDone") },
        { label: t("productFieldUpdated"), value: t("productUpdatedSample") },
        { label: t("productFieldSource"), value: t("productSourceSample") },
        { label: t("productFieldItems"), value: "5" },
      ],
    }),
    [t]
  );
  const { title, description, stats } = { ...defaultDetail, ...(detail ?? {}) };
  return (
    <div className={`px-4 pb-4 flex-1 overflow-auto scrollbar-none ${className}`}>
      <div className="rounded-2xl bg-zinc-50 ring-1 ring-zinc-200 p-4">
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        <div className="mt-2 text-sm text-zinc-600 leading-6">
          {description}
        </div>
        {stats && stats.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
