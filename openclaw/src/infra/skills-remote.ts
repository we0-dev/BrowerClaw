import type { OpenClawConfig } from "../config/config.js";
import type { SkillEligibilityContext, SkillEntry } from "../agents/skills.js";

export function setSkillsRemoteRegistry(_registry: unknown) {}

export async function primeRemoteSkillsCache() {}

export function recordRemoteNodeInfo(_node: unknown) {}

export function recordRemoteNodeBins(_nodeId: string, _bins: string[]) {}

export function getRemoteSkillEligibility(): SkillEligibilityContext {
  return {
    remote: {
      platforms: [],
      hasBin: () => false,
      hasAnyBin: () => false,
    },
  };
}

export async function buildRemoteSkillEligibility(_cfg: OpenClawConfig): Promise<SkillEntry[]> {
  return [];
}
