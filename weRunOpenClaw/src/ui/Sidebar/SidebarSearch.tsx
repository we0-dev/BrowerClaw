import { IconSearch, IconSliders } from "../icons";
import { useLocale } from "../../i18n/LocaleContext";

export interface SidebarSearchProps {
  placeholder?: string;
  value?: string;
  onSearch?: (value: string) => void;
  onFilter?: () => void;
  className?: string;
}

export function SidebarSearch({
  placeholder,
  value = "",
  onSearch,
  onFilter,
  className = "",
}: SidebarSearchProps) {
  const { t } = useLocale();
  const resolvedPlaceholder = placeholder ?? t("searchTasks");
  return (
    <div className={`px-3 mt-3 ${className}`}>
      <div className="flex items-center gap-2 rounded-xl bg-white ring-1 ring-zinc-200 px-2 py-2">
        <IconSearch className="h-4 w-4 text-zinc-400" />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
          placeholder={resolvedPlaceholder}
          value={value}
          onChange={(e) => onSearch?.(e.target.value)}
        />
        <button
          className="h-8 w-8 rounded-lg hover:bg-zinc-100 text-zinc-500 flex items-center justify-center"
          type="button"
          aria-label={t("filterAria")}
          onClick={onFilter}
        >
          <IconSliders className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
