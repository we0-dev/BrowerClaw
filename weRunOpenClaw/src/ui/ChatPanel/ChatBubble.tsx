import type { ReactNode } from "react";

export interface ChatBubbleProps {
  role: "user" | "assistant";
  children: ReactNode;
  className?: string;
}

export function ChatBubble({ role, children, className = "" }: ChatBubbleProps) {
  const isUser = role === "user";
  return (
    <div
      className={[
        "flex",
        isUser ? "justify-end" : "justify-start",
        "animate-in fade-in slide-in-from-bottom-1 duration-200",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed",
          isUser
            ? "bg-zinc-900 text-white"
            : "bg-zinc-100/70 text-zinc-900 border border-zinc-200/50",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
