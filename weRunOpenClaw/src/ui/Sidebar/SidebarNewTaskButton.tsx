import { IconPlus } from "../icons";
import { useLocale } from "../../i18n/LocaleContext";

export interface SidebarNewTaskButtonProps {
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function SidebarNewTaskButton({
  label,
  onClick,
  className = "",
}: SidebarNewTaskButtonProps) {
  const { t } = useLocale();
  const resolved = label ?? t("newTaskButton");
  return (
    <div className={`px-4 mt-4 ${className}`}>
      <button
        className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-center hover:bg-zinc-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-95"
        type="button"
        onClick={onClick}
      >
        <IconPlus className="h-4 w-4 text-white" />
        <span className="text-sm font-medium text-white">{resolved}</span>
      </button>
    </div>
  );
}
