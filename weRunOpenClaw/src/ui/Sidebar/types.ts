export interface NavItem {
  label: string;
  active?: boolean;
  /** 用于导航逻辑，避免依赖文案语言 */
  id?: "chat" | "skills" | "config";
}

export interface TaskItem {
  id?: string;
  title: string;
  subtitle: string;
}

export interface PointsCardProps {
  title: string;
  subtitle: string;
  icon?: string;
}

export interface UserCardProps {
  avatar: string;
  name: string;
  subtitle?: string;
}

export interface SidebarProps {
  brandName?: string;
  brandLetter?: string;
  searchPlaceholder?: string;
  newTaskLabel?: string;
  taskSectionTitle?: string;
  tasks?: TaskItem[];
  navSectionTitle?: string;
  navItems?: NavItem[];
  pointsCard?: PointsCardProps | null;
  user?: UserCardProps | null;
  onSearch?: (value: string) => void;
  onFilter?: () => void;
  onNewTask?: () => void;
  onTaskClick?: (task: TaskItem) => void;
  onTaskDelete?: (task: TaskItem) => void;
  onNavClick?: (item: NavItem) => void;
}
