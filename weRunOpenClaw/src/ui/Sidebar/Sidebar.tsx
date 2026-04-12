import type { SidebarProps } from "./types";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarSearch } from "./SidebarSearch";
import { SidebarNewTaskButton } from "./SidebarNewTaskButton";
import { SidebarTaskList } from "./SidebarTaskList";
import { SidebarNav } from "./SidebarNav";
import { SidebarPointsCard } from "./SidebarPointsCard";
import { SidebarUserCard } from "./SidebarUserCard";

const defaultNavItems = [
  { label: "新建任务", active: true },
  { label: "技能" },
];

const defaultTasks = [
  { title: "帮我看看今天金价", subtitle: "20分钟前 · 已完成" },
];

export function Sidebar({
  brandName = "BrowserClaw",
  brandLetter = "W",
  searchPlaceholder = "搜索任务",
  newTaskLabel = "新建任务",
  taskSectionTitle = "任务",
  tasks = defaultTasks,
  navSectionTitle = "导航",
  navItems = defaultNavItems,
  pointsCard = { title: "你有 100 积分待领取", subtitle: "完成任务可获取更多积分" },
  user = { avatar: "u", name: "J." },
  onSearch,
  onFilter,
  onNewTask,
  onTaskClick,
  onTaskDelete,
  onNavClick,
}: SidebarProps) {
  return (
    <aside className="h-full min-h-0 bg-zinc-50/50 overflow-hidden flex flex-col">
      <div className="h-full min-h-0 flex flex-col">
        <SidebarBrand letter={brandLetter} name={brandName} />
        <SidebarSearch
          placeholder={searchPlaceholder}
          onSearch={onSearch}
          onFilter={onFilter}
        />
        <SidebarNewTaskButton label={newTaskLabel} onClick={onNewTask} />
        <div className="px-2 mt-3 flex-1 overflow-auto scrollbar-none">
          <SidebarNav
            sectionTitle={navSectionTitle}
            items={navItems}
            onItemClick={onNavClick}
          />
          <SidebarTaskList
            sectionTitle={taskSectionTitle}
            tasks={tasks}
            onTaskClick={onTaskClick}
            onTaskDelete={onTaskDelete}
          />
        </div>
        {/* <div className="px-3 pb-3">
          {pointsCard && <SidebarPointsCard {...pointsCard} />}
          {user && <SidebarUserCard {...user} />}
        </div> */}
      </div>
    </aside>
  );
}
