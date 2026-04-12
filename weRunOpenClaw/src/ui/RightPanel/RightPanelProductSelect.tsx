import { IconChevronDown } from "../icons";
import { useLocale } from "../../i18n/LocaleContext";

export interface RightPanelProductSelectProps {
  placeholder?: string;
  onClick?: () => void;
  className?: string;
}

export function RightPanelProductSelect({
  placeholder,
  onClick,
  className = "",
}: RightPanelProductSelectProps) {
  const { t } = useLocale();
  const resolved = placeholder ?? t("productSelectPlaceholder");
  return (
    <div className={`p-4 ${className}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between rounded-xl bg-white ring-1 ring-zinc-200 px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
        onClick={onClick}
      >
        {resolved}
        <IconChevronDown className="h-4 w-4 text-zinc-400" />
      </button>
    </div>
  );
}
