import type { OpenClawConfig } from "../config/config.js";
import type { WorkspaceBootstrapFile } from "../agents/workspace.js";

export type AgentBootstrapHookContext = {
  workspaceDir: string;
  bootstrapFiles: WorkspaceBootstrapFile[];
  cfg?: OpenClawConfig;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
};

export type InternalHookEvent<TContext = unknown> = {
  area: string;
  event: string;
  sessionKey: string;
  context: TContext;
};

export function createInternalHookEvent<TContext>(
  area: string,
  event: string,
  sessionKey: string,
  context: TContext,
): InternalHookEvent<TContext> {
  return { area, event, sessionKey, context };
}

export async function triggerInternalHook(_event: InternalHookEvent): Promise<void> {}
