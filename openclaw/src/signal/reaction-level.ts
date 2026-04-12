import type { OpenClawConfig } from "../config/config.js";

export function resolveSignalReactionLevel(_params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): {
  agentReactionGuidance?: "minimal" | "extensive";
} {
  return {};
}
