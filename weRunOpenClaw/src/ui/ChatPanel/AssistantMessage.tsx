import type { ReactNode } from "react";

export interface AssistantMessageProps {
  name?: string;
  letter?: string;
  children: ReactNode;
  className?: string;
}

export function AssistantMessage({
  name = "BrowserClaw",
  letter = "W",
  children,
  className = "",
}: AssistantMessageProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center mt-1 shrink-0">
        <span className="text-emerald-700 font-semibold">{letter}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-zinc-900">{name}</div>
        <div className="mt-2 rounded-2xl bg-white ring-1 ring-zinc-200 px-4 py-3">
          {children}
        </div>
      </div>
    </div>
  );
}
