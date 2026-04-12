import type { TaskItem } from "./types";
import { SidebarTaskItem } from "./SidebarTaskItem";
import { useLocale } from "../../i18n/LocaleContext";

export interface SidebarTaskListProps {
  sectionTitle?: string;
  tasks: TaskItem[];
  onTaskClick?: (task: TaskItem) => void;
  onTaskDelete?: (task: TaskItem) => void;
  className?: string;
}

export function SidebarTaskList({
  sectionTitle,
  tasks,
  onTaskClick,
  onTaskDelete,
  className = "",
}: SidebarTaskListProps) {
  const { t } = useLocale();
  const resolvedTitle = sectionTitle ?? t("taskSection");
  return (
    <div className={className}>
      <div className="mt-1 text-xs text-zinc-400 px-2">{resolvedTitle}</div>
      <div className="mt-2 space-y-2">
        {tasks.map((task) => (
          <SidebarTaskItem
            key={task.id ?? task.title}
            task={task}
            onClick={onTaskClick}
            onDelete={onTaskDelete}
          />
        ))}
      </div>
    </div>
  );
}
