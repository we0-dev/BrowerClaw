import type { AppLocale } from "./detectBrowserLocale";

const zh = {
  loadingTasks: "加载任务…",
  navNewTask: "新建任务",
  navSkills: "技能",
  navConfig: "配置",
  navSection: "导航",
  searchTasks: "搜索任务",
  filterAria: "过滤",
  newTaskButton: "新建任务",
  taskSection: "任务",
  deleteTaskAria: "删除任务",
  centerTabChat: "对话",
  centerTabSkills: "技能",
  centerTabConfig: "配置",
  rightTabArtifacts: "产物",
  rightTabFolder: "文件夹",
  rightTabPreview: "预览",
  rightTabTerminal: "终端",
  rightNoTask: "无当前任务",
  rightPanelMoreAria: "更多",
  chatInputPlaceholder: "输入消息…",
  chatSend: "发送",
  chatFrontendPreviewMode: "前端预览模式",
  chatFrontendPreviewTitle: "控制是否注入前端预览工作流提示词",
  aiGenerating: "AI正在生成中...",
  chatHeaderWeNode: "WE NODE 终端",
  terminalBootErrorTitle: "组件安装失败",
  terminalBootingTitle: "龙虾组件安装中...",
  terminalBootErrorBody: "环境配置出现问题，请检查控制台。",
  terminalBootDepsBody: "正在下载核心组件，预计需要 1-2 分钟，请稍候",
  terminalBootInitBody: "正在初始化运行环境...",
  terminalLogMirror: "运行日志（实时镜像）",
  terminalLogWaiting: "（等待日志…）",
  terminalTabInit: "启动日志",
  terminalTabFree: "自由终端",
  terminalReinstallTitle: "重新安装龙虾运行时",
  terminalReinstalling: "重装中…",
  terminalReinstall: "🦞 重装龙虾",
  skillsLoading: "加载技能配置…",
  skillsHintA: "开关写入",
  skillsHintB: "；正文保存至 workspace",
  skillsHintC: "。新会话后 agent 重新加载。",
  skillsSavedHint: "已保存到本机并同步到虚拟 OpenClaw",
  skillsResetHint: "已恢复默认",
  skillsRestore: "恢复默认",
  skillsSaveEdit: "保存编辑",
  skillsPickPrompt: "点选列表中的技能以编辑 SKILL.md",
  skillsTitle: "技能",
  skillsSubtitle: "管理虚拟 OpenClaw 内置技能开关与 SKILL.md",
  skillsSearchLabel: "搜索技能",
  skillsSearchPlaceholder: "搜索技能",
  configLoading: "加载 OpenClaw 配置…",
  configTitle: "配置",
  configIntroA: "专用于 OpenClaw 的",
  configIntroB: "；启动时优先读取这里（含模型配置）。",
  configHint: "留空并保存：回退到内置默认。保存后将在下次 OpenClaw 启动时生效。",
  configReset: "恢复默认",
  configSave: "保存配置",
  configSavedBuiltin: "已恢复为内置默认配置",
  configSavedCustom: "已保存；下次启动优先加载该配置",
  configJsonInvalid: "JSON 格式无效，请修正后再保存",
  configRestoredDefault: "已恢复默认配置",
  productsScanLead: "扫描",
  productsScanMid: "、",
  productsScanTail: "及根目录",
  refresh: "刷新",
  waitWeNode: "等待 weNode 就绪…",
  scanning: "扫描中…",
  noArtifacts: "暂无产物",
  pickFilePreview: "选择文件预览",
  reading: "读取中…",
  folderReading: "读取中…",
  emptyDir: "空目录",
  clickToPreviewFile: "点击预览文件",
  fsReadFileUnsupported: "（当前 weNode fs 不支持 readFile）",
  previewEmptyHint1:
    "在终端里启动的其它 HTTP 服务（非 OpenClaw API 端口）会出现在这里。例如",
  previewEmptyHint2: "、Vite dev server 等。",
  previewNoPorts: "当前没有检测到额外端口。",
  previewPortLabel: "预览端口",
  previewExpandTitle: "在新弹层中全屏预览",
  previewExpand: "放大预览",
  previewHeight: "高度",
  previewHeightAria: "预览区域高度",
  previewResizeAria: "拖动调节预览高度",
  previewDialogAria: "放大预览",
  previewCloseBackdropAria: "关闭预览",
  previewPortTitle: "预览 · :",
  close: "关闭",
  marketTitle: "主要市场金价",
  marketColSymbol: "品种",
  marketColPrice: "价格",
  marketColChange: "涨跌",
  productSelectPlaceholder: "请选择一个产物查看详情",
  productDetailTitle: "产物详情",
  productDetailDesc:
    "这里将展示你选择的产物信息（例如网页抓取结果、文件、变更记录或预览）。",
  productFieldStatus: "状态",
  productFieldUpdated: "更新时间",
  productFieldSource: "来源",
  productFieldItems: "条目",
  productStatusDone: "已完成",
  productUpdatedSample: "20分钟前",
  productSourceSample: "网页获取",
} as const;

const en: { [K in keyof typeof zh]: string } = {
  loadingTasks: "Loading tasks…",
  navNewTask: "New task",
  navSkills: "Skills",
  navConfig: "Config",
  navSection: "Navigation",
  searchTasks: "Search tasks",
  filterAria: "Filter",
  newTaskButton: "New task",
  taskSection: "Tasks",
  deleteTaskAria: "Delete task",
  centerTabChat: "Chat",
  centerTabSkills: "Skills",
  centerTabConfig: "Config",
  rightTabArtifacts: "Artifacts",
  rightTabFolder: "Files",
  rightTabPreview: "Preview",
  rightTabTerminal: "Terminal",
  rightNoTask: "No active task",
  rightPanelMoreAria: "More",
  chatInputPlaceholder: "Message…",
  chatSend: "Send",
  chatFrontendPreviewMode: "Frontend preview prompt",
  chatFrontendPreviewTitle: "Toggle injecting the frontend preview workflow system prompt",
  aiGenerating: "Generating…",
  chatHeaderWeNode: "WE NODE terminal",
  terminalBootErrorTitle: "Setup failed",
  terminalBootingTitle: "Setting up runtime…",
  terminalBootErrorBody: "Something went wrong. Check the console for details.",
  terminalBootDepsBody: "Downloading core dependencies (about 1–2 minutes)…",
  terminalBootInitBody: "Initializing environment…",
  terminalLogMirror: "Live log mirror",
  terminalLogWaiting: "(waiting for logs…)",
  terminalTabInit: "Boot log",
  terminalTabFree: "Shell",
  terminalReinstallTitle: "Reinstall OpenClaw runtime",
  terminalReinstalling: "Reinstalling…",
  terminalReinstall: "🦞 Reinstall",
  skillsLoading: "Loading skills…",
  skillsHintA: "Toggles are written to",
  skillsHintB: "; SKILL.md bodies live under workspace",
  skillsHintC: ". Agents reload on new sessions.",
  skillsSavedHint: "Saved locally and synced to the virtual OpenClaw",
  skillsResetHint: "Restored defaults",
  skillsRestore: "Restore default",
  skillsSaveEdit: "Save",
  skillsPickPrompt: "Select a skill from the list to edit SKILL.md",
  skillsTitle: "Skills",
  skillsSubtitle: "Manage built-in virtual OpenClaw skills and SKILL.md",
  skillsSearchLabel: "Search skills",
  skillsSearchPlaceholder: "Search skills",
  configLoading: "Loading OpenClaw config…",
  configTitle: "Configuration",
  configIntroA: "This screen edits",
  configIntroB: "for OpenClaw; on startup this copy is preferred (including model settings).",
  configHint: "Leave empty and save to fall back to the built-in default. Changes apply on next OpenClaw start.",
  configReset: "Reset",
  configSave: "Save",
  configSavedBuiltin: "Restored built-in default configuration",
  configSavedCustom: "Saved; this file will load first on next start",
  configJsonInvalid: "Invalid JSON — fix it before saving",
  configRestoredDefault: "Restored default configuration",
  productsScanLead: "Scanning",
  productsScanMid: ", ",
  productsScanTail: ", and workspace root",
  refresh: "Refresh",
  waitWeNode: "Waiting for weNode…",
  scanning: "Scanning…",
  noArtifacts: "No artifacts yet",
  pickFilePreview: "Pick a file to preview",
  reading: "Loading…",
  folderReading: "Loading…",
  emptyDir: "Empty folder",
  clickToPreviewFile: "Click a file to preview",
  fsReadFileUnsupported: "(weNode fs does not support readFile)",
  previewEmptyHint1:
    "Other HTTP servers you start in the terminal (not the OpenClaw API port) show up here, e.g.",
  previewEmptyHint2: ", Vite dev server, etc.",
  previewNoPorts: "No extra ports detected.",
  previewPortLabel: "Preview port",
  previewExpandTitle: "Open fullscreen preview",
  previewExpand: "Fullscreen",
  previewHeight: "Height",
  previewHeightAria: "Preview pane height",
  previewResizeAria: "Drag to resize preview height",
  previewDialogAria: "Fullscreen preview",
  previewCloseBackdropAria: "Close preview",
  previewPortTitle: "Preview · :",
  close: "Close",
  marketTitle: "Gold prices (sample)",
  marketColSymbol: "Symbol",
  marketColPrice: "Price",
  marketColChange: "Change",
  productSelectPlaceholder: "Select an artifact to view details",
  productDetailTitle: "Artifact details",
  productDetailDesc:
    "Details for the selected artifact (scraped pages, files, diffs, or previews) will appear here.",
  productFieldStatus: "Status",
  productFieldUpdated: "Updated",
  productFieldSource: "Source",
  productFieldItems: "Items",
  productStatusDone: "Done",
  productUpdatedSample: "20 min ago",
  productSourceSample: "Web fetch",
};

export type MessageKey = keyof typeof zh;

const byLocale: Record<AppLocale, Record<MessageKey, string>> = { zh, en };

export function getMessages(locale: AppLocale): Record<MessageKey, string> {
  return byLocale[locale];
}

export function getWelcomeAssistantText(locale: AppLocale): string {
  return locale === "en" ? "What would you like me to help with?" : "有什么需要我做的嘛";
}

export const WELCOME_ASSISTANT_TEXT_ZH = "有什么需要我做的嘛";
export const WELCOME_ASSISTANT_TEXT_EN = "What would you like me to help with?";

export function isWelcomeAssistantMessage(text: string): boolean {
  const t = text.trim();
  return t === WELCOME_ASSISTANT_TEXT_ZH || t === WELCOME_ASSISTANT_TEXT_EN;
}

export function getNewTaskTitle(locale: AppLocale): string {
  return locale === "en" ? "New task" : "新任务";
}

export function isDefaultNewTaskTitle(title: string): boolean {
  const s = title.trim();
  return s === "新任务" || s === "New task";
}

export function formatTaskListSubtitle(
  locale: AppLocale,
  updatedAtIso: string,
  messageCount: number
): string {
  const rel = formatRelativeShort(locale, updatedAtIso);
  if (locale === "en") {
    const tail =
      messageCount > 0 ? ` · ${messageCount} messages` : " · No messages yet";
    return `${rel}${tail}`;
  }
  const tail = messageCount > 0 ? ` · ${messageCount} 条消息` : " · 暂无消息";
  return `${rel}${tail}`;
}

function formatRelativeShort(locale: AppLocale, iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const d = Date.now() - t;
  const m = Math.floor(d / 60000);
  if (m < 1) return locale === "en" ? "just now" : "刚刚";
  if (m < 60) return locale === "en" ? `${m} min ago` : `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return locale === "en" ? `${h} h ago` : `${h}小时前`;
  const days = Math.floor(h / 24);
  return locale === "en" ? `${days} d ago` : `${days}天前`;
}
