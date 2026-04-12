import type { TaskItem } from "./types";
import { useLocale } from "../../i18n/LocaleContext";

export interface SidebarTaskItemProps {
  task: TaskItem;
  onClick?: (task: TaskItem) => void;
  onDelete?: (task: TaskItem) => void;
}

export function SidebarTaskItem({ task, onClick, onDelete }: SidebarTaskItemProps) {
  const { t } = useLocale();
  const showDelete = Boolean(onDelete && task.id);

  return (
    <div className="group relative rounded-xl bg-white border border-zinc-200 px-3 py-2 hover:bg-zinc-50 transition-all duration-200 cursor-pointer"
      onClick={() => onClick?.(task)}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(task)}
      role="button"
      tabIndex={0}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-zinc-900 truncate leading-snug">{task.title}</div>
        <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{task.subtitle}</div>
      </div>
      {showDelete && (
        <button
          type="button"
          className="absolute right-2 top-2 shrink-0 rounded-md p-1 text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          aria-label={t("deleteTaskAria")}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(task);
          }}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
