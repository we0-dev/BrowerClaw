import type { NavItem } from "./types";
import { useLocale } from "../../i18n/LocaleContext";

export interface SidebarNavProps {
  sectionTitle?: string;
  items: NavItem[];
  onItemClick?: (item: NavItem) => void;
  className?: string;
}

export function SidebarNav({
  sectionTitle,
  items,
  onItemClick,
  className = "",
}: SidebarNavProps) {
  const { t } = useLocale();
  const resolvedTitle = sectionTitle ?? t("navSection");
  return (
    <div className={className}>
      <div className="mt-1 text-xs text-zinc-400 px-2">{resolvedTitle}</div>
      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <button
            key={item.id ?? item.label}
            className={[
              "w-full text-left rounded-lg px-3 py-1.5 text-[13px] transition-all duration-150 flex items-center gap-2",
              item.active
                ? "bg-zinc-200/50 text-zinc-900 font-medium"
                : "text-zinc-500 hover:bg-zinc-200/30 hover:text-zinc-800",
            ].join(" ")}
            type="button"
            onClick={() => onItemClick?.(item)}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${item.active ? 'bg-zinc-900' : 'bg-transparent'}`} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
