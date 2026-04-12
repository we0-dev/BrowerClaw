import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";

import type { OpenClawConfig } from "../config/config.js";
import type { ModelApi } from "../config/types.models.js";
import { CONFIG_PATH, writeConfigFile } from "../config/config.js";
import { loadConfig } from "../config/config.js";
import {
  resolveDefaultSessionStorePath,
  resolveSessionFilePath,
  resolveSessionTranscriptPath,
  updateSessionStore,
} from "../config/sessions.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";
import { agentCommand } from "../commands/agent.js";
import { resolveSession } from "../commands/agent/session.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "./agent-scope.js";
import { loadWorkspaceSkillEntries } from "./skills.js";
import { ensureAgentWorkspace } from "./workspace.js";
import { mergeBrowserPreviewGuidance } from "./browser-preview-guidance.js";

const DEFAULT_AGENT_ID = "main";
const DEFAULT_PORT = 3187;

export const BUILTIN_TOOLS = [
  "read",
  "write",
  "edit",
  "apply_patch",
  "grep",
  "find",
  "ls",
  "exec",
  "process",
  "memory_search",
  "memory_get",
  "web_search",
  "web_fetch",
  "image",
] as const;

type SetupConfig = OpenClawConfig & {
  agents?: {
    defaults?: {
      workspace?: string;
      model?: string | { primary?: string };
    };
  };
  models?: {
    providers?: Record<
      string,
      {
        api?: ModelApi;
        models?: Array<{ id?: string; api?: ModelApi }>;
      }
    >;
  };
};

type ConversationOptions = {
  message: string;
  sessionId?: string;
  sessionKey?: string;
  agentId?: string;
  /** Optional per-request workspace override (chat/task aware). */
  workspace?: string;
  /** Optional per-request system-prompt append from web frontend. */
  extraSystemPrompt?: string;
  json?: boolean;
  runtime?: RuntimeEnv;
};

type ConversationResult = Awaited<ReturnType<typeof agentCommand>> & {
  output: string;
  sessionId: string;
};

function parseArgs(argv: string[]): {
  command?: string;
  flags: Map<string, string | boolean>;
} {
  const flags = new Map<string, string | boolean>();
  const [, , command, ...rest] = argv;
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("-")) continue;
    const next = rest[i + 1];
    if (next && !next.startsWith("-")) {
      flags.set(token, next);
      i += 1;
    } else {
      flags.set(token, true);
    }
  }
  return { command, flags };
}

function getFlag(flags: Map<string, string | boolean>, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = flags.get(name);
    if (typeof value === "string") return value;
  }
  return undefined;
}

function hasFlag(flags: Map<string, string | boolean>, ...names: string[]): boolean {
  return names.some((name) => flags.get(name) === true);
}

function createSessionId(): string {
  return `session-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function stringifyRuntimeLog(args: unknown[]): string {
  return args
    .map((value) => {
      if (typeof value === "string") return value;
      if (value == null) return "";
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    })
    .filter((part) => part.trim())
    .join(" ");
}

async function readSetupConfig(): Promise<SetupConfig> {
  return loadConfig() as SetupConfig;
}

function resolveConfiguredPrimaryModel(config: SetupConfig): string | undefined {
  const raw = config.agents?.defaults?.model;
  if (typeof raw === "string") return raw.trim() || undefined;
  return raw?.primary?.trim() || undefined;
}

async function ensurePiEmbeddedConfigCompatibility(): Promise<SetupConfig> {
  const config = await readSetupConfig();
  const [providerId, provider] = Object.entries(config.models?.providers ?? {})[0] ?? [];
  if (!providerId || !provider) return config;

  const modelId = provider.models?.[0]?.id?.trim();
  const configuredPrimary = resolveConfiguredPrimaryModel(config);
  const nextPrimary = configuredPrimary ?? (modelId ? `${providerId}/${modelId}` : undefined);
  const providerApi = provider.api ?? "openai-completions";
  const needsProviderApi =
    provider.api == null || (provider.models ?? []).some((entry) => entry.api == null);

  if (!nextPrimary && !needsProviderApi) return config;
  if (configuredPrimary && !needsProviderApi) return config;

  const next: SetupConfig = {
    ...config,
    models: {
      ...config.models,
      providers: {
        ...config.models?.providers,
        [providerId]: {
          ...provider,
          api: providerApi,
          models: (provider.models ?? []).map((entry) => ({
            ...entry,
            api: entry.api ?? providerApi,
          })) as NonNullable<typeof provider.models>,
        },
      },
    },
    agents: {
      ...config.agents,
      defaults: {
        ...config.agents?.defaults,
        model: nextPrimary
          ? typeof config.agents?.defaults?.model === "object"
            ? {
                ...config.agents.defaults.model,
                primary: nextPrimary,
              }
            : {
                primary: nextPrimary,
              }
          : config.agents?.defaults?.model,
      },
    },
  };
  await writeConfigFile(next);
  return next;
}

export async function runSetup(): Promise<void> {
  const config = await ensurePiEmbeddedConfigCompatibility();
  const agentId = resolveDefaultAgentId(config);
  const workspace =
    config.agents?.defaults?.workspace?.trim() || resolveAgentWorkspaceDir(config, agentId);

  const next: SetupConfig = {
    ...config,
    agents: {
      ...config.agents,
      defaults: {
        ...config.agents?.defaults,
        workspace,
      },
    },
  };

  await writeConfigFile(next);
  const workspaceInfo = await ensureAgentWorkspace({
    dir: workspace,
    ensureBootstrapFiles: true,
  });
  const sessionsDir = path.dirname(resolveSessionTranscriptPath("placeholder", agentId));
  await fs.mkdir(sessionsDir, { recursive: true });

  console.log(`Config: ${CONFIG_PATH}`);
  console.log(`Workspace: ${workspaceInfo.dir}`);
  console.log(`Sessions: ${sessionsDir}`);
  console.log(`Session Store: ${resolveDefaultSessionStorePath(agentId)}`);
}

export async function runSkills(flags?: Map<string, string | boolean>): Promise<void> {
  const config = loadConfig();
  const agentId = getFlag(flags ?? new Map(), "--agent")?.trim() || resolveDefaultAgentId(config);
  const workspaceDir = resolveAgentWorkspaceDir(config, agentId);
  await ensureAgentWorkspace({ dir: workspaceDir, ensureBootstrapFiles: true });
  const entries = loadWorkspaceSkillEntries(workspaceDir, { config });
  const names = Array.from(new Set(entries.map((entry) => entry.skill.name))).sort();
  if (names.length === 0) {
    console.log("No skills found.");
    return;
  }
  for (const name of names) {
    console.log(name);
  }
}

function renderPayloadOutput(
  payloads: Array<{
    text?: string;
    mediaUrl?: string;
    mediaUrls?: string[];
  }> = [],
): string {
  const lines: string[] = [];
  for (const payload of payloads) {
    if (typeof payload.text === "string" && payload.text.trim()) {
      lines.push(payload.text.trimEnd());
    }
    if (typeof payload.mediaUrl === "string" && payload.mediaUrl.trim()) {
      lines.push(`MEDIA:${payload.mediaUrl.trim()}`);
    }
    if (Array.isArray(payload.mediaUrls)) {
      for (const entry of payload.mediaUrls) {
        if (typeof entry === "string" && entry.trim()) lines.push(`MEDIA:${entry.trim()}`);
      }
    }
  }
  return lines.join("\n\n").trim();
}

export async function runConversation(opts: ConversationOptions): Promise<ConversationResult> {
  await ensurePiEmbeddedConfigCompatibility();
  const sessionId = opts.sessionId?.trim() || createSessionId();
  const extraSystemPrompt = mergeBrowserPreviewGuidance(opts.extraSystemPrompt?.trim() || undefined);
  const captured: string[] = [];
  const runtime =
    opts.runtime ??
    ({
      log: (...args: Parameters<typeof console.log>) => {
        captured.push(stringifyRuntimeLog(args));
      },
      error: (...args: Parameters<typeof console.error>) => {
        captured.push(stringifyRuntimeLog(args));
      },
      exit: (code: number) => {
        throw new Error(`Runtime requested exit(${code})`);
      },
    } satisfies RuntimeEnv);

  const result = await agentCommand(
    {
      message: opts.message,
      sessionId,
      sessionKey: opts.sessionKey,
      agentId: opts.agentId,
      workspace: opts.workspace,
      extraSystemPrompt,
      json: opts.json,
    },
    runtime,
  );

  const output = renderPayloadOutput(result.payloads) || captured.filter(Boolean).join("\n").trim();
  return {
    ...result,
    output,
    sessionId,
  };
}

async function resetSession(sessionId: string, agentId?: string): Promise<void> {
  const cfg = loadConfig();
  const resolvedAgentId = agentId?.trim() || resolveDefaultAgentId(cfg);
  const resolution = resolveSession({
    cfg,
    sessionId,
    agentId: resolvedAgentId,
  });
  const transcriptPath = resolveSessionFilePath(resolution.sessionId, resolution.sessionEntry, {
    agentId: resolvedAgentId,
  });
  await fs.unlink(transcriptPath).catch(() => undefined);

  if (resolution.sessionKey) {
    await updateSessionStore(resolution.storePath, (store: Record<string, { sessionId: string }>) => {
      delete store[resolution.sessionKey!];
    });
    return;
  }

  await updateSessionStore(resolution.storePath, (store: Record<string, { sessionId: string }>) => {
    for (const [key, entry] of Object.entries(store)) {
      if (entry?.sessionId === sessionId) delete store[key];
    }
  }).catch(() => undefined);
}

export async function runAgent(flags: Map<string, string | boolean>): Promise<void> {
  const message = getFlag(flags, "-m", "--message")?.trim();
  if (!message) throw new Error("Missing --message");
  const sessionId = getFlag(flags, "-s", "--session")?.trim();
  const sessionKey = getFlag(flags, "--session-key")?.trim();
  const agentId = getFlag(flags, "-a", "--agent")?.trim();
  const json = hasFlag(flags, "--json");

  await runConversation({
    message,
    sessionId,
    sessionKey,
    agentId,
    json,
    runtime: defaultRuntime,
  });
}

export async function runChat(flags: Map<string, string | boolean>): Promise<void> {
  const agentId = getFlag(flags, "-a", "--agent")?.trim();
  const sessionId = getFlag(flags, "-s", "--session")?.trim() || createSessionId();

  console.log("OpenClaw chat");
  console.log(`Session: ${sessionId}`);
  if (agentId) console.log(`Agent: ${agentId}`);
  console.log("Commands: /exit /reset");

  const rl = readline.createInterface({ input, output, prompt: "> " });
  rl.prompt();

  for await (const line of rl) {
    const message = line.trim();
    if (!message) {
      rl.prompt();
      continue;
    }
    if (message === "/exit" || message === "/quit") {
      rl.close();
      break;
    }
    if (message === "/reset") {
      await resetSession(sessionId, agentId);
      console.log("Session reset.");
      rl.prompt();
      continue;
    }

    try {
      const result = await runConversation({
        message,
        sessionId,
        agentId,
      });
      console.log(`\n${result.output || "(no reply)"}\n`);
    } catch (error) {
      console.error(`[openclaw] ${error instanceof Error ? error.message : String(error)}`);
    }
    rl.prompt();
  }
}

function renderWebApp(port: number): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenClaw Chat</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "SF Mono", "IBM Plex Mono", "Menlo", monospace;
        background: #f4efe6;
        color: #1d1b19;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(193, 97, 47, 0.18), transparent 30%),
          linear-gradient(180deg, #f8f3ea 0%, #efe5d8 100%);
      }
      .shell {
        width: min(960px, 100%);
        margin: 0 auto;
        padding: 32px 16px 48px;
      }
      .hero {
        margin-bottom: 16px;
        padding: 20px 22px;
        border: 1px solid #d6c4af;
        background: rgba(255,255,255,0.72);
        backdrop-filter: blur(12px);
        border-radius: 20px;
      }
      .hero h1 { margin: 0 0 8px; font-size: 28px; }
      .hero p { margin: 0; color: #5a5048; }
      .chat {
        border: 1px solid #d6c4af;
        background: rgba(255,255,255,0.82);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 18px 50px rgba(68, 45, 24, 0.12);
      }
      .meta {
        padding: 14px 18px;
        border-bottom: 1px solid #e5d7c5;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 13px;
        color: #6b5f55;
      }
      #messages {
        min-height: 55vh;
        max-height: 65vh;
        overflow: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .msg {
        max-width: 86%;
        padding: 14px 16px;
        border-radius: 16px;
        white-space: pre-wrap;
        line-height: 1.5;
      }
      .user {
        align-self: flex-end;
        background: #1f4b45;
        color: #f7f3ee;
      }
      .assistant {
        align-self: flex-start;
        background: #efe1d0;
        color: #251f19;
      }
      form {
        border-top: 1px solid #e5d7c5;
        padding: 16px;
        display: grid;
        gap: 12px;
        background: rgba(250,245,238,0.9);
      }
      textarea {
        width: 100%;
        min-height: 110px;
        resize: vertical;
        border: 1px solid #cdb79b;
        border-radius: 14px;
        padding: 14px;
        font: inherit;
        background: #fffdfa;
      }
      .row {
        display: flex;
        gap: 12px;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
      }
      input {
        border: 1px solid #cdb79b;
        border-radius: 12px;
        padding: 10px 12px;
        font: inherit;
        background: #fffdfa;
      }
      button {
        border: 0;
        border-radius: 999px;
        padding: 11px 18px;
        font: inherit;
        color: #fff8ef;
        background: #bc5d2f;
        cursor: pointer;
      }
      button:disabled { opacity: 0.6; cursor: wait; }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="hero">
        <h1>OpenClaw Chat</h1>
        <p>Embedded Pi agent runtime on http://127.0.0.1:${port}</p>
      </div>
      <div class="chat">
        <div class="meta">
          <div>Continuous conversation with the embedded OpenClaw agent runtime</div>
          <div id="status">Ready</div>
        </div>
        <div id="messages"></div>
        <form id="chat-form">
          <div class="row">
            <input id="session" placeholder="session id (optional)" />
            <button type="button" id="reset">Reset Session</button>
          </div>
          <textarea id="message" placeholder="Type your message"></textarea>
          <div class="row">
            <div>Workspace-aware chat</div>
            <button type="submit" id="send">Send</button>
          </div>
        </form>
      </div>
    </div>
    <script>
      const messagesEl = document.getElementById("messages");
      const form = document.getElementById("chat-form");
      const messageEl = document.getElementById("message");
      const sessionEl = document.getElementById("session");
      const statusEl = document.getElementById("status");
      const sendEl = document.getElementById("send");
      const resetEl = document.getElementById("reset");

      function addMessage(role, text) {
        const item = document.createElement("div");
        item.className = "msg " + role;
        item.textContent = text;
        messagesEl.appendChild(item);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      async function sendMessage(message, reset) {
        statusEl.textContent = "Thinking...";
        sendEl.disabled = true;
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              sessionId: sessionEl.value.trim() || undefined,
              message,
              reset
            })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Request failed");
          if (data.sessionId) sessionEl.value = data.sessionId;
          if (message) addMessage("user", message);
          if (data.output) addMessage("assistant", data.output);
          statusEl.textContent = "Ready";
        } catch (error) {
          statusEl.textContent = "Error";
          addMessage("assistant", String(error.message || error));
        } finally {
          sendEl.disabled = false;
        }
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = messageEl.value.trim();
        if (!message) return;
        messageEl.value = "";
        await sendMessage(message, false);
      });

      resetEl.addEventListener("click", async () => {
        const sessionId = sessionEl.value.trim();
        if (!sessionId) return;
        messagesEl.innerHTML = "";
        await sendMessage("", true);
      });
    </script>
  </body>
</html>`;
}

async function handleChatRequest(body: string): Promise<{ sessionId: string; output: string }> {
  const parsed = JSON.parse(body) as {
    sessionId?: string;
    message?: string;
    reset?: boolean;
    workspace?: string;
    extraSystemPrompt?: string;
  };
  const sessionId = parsed.sessionId?.trim() || createSessionId();
  if (parsed.reset) {
    await resetSession(sessionId);
    return { sessionId, output: "Session reset." };
  }
  const message = parsed.message?.trim();
  if (!message) throw new Error("Message is required");
  const workspace = parsed.workspace?.trim() || undefined;
  const clientExtra = parsed.extraSystemPrompt?.trim() || undefined;
  const result = await runConversation({
    message,
    sessionId,
    workspace,
    extraSystemPrompt: clientExtra,
  });
  return { sessionId: result.sessionId, output: result.output };
}

export async function runServe(flags: Map<string, string | boolean>): Promise<void> {
  const portRaw = getFlag(flags, "-p", "--port");
  const port = portRaw ? Number.parseInt(portRaw, 10) : DEFAULT_PORT;
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("Invalid --port");
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(renderWebApp(port));
        return;
      }
      if (req.method === "POST" && req.url === "/api/chat") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const result = await handleChatRequest(Buffer.concat(chunks).toString("utf8"));
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(result));
        return;
      }
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: message }));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  console.log(`OpenClaw web chat: http://127.0.0.1:${port}`);
}

function printHelp(): void {
  console.log("OpenClaw");
  console.log("");
  console.log("Commands:");
  console.log("  openclaw setup");
  console.log("  openclaw agent --message \"...\" [--session <id>] [--agent <id>] [--json]");
  console.log("  openclaw chat [--session <id>] [--agent <id>]");
  console.log("  openclaw serve [--port 3187]");
  console.log("  openclaw skills [--agent <id>]");
  console.log("");
  console.log("Core tools:");
  console.log(`  ${BUILTIN_TOOLS.join(" ")}`);
  console.log("");
  console.log(`Config: ${CONFIG_PATH}`);
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const { command, flags } = parseArgs(argv);
  if (!command || command === "help" || hasFlag(flags, "-h", "--help")) {
    printHelp();
    return;
  }
  if (command === "setup") {
    await runSetup();
    return;
  }
  if (command === "skills") {
    await runSkills(flags);
    return;
  }
  if (command === "chat") {
    await runChat(flags);
    return;
  }
  if (command === "serve") {
    await runServe(flags);
    return;
  }
  if (command === "agent") {
    await runAgent(flags);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}
