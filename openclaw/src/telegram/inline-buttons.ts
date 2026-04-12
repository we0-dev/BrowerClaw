import type { OpenClawConfig } from "../config/config.js";
import type { TelegramInlineButtonsScope } from "../config/types.telegram.js";

export function resolveTelegramInlineButtonsScope(_params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): TelegramInlineButtonsScope {
  return "off";
}

export function isTelegramInlineButtonsEnabled(_params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): boolean {
  return false;
}

export function resolveTelegramTargetChatType(_target: string): "direct" | "group" | "unknown" {
  return "unknown";
}
