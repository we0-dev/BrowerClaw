export type MessagingToolSend = {
  tool: string;
  provider: string;
  accountId?: string;
  to?: string;
};

export function isMessagingTool(toolName: string): boolean {
  return toolName === "message";
}

export function isMessagingToolSendAction(
  toolName: string,
  args: Record<string, unknown>,
): boolean {
  if (toolName !== "message") return false;
  const action = typeof args.action === "string" ? args.action.trim() : "";
  return action === "send" || action === "thread-reply";
}
