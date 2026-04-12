import { listTaskRecords, type TaskRecord } from "./opfsTaskStore";
import { buildWeclawChatJsonl, buildWeclawChatMarkdown } from "./weclawChatTranscript";

/** 与 openclaw.json 里 agents.defaults.workspace 一致，便于虚拟 openclaw 直接读文件 */
export const OPENCLAW_WORKSPACE_UI_CHATS = "/home/user/.openclaw/workspace/weclaw-ui-chats";

/** OpenClaw serve /api/chat 固定端口，不进入右侧「预览」 */
export const OPENCLAW_API_SERVE_PORT = 3187;

function safeFileSegment(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function openclawTaskWorkspaceVfsPath(taskId: string): string {
  return `${OPENCLAW_WORKSPACE_UI_CHATS}/tasks/${safeFileSegment(taskId)}`;
}

type WeNodeFs = {
  mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<void>;
  writeFile: (path: string, data: string | Uint8Array) => Promise<void>;
  unlink?: (path: string) => Promise<void>;
};

function getFs(weNode: unknown): WeNodeFs | null {
  const fs = (weNode as { fs?: WeNodeFs })?.fs;
  if (!fs?.mkdir || !fs?.writeFile) return null;
  return fs;
}

const TASK_README = [
  "# 任务工作区",
  "",
  "本目录对应该 OPFS 任务在 **weNode 虚拟 workspace** 中的镜像。",
  "",
  "- `task.json`：会话与消息（与 OPFS `task/*.json` 同步）",
  "- `chat.md`：对话 Markdown，供 openclaw 工具直接阅读",
  "- `weclaw-chat.jsonl`：对话 JSONL（每行一条消息）",
  "- `dist/`：构建产物、打包输出（工厂流水线可写入此目录）",
  "- `output/`：可选的最终导出（如 `report.md`、`index.html`）",
  "",
].join("\n");

const DIST_README = [
  "# dist",
  "",
  "请将构建结果、bundle、最终可交付的静态资源放在此目录。右侧「产物」会扫描这里的 `.md` / `.html` 等文件。",
  "",
].join("\n");

const OUTPUT_README = [
  "# output",
  "",
  "可选：将最终输出的 Markdown 或 HTML 放在此处，也会出现在「产物」列表中。",
  "",
].join("\n");

async function ensureTaskWorkspaceTree(fs: WeNodeFs, taskId: string): Promise<string> {
  const root = openclawTaskWorkspaceVfsPath(taskId);
  await fs.mkdir(`${root}/dist`, { recursive: true });
  await fs.mkdir(`${root}/output`, { recursive: true });
  await fs.writeFile(`${root}/README.md`, `${TASK_README}\n`);
  await fs.writeFile(`${root}/dist/README.md`, `${DIST_README}\n`);
  await fs.writeFile(`${root}/output/README.md`, `${OUTPUT_README}\n`);
  return root;
}

export async function writeIndexAndReadme(fs: WeNodeFs, list: TaskRecord[]): Promise<void> {
  await fs.mkdir(OPENCLAW_WORKSPACE_UI_CHATS, { recursive: true });
  const index = {
    generatedAt: new Date().toISOString(),
    source: "weRunOpenClaw UI（与浏览器 OPFS task/ 同步，供 openclaw 在 workspace 内读取）",
    tasks: list.map((t) => {
      const safe = safeFileSegment(t.id);
      return {
        id: t.id,
        title: t.title,
        updatedAt: t.updatedAt,
        sessionId: t.sessionId,
        messageCount: t.messages.length,
        workspacePath: `tasks/${safe}/`,
        path: `tasks/${safe}/task.json`,
        chatMarkdownPath: `tasks/${safe}/chat.md`,
        chatJsonlPath: `tasks/${safe}/weclaw-chat.jsonl`,
      };
    }),
  };
  await fs.writeFile(
    `${OPENCLAW_WORKSPACE_UI_CHATS}/index.json`,
    `${JSON.stringify(index, null, 2)}\n`
  );
  await fs.writeFile(
    `${OPENCLAW_WORKSPACE_UI_CHATS}/README.md`,
    [
      "# weclaw UI 任务与工作区",
      "",
      "本目录由前端写入 **weNode 虚拟文件系统**，路径落在 openclaw 默认 **workspace**（`/home/user/.openclaw/workspace`）下。",
      "",
      "- `index.json`：任务列表与每任务 **workspace 文件夹** 路径",
      "- `tasks/<id>/task.json`：单任务会话记录（权威 JSON）",
      "- `tasks/<id>/chat.md`、`weclaw-chat.jsonl`：同一聊天记录的可读导出",
      "- `tasks/<id>/dist/`、`tasks/<id>/output/`：产物与导出（供 agent / 工厂写入）",
      "",
      "权威数据源为浏览器 **OPFS** 的 `task/`；此处为镜像。",
      "",
    ].join("\n")
  );
}

async function removeLegacyFlatTaskJson(fs: WeNodeFs, safe: string): Promise<void> {
  const legacy = `${OPENCLAW_WORKSPACE_UI_CHATS}/tasks/${safe}.json`;
  try {
    await fs.unlink?.(legacy);
  } catch {
    // ignore
  }
}

export async function mirrorOneTask(fs: WeNodeFs, record: TaskRecord): Promise<void> {
  const safe = safeFileSegment(record.id);
  const root = await ensureTaskWorkspaceTree(fs, record.id);
  await fs.writeFile(`${root}/task.json`, `${JSON.stringify(record, null, 2)}\n`);
  await fs.writeFile(`${root}/chat.md`, buildWeclawChatMarkdown(record));
  await fs.writeFile(`${root}/weclaw-chat.jsonl`, buildWeclawChatJsonl(record));
  await removeLegacyFlatTaskJson(fs, safe);
}

/** weNode 启动完成后调用：把 OPFS 中全部任务会话镜像到 openclaw workspace（每任务独立文件夹） */
export async function mirrorOpfsTasksChatsToOpenclawWorkspace(weNode: unknown): Promise<void> {
  const fs = getFs(weNode);
  if (!fs) return;
  const list = await listTaskRecords();
  const tasksDir = `${OPENCLAW_WORKSPACE_UI_CHATS}/tasks`;
  await fs.mkdir(tasksDir, { recursive: true });
  for (const r of list) {
    await mirrorOneTask(fs, r);
  }
  await writeIndexAndReadme(fs, list);
}

/** 单次对话落盘后调用：更新对应任务目录并刷新 index */
export async function mirrorTaskChatToOpenclawWorkspace(
  weNode: unknown,
  record: TaskRecord
): Promise<void> {
  const fs = getFs(weNode);
  if (!fs) return;
  await mirrorOneTask(fs, record);
  const list = await listTaskRecords();
  await writeIndexAndReadme(fs, list);
}
