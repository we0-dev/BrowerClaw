import { useLocale } from "../../i18n/LocaleContext";

export interface RightPanelTabsProps {
  tabs: string[];
  activeIndex?: number;
  onTabChange?: (index: number) => void;
  onMenuClick?: () => void;
}

export function RightPanelTabs({
  tabs,
  activeIndex = 0,
  onTabChange,
  onMenuClick,
}: RightPanelTabsProps) {
  const { t } = useLocale();
  return (
    <div className="h-14 px-3 flex items-center justify-between bg-zinc-50/50">
      <div className="flex items-center gap-1">
        {tabs.map((t, idx) => (
          <button
            key={t}
            type="button"
            className={[
              "text-[12px] px-3 py-1.5 rounded-lg transition-all duration-200 relative",
              idx === activeIndex
                ? "bg-white shadow-sm ring-1 ring-zinc-200 text-zinc-900 font-semibold"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50",
            ].join(" ")}
            onClick={() => onTabChange?.(idx)}
          >
            {t}
            {idx === activeIndex && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-zinc-900" />
            )}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="h-8 w-8 rounded-lg hover:bg-zinc-200/50 text-zinc-500 flex items-center justify-center transition-colors"
        aria-label={t("rightPanelMoreAria")}
        onClick={onMenuClick}
      >
        <span className="text-lg leading-none mt-[-4px]">⋯</span>
      </button>
    </div>
  );
}
