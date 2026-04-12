import type { MsgContext } from "../../auto-reply/templating.js";
import { normalizeChatType } from "../../channels/chat-type.js";
import type { GroupKeyResolution, SessionEntry, SessionOrigin } from "./types.js";

export function deriveSessionOrigin(ctx: MsgContext): SessionOrigin | undefined {
  const provider = ctx.Provider?.trim();
  const from = ctx.From?.trim();
  const to = ctx.To?.trim();
  const origin: SessionOrigin = {
    provider: provider || undefined,
    from: from || undefined,
    to: to || undefined,
    chatType: normalizeChatType(ctx.ChatType),
  };
  return Object.values(origin).some(Boolean) ? origin : undefined;
}

export function snapshotSessionOrigin(entry?: SessionEntry): SessionOrigin | undefined {
  return entry?.origin ? { ...entry.origin } : undefined;
}

export function deriveGroupSessionPatch(params: {
  ctx: MsgContext;
  sessionKey: string;
  existing?: SessionEntry;
  groupResolution?: GroupKeyResolution | null;
}): Partial<SessionEntry> | null {
  const resolution = params.groupResolution;
  const ctxRecord = params.ctx as Record<string, unknown>;
  const groupId =
    typeof ctxRecord.GroupId === "string" ? ctxRecord.GroupId.trim() : undefined;
  if (!resolution?.channel && !groupId) return null;
  return {
    chatType: normalizeChatType(params.ctx.ChatType) ?? resolution?.chatType ?? "group",
    channel: resolution?.channel ?? params.ctx.Provider?.trim(),
    groupId: resolution?.id ?? groupId,
    subject: params.ctx.GroupSubject?.trim() || params.existing?.subject,
    groupChannel: params.ctx.GroupChannel?.trim() || params.existing?.groupChannel,
    space: params.ctx.GroupSpace?.trim() || params.existing?.space,
  };
}

export function deriveSessionMetaPatch(params: {
  ctx: MsgContext;
  sessionKey: string;
  existing?: SessionEntry;
  groupResolution?: GroupKeyResolution | null;
}): Partial<SessionEntry> | null {
  const patch = deriveGroupSessionPatch(params) ?? {};
  const origin = deriveSessionOrigin(params.ctx);
  if (origin) patch.origin = { ...(params.existing?.origin ?? {}), ...origin };
  return Object.keys(patch).length > 0 ? patch : null;
}
