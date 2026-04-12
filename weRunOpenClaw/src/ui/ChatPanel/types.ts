import type { ReactNode } from "react";
import type { PersistedChatMessage } from "../../lib/opfsTaskStore";

export type { PersistedChatMessage };

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: ReactNode;
}

export interface AssistantStepItem {
  id?: string;
  text: string;
  subtitle?: string;
}

export interface ChatPanelProps {
  title?: string;
  messages?: ChatMessage[];
  inputPlaceholder?: string;
  sendLabel?: string;
  tags?: string[];
  assistantName?: string;
  assistantLetter?: string;
  children?: ReactNode;
  onSend?: (text: string) => void;
  /** 当前 OPFS 任务 id；切换时会按 initialPersisted 注水 */
  taskId?: string | null;
  initialPersisted?: {
    messages: PersistedChatMessage[];
    sessionId: string | null;
  } | null;
  onConversationPersist?: (
    taskId: string,
    messages: PersistedChatMessage[],
    sessionId: string | null
  ) => void | Promise<void>;
  /** weNode 就绪后回调，用于把 UI 数据写入虚拟 workspace 等 */
  onWeNodeReady?: (weNode: unknown) => void;
  /**
   * 为 false 时不在面板内挂载 WeNodeTerminalPanel，由父级挂载并传入 apiUrl（切换 Tab 时保持 weNode 存活）。
   */
  embedWeNodeTerminal?: boolean;
  /** 与 embedWeNodeTerminal=false 配合，来自父级 WeNodeTerminalPanel 的 API 基址 */
  apiUrl?: string | null;
}
