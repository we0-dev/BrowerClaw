import type {
  BlockStreamingChunkConfig,
  BlockStreamingCoalesceConfig,
  HumanDelayConfig,
  TypingMode,
} from "./types.base.js";
import type { ChannelId } from "../channels/plugins/types.js";
import type {
  SandboxBrowserSettings,
  SandboxDockerSettings,
  SandboxPruneSettings,
} from "./types.sandbox.js";
import type { MemorySearchConfig } from "./types.tools.js";

export type AgentModelEntryConfig = {
  alias?: string;
  params?: Record<string, unknown>;
};

export type AgentModelListConfig = {
  primary?: string;
  fallbacks?: string[];
};

export type AgentContextPruningConfig = {
  mode?: "off" | "cache-ttl";
  ttl?: string;
  keepLastAssistants?: number;
  softTrimRatio?: number;
  hardClearRatio?: number;
  minPrunableToolChars?: number;
  tools?: {
    allow?: string[];
    deny?: string[];
  };
  softTrim?: {
    maxChars?: number;
    headChars?: number;
    tailChars?: number;
  };
  hardClear?: {
    enabled?: boolean;
    placeholder?: string;
  };
};

export type CliBackendConfig = {
  command: string;
  args?: string[];
  output?: "json" | "text" | "jsonl";
  resumeOutput?: "json" | "text" | "jsonl";
  input?: "arg" | "stdin";
  maxPromptArgChars?: number;
  env?: Record<string, string>;
  clearEnv?: string[];
  modelArg?: string;
  modelAliases?: Record<string, string>;
  sessionArg?: string;
  sessionArgs?: string[];
  resumeArgs?: string[];
  sessionMode?: "always" | "existing" | "none";
  sessionIdFields?: string[];
  systemPromptArg?: string;
  systemPromptMode?: "append" | "replace";
  systemPromptWhen?: "first" | "always" | "never";
  imageArg?: string;
  imageMode?: "repeat" | "list";
  serialize?: boolean;
};

export type AgentCompactionMode = "default" | "safeguard";

export type AgentCompactionMemoryFlushConfig = {
  enabled?: boolean;
  softThresholdTokens?: number;
  prompt?: string;
  systemPrompt?: string;
};

export type AgentCompactionConfig = {
  mode?: AgentCompactionMode;
  reserveTokensFloor?: number;
  maxHistoryShare?: number;
  memoryFlush?: AgentCompactionMemoryFlushConfig;
};

export type AgentDefaultsConfig = {
  model?: AgentModelListConfig;
  imageModel?: AgentModelListConfig;
  models?: Record<string, AgentModelEntryConfig>;
  workspace?: string;
  repoRoot?: string;
  skipBootstrap?: boolean;
  bootstrapMaxChars?: number;
  userTimezone?: string;
  timeFormat?: "auto" | "12" | "24";
  envelopeTimezone?: string;
  envelopeTimestamp?: "on" | "off";
  envelopeElapsed?: "on" | "off";
  contextTokens?: number;
  cliBackends?: Record<string, CliBackendConfig>;
  contextPruning?: AgentContextPruningConfig;
  compaction?: AgentCompactionConfig;
  memorySearch?: MemorySearchConfig;
  thinkingDefault?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  verboseDefault?: "off" | "on" | "full";
  elevatedDefault?: "off" | "on" | "ask" | "full";
  blockStreamingDefault?: "off" | "on";
  blockStreamingBreak?: "text_end" | "message_end";
  blockStreamingChunk?: BlockStreamingChunkConfig;
  blockStreamingCoalesce?: BlockStreamingCoalesceConfig;
  humanDelay?: HumanDelayConfig;
  timeoutSeconds?: number;
  mediaMaxMb?: number;
  typingIntervalSeconds?: number;
  typingMode?: TypingMode;
  heartbeat?: {
    every?: string;
    activeHours?: {
      start?: string;
      end?: string;
      timezone?: string;
    };
    model?: string;
    session?: string;
    target?: "last" | "none" | ChannelId;
    to?: string;
    prompt?: string;
    ackMaxChars?: number;
    includeReasoning?: boolean;
  };
  maxConcurrent?: number;
  subagents?: {
    maxConcurrent?: number;
    archiveAfterMinutes?: number;
    model?: string | { primary?: string; fallbacks?: string[] };
  };
  sandbox?: {
    mode?: "off" | "non-main" | "all";
    workspaceAccess?: "none" | "ro" | "rw";
    sessionToolsVisibility?: "spawned" | "all";
    scope?: "session" | "agent" | "shared";
    perSession?: boolean;
    workspaceRoot?: string;
    docker?: SandboxDockerSettings;
    browser?: SandboxBrowserSettings;
    prune?: SandboxPruneSettings;
  };
};
