import type { ReactNode } from "react";

export interface ProductDetailStat {
  label: string;
  value: string;
}

export interface RightPanelProductDetail {
  title?: string;
  description?: string;
  stats?: ProductDetailStat[];
}

/** 非 3187 的 weNode 虚拟端口，用于右侧「预览」 */
export interface VirtualPreviewServer {
  port: number;
  url: string;
}

export interface RightPanelProps {
  tabs?: string[];
  activeTabIndex?: number;
  previewRefreshVersion?: number;
  productSelectPlaceholder?: string;
  productDetail?: RightPanelProductDetail | null;
  onTabChange?: (index: number) => void;
  onProductSelect?: () => void;
  onPreviewRefresh?: () => void;
  onMenuClick?: () => void;
  /** 当前 OPFS 任务 id，用于定位 VFS 任务目录 */
  taskId?: string | null;
  weNode?: unknown | null;
  virtualPreviewServers?: VirtualPreviewServer[];
  terminalContent?: ReactNode;
}
