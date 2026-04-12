import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, ChatPanelProps, PersistedChatMessage } from "./types";
import { ChatHeader } from "./ChatHeader";
import { ChatBubble } from "./ChatBubble";
import { AssistantMessage } from "./AssistantMessage";
import { AssistantStep } from "./AssistantStep";
import { ChatInput } from "./ChatInput";
import { MarketPriceTable } from "../MarketPriceTable";
import { WeNodeTerminalPanel } from "../Terminal/WeNodeTerminalPanel";
import { Markdown } from "../Markdown/Markdown";
import { openclawTaskWorkspaceVfsPath } from "../../lib/syncChatToOpenclawWorkspace";
import { useLocale } from "../../i18n/LocaleContext";
import { getGoldDemoAssistantSteps, getGoldDemoUserMessage } from "../../i18n/demoGoldChat";
import { getMarketDemoRows } from "../../i18n/marketDemoRows";
import { getWelcomeAssistantText, isWelcomeAssistantMessage } from "../../i18n/messages";

const MAX_HISTORY_MESSAGES_FOR_API = 48;
const ENV_ENABLE_FRONTEND_PREVIEW_PROMPT =
  String((import.meta as any).env?.VITE_OPENCLAW_ENABLE_REACT_VITE_PREVIEW_PROMPT ?? "1") !== "0";
const FRONTEND_PREVIEW_PROMPT_STORAGE_KEY =
  "weclaw.chat.frontendPreviewPrompt.enabled";
const REACT_VITE_PREVIEW_PROMPT = [
  "Frontend default workflow:",
  "- For most user requests that can be shown in browser preview, prefer plain HTML + Vite implementation (do NOT use React by default).",
  "- Use Vite 6 only: set `vite` in devDependencies to `^6.x`. Do not use Vite 5 or older, and do not use Vite 7.",
  "- Always add `export default defineConfig({ base: './' })` in vite.config.js/ts so assets resolve correctly in the preview pane.",
  "- For plain HTML, use **Tailwind via CDN** in `index.html`: `<script src=\"https://cdn.tailwindcss.com\"></script>` in `<head>`, style with utility classes; skip npm `tailwindcss` unless the user wants a PostCSS build.",
  "- For any request where results are clearer as UI/visual output, prefer frontend presentation by default (not limited to specific task types).",
  "- Typical examples include:",
  "  · Data & analysis: editable tables, dashboards/cards, CSV/Excel data viewers (with sort/filter), stats reports, A-vs-B comparison pages, data-viz charts",
  "  · Documents: slide decks (PPT-style), document layouts (Word-style), printable/exportable pages (PDF-style), resumes, business cards, email template previews, weekly/daily reports",
  "  · Tools & utilities: calculators, unit converters, countdown timers, timelines, QR code generators, color pickers/palettes",
  "  · Learning & diagrams: flowcharts, mind maps, knowledge cards, flashcards, algorithm/data-structure visualizations, syntax-highlighted code showcases",
  "  · Interactive & games: quizzes, surveys, polls, raffles/random pickers, simple browser games (Snake, Minesweeper, etc.)",
  "  · Content & marketing: 小红书 / 公众号 article layouts, posters, landing/宣传 pages, task result boards, progress/status views",
  "- For any PPT / Word / PDF / Excel request, deliver an HTML + Vite page that reproduces the desired output visually—do not generate binary files.",
  "- Do NOT run `vite init` / `npm create vite@latest` scaffolding.",
  "- Create files directly (including package.json) and install only the dependencies actually needed.",
  "- For HTML + Vite tasks, run `npm install` first, then **prefer** `npm run dev` for preview (do not use `npm run build` / `vite build` as the default viewer).",
  "- The package.json `scripts` field must include `\"dev\": \"vite\"`.",
  "- If you need another listener (port conflict, clarity, etc.), use an explicit port: e.g. `npm run dev -- --port 5173` or set `server.port` in vite.config. **Do not bind Vite to port 3187** in weclaw—that port is the virtual OpenClaw chat API. Any **other** listening HTTP port is listed under the right-hand **预览** tab; when a new preview port comes up, weclaw usually switches to that tab so the user can open the new URL (use the dropdown if several ports exist).",
  "- If the user explicitly asks for React or another stack, follow the user's choice.",
].join("\n");

/** 不把 agents.defaults.workspace 限死在单任务目录；任务产物路径单独说明，便于加载 workspace/skills。 */
function buildWeclawChatExtraSystemPrompt(opts: {
  taskId?: string | null;
  frontendPreview: boolean;
}): string | undefined {
  const parts: string[] = [];
  if (opts.frontendPreview) parts.push(REACT_VITE_PREVIEW_PROMPT);
  const tid = typeof opts.taskId === "string" ? opts.taskId.trim() : "";
  if (tid) {
    const taskRoot = openclawTaskWorkspaceVfsPath(tid);
    parts.push(
      [
        "当前 weclaw UI 任务目录（相对 openclaw workspace 根）：",
        `- 根路径：${taskRoot}`,
        "- 会话导出：chat.md、weclaw-chat.jsonl；权威 JSON：task.json",
        "- 可交付产物请写入该目录下的 dist/ 或 output/（供界面「产物」扫描）",
        "代理默认 cwd 为 openclaw.json 中 agents.defaults.workspace；全局技能在 workspace/skills/。",
      ].join("\n")
    );
  }
  const out = parts.join("\n\n").trim();
  return out.length > 0 ? out : undefined;
}

function buildChatHistoryForApi(msgs: ChatMessage[]): { role: string; content: string }[] {
  const slice = msgs.slice(-MAX_HISTORY_MESSAGES_FOR_API);
  const out: { role: string; content: string }[] = [];
  for (const m of slice) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const c = typeof m.content === "string" ? m.content : String(m.content ?? "");
    const t = c.trim();
    if (!t) continue;
    if (m.role === "assistant" && isWelcomeAssistantMessage(t)) continue;
    out.push({ role: m.role, content: t });
  }
  return out;
}

export function ChatPanel({
  title,
  messages,
  inputPlaceholder,
  sendLabel,
  assistantName = "BrowserClaw",
  assistantLetter = "W",
  children,
  onSend,
  taskId,
  initialPersisted,
  onConversationPersist,
  onWeNodeReady,
  embedWeNodeTerminal = true,
  apiUrl: apiUrlProp = null,
}: ChatPanelProps) {
  const { locale, t } = useLocale();
  const welcomeAssistantText = useMemo(() => getWelcomeAssistantText(locale), [locale]);
  const demoSteps = useMemo(() => getGoldDemoAssistantSteps(locale), [locale]);
  const demoUserMessage = useMemo(() => getGoldDemoUserMessage(locale), [locale]);
  const marketRows = useMemo(() => getMarketDemoRows(locale), [locale]);
  const aiGeneratingText = t("aiGenerating");
  const resolvedTitle = title ?? demoUserMessage;
  const resolvedPlaceholder = inputPlaceholder ?? t("chatInputPlaceholder");
  const resolvedSendLabel = sendLabel ?? t("chatSend");

  const [internalApiUrl, setInternalApiUrl] = useState<string | null>(null);
  const apiUrl = embedWeNodeTerminal ? internalApiUrl : apiUrlProp;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [messagesState, setMessagesState] = useState<ChatMessage[] | null>(
    null
  );
  const [isSending, setIsSending] = useState(false);
  const [frontendPreviewPromptEnabled, setFrontendPreviewPromptEnabled] = useState<boolean>(
    ENV_ENABLE_FRONTEND_PREVIEW_PROMPT
  );
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(FRONTEND_PREVIEW_PROMPT_STORAGE_KEY);
      if (saved === "1") setFrontendPreviewPromptEnabled(true);
      else if (saved === "0") setFrontendPreviewPromptEnabled(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FRONTEND_PREVIEW_PROMPT_STORAGE_KEY,
        frontendPreviewPromptEnabled ? "1" : "0"
      );
    } catch {
      // ignore
    }
  }, [frontendPreviewPromptEnabled]);

  const hasInitializedRef = useRef(false);
  const lastHydratedTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messagesState]);

  // 接入 OPFS 任务：按 taskId 注水，避免随 persisted 更新反复重置
  useEffect(() => {
    if (taskId === undefined) return;
    if (!taskId) return;
    if (lastHydratedTaskIdRef.current === taskId) return;
    lastHydratedTaskIdRef.current = taskId;

    const persisted = initialPersisted;
    if (persisted && persisted.messages.length > 0) {
      setMessagesState(
        persisted.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      );
      setSessionId(persisted.sessionId ?? null);
    } else {
      setMessagesState([
        {
          id: "welcome_1",
          role: "assistant",
          content: welcomeAssistantText,
        },
      ]);
      setSessionId(null);
    }
    setInputValue("");
    // 仅随 taskId 切换注水；persist 后父组件会更新 initialPersisted，但不应重置本地消息列表
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: read initialPersisted only when taskId changes
  }, [taskId, welcomeAssistantText]);

  // 未接任务时：仅在 apiUrl 就绪后展示欢迎语
  useEffect(() => {
    if (taskId !== undefined) return;
    if (!apiUrl) return;
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    setMessagesState([
      {
        id: "welcome_1",
        role: "assistant",
        content: welcomeAssistantText,
      },
    ]);
    setSessionId(null);
    setInputValue("");
  }, [apiUrl, taskId, welcomeAssistantText]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!apiUrl) return;
    if (isSending) return;

    setIsSending(true);
    setInputValue("");

    const userMessageId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const baseAfterUser: ChatMessage[] = [
      ...(messagesState ?? []),
      { id: userMessageId, role: "user", content: trimmed },
    ];
    const pendingAssistantId = `pending_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const baseWithPending: ChatMessage[] = [
      ...baseAfterUser,
      { id: pendingAssistantId, role: "assistant", content: aiGeneratingText },
    ];
    setMessagesState(baseWithPending);

    try {
      const cleanApiUrl = apiUrl.replace(/\/$/, "");
      // weNode 返回的 url 通常包含前缀路径（例如 `${origin}/__virtual__/${port}`）。
      // 不能用 new URL("/api/chat", base)（会覆盖 base 的路径段）。
      const chatUrl = `${cleanApiUrl}/api/chat`;
      const historyPayload = buildChatHistoryForApi(messagesState ?? []);
      const extraSystemPrompt = buildWeclawChatExtraSystemPrompt({
        taskId,
        frontendPreview: frontendPreviewPromptEnabled,
      });
      const resp = await fetch(chatUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId ?? undefined,
          message: trimmed,
          ...(historyPayload.length > 0 ? { history: historyPayload } : {}),
          ...(extraSystemPrompt ? { extraSystemPrompt } : {}),
        }),
      });

      const data = (await resp.json()) as
        | { sessionId: string; output: string; error?: undefined }
        | { error: string; sessionId?: undefined };

      if (!resp.ok) {
        if ("error" in data && data.error) throw new Error(data.error);
        throw new Error("Request failed");
      }

      if ("error" in data && data.error) {
        throw new Error(data.error);
      }

      if (!("output" in data)) {
        throw new Error("Invalid response format");
      }

      const nextSessionId = data.sessionId;
      const outputText =
        typeof data.output === "string" && data.output.trim().length > 0
          ? data.output
          : aiGeneratingText;
      const baseFull: ChatMessage[] = [
        ...baseAfterUser,
        { id: pendingAssistantId, role: "assistant", content: outputText },
      ];
      setMessagesState(baseFull);
      setSessionId(nextSessionId);

      if (taskId && onConversationPersist) {
        const persisted: PersistedChatMessage[] = baseFull.map((m) => ({
          id: m.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          role: m.role,
          content: typeof m.content === "string" ? m.content : String(m.content),
        }));
        void onConversationPersist(taskId, persisted, nextSessionId);
      }
    } catch (e: any) {
      const baseErr: ChatMessage[] = [
        ...baseAfterUser,
        {
          id: pendingAssistantId,
          role: "assistant",
          content: String(e?.message ?? e),
        },
      ];
      setMessagesState(baseErr);
      if (taskId && onConversationPersist) {
        const persisted: PersistedChatMessage[] = baseErr.map((m) => ({
          id: m.id ?? pendingAssistantId,
          role: m.role,
          content: typeof m.content === "string" ? m.content : String(m.content),
        }));
        void onConversationPersist(taskId, persisted, sessionId);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="h-full min-h-0 bg-white">
      <div className="h-full min-h-0 flex flex-col">
        <ChatHeader
          title={resolvedTitle}
          frontendPreviewPromptEnabled={frontendPreviewPromptEnabled}
          onToggleFrontendPreviewPrompt={setFrontendPreviewPromptEnabled}
        />
        <div
          ref={messagesScrollRef}
          className="flex-1 min-h-0 overflow-auto scrollbar-none px-6 py-4"
        >
          <div className="max-w-[800px] mx-auto space-y-6">
            {messagesState ? (
              messagesState.map((msg) => (
                <ChatBubble
                  key={msg.id ?? String(msg.role)}
                  role={msg.role}
                >
                  {msg.role === "assistant" && typeof msg.content === "string" ? (
                    <Markdown markdown={msg.content} />
                  ) : (
                    msg.content
                  )}
                </ChatBubble>
              ))
            ) : (
              children ??
              (messages && messages.length > 0 ? (
                messages.map((msg) => (
                  <ChatBubble key={msg.id ?? String(msg.role)} role={msg.role}>
                    {msg.content}
                  </ChatBubble>
                ))
              ) : (
                <>
                  <ChatBubble role="user">{demoUserMessage}</ChatBubble>
                  <AssistantMessage
                    name={assistantName}
                    letter={assistantLetter}
                  >
                    {demoSteps.map((step, i) => (
                      <AssistantStep
                        key={i}
                        step={step}
                        className={i === 3 ? "mt-4" : i > 0 ? "mt-3" : ""}
                      />
                    ))}
                    <MarketPriceTable title={t("marketTitle")} rows={marketRows} />
                  </AssistantMessage>
                </>
              ))
            )}
          </div>
        </div>
        <div className="bg-zinc-100/30 p-4">
          <ChatInput
            placeholder={resolvedPlaceholder}
            sendLabel={resolvedSendLabel}
            value={inputValue}
            onValueChange={(v) => {
              setInputValue(v);
            }}
            onSend={handleSend}
          />
        </div>
        {embedWeNodeTerminal ? (
          <WeNodeTerminalPanel
            className="w-full rounded-none ring-x-0"
            onOpenclawServerReady={(url) => {
              setInternalApiUrl(url);
            }}
            onWeNodeReady={onWeNodeReady}
          />
        ) : null}
      </div>
    </main>
  );
}
