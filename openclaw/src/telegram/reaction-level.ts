import type { OpenClawConfig } from "../config/config.js";

export function resolveTelegramReactionLevel(_params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): {
  agentReactionGuidance?: "minimal" | "extensive";
} {
  return {};
}
