import type { TaskRecord } from "./opfsTaskStore";
import { isWelcomeAssistantMessage } from "../i18n/messages";

/** @deprecated 使用 isWelcomeAssistantMessage；保留以兼容旧数据中的中文欢迎语 */
export const WECLAW_DEFAULT_WELCOME_ASSISTANT = "有什么需要我做的嘛";

export function buildWeclawChatMarkdown(record: TaskRecord): string {
  const lines: string[] = [
    `# ${record.title}`,
    "",
    `- **任务 id**：\`${record.id}\``,
    `- **OpenClaw sessionId**：\`${record.sessionId ?? "（尚未建立）"}\``,
    `- **最近更新**：${record.updatedAt}`,
    "",
    "本文件由 weRunOpenClaw 根据 `task.json` 自动生成，便于在 **openclaw workspace** 内用工具阅读历史。",
    "",
    "## 对话记录",
    "",
  ];
  for (const m of record.messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const c = (m.content ?? "").trim();
    if (!c) continue;
    if (m.role === "assistant" && isWelcomeAssistantMessage(c)) continue;
    const label = m.role === "user" ? "用户" : "助手";
    lines.push(`### ${label}`, "", c, "");
  }
  return `${lines.join("\n")}\n`;
}

/** 每行一条 JSON，便于 jq / 脚本处理 */
export function buildWeclawChatJsonl(record: TaskRecord): string {
  const out: string[] = [];
  for (const m of record.messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const c = (m.content ?? "").trim();
    if (!c) continue;
    if (m.role === "assistant" && isWelcomeAssistantMessage(c)) continue;
    out.push(
      JSON.stringify({
        taskId: record.id,
        sessionId: record.sessionId,
        role: m.role,
        content: c,
      })
    );
  }
  return out.length > 0 ? `${out.join("\n")}\n` : "";
}
