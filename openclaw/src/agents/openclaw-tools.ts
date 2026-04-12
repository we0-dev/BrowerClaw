import type { OpenClawConfig } from "../config/config.js";
import type { GatewayMessageChannel } from "../utils/message-channel.js";
import { createImageTool } from "./tools/image-tool.js";
import { createMemoryGetTool, createMemorySearchTool } from "./tools/memory-tool.js";
import type { AnyAgentTool } from "./tools/common.js";
import { createWebFetchTool, createWebSearchTool } from "./tools/web-tools.js";

export function createOpenClawTools(options?: {
  sandboxBrowserBridgeUrl?: string;
  allowHostBrowserControl?: boolean;
  agentSessionKey?: string;
  agentChannel?: GatewayMessageChannel;
  agentAccountId?: string;
  agentTo?: string;
  agentThreadId?: string | number;
  agentGroupId?: string | null;
  agentGroupChannel?: string | null;
  agentGroupSpace?: string | null;
  agentDir?: string;
  sandboxRoot?: string;
  workspaceDir?: string;
  sandboxed?: boolean;
  config?: OpenClawConfig;
  pluginToolAllowlist?: string[];
  currentChannelId?: string;
  currentThreadTs?: string;
  replyToMode?: "off" | "first" | "all";
  hasRepliedRef?: { value: boolean };
  modelHasVision?: boolean;
  requesterAgentIdOverride?: string;
}): AnyAgentTool[] {
  const imageTool = options?.agentDir?.trim()
    ? createImageTool({
        config: options?.config,
        agentDir: options.agentDir,
        sandboxRoot: options?.sandboxRoot,
        modelHasVision: options?.modelHasVision,
      })
    : null;
  const webSearchTool = createWebSearchTool({
    config: options?.config,
    sandboxed: options?.sandboxed,
  });
  const webFetchTool = createWebFetchTool({
    config: options?.config,
    sandboxed: options?.sandboxed,
  });
  const memorySearchTool = createMemorySearchTool({
    config: options?.config,
    agentSessionKey: options?.agentSessionKey,
  });
  const memoryGetTool = createMemoryGetTool({
    config: options?.config,
    agentSessionKey: options?.agentSessionKey,
  });

  return [
    ...(memorySearchTool ? [memorySearchTool] : []),
    ...(memoryGetTool ? [memoryGetTool] : []),
    ...(webSearchTool ? [webSearchTool] : []),
    ...(webFetchTool ? [webFetchTool] : []),
    ...(imageTool ? [imageTool] : []),
  ];
}
