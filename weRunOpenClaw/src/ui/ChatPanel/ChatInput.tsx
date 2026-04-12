import { useLocale } from "../../i18n/LocaleContext";

export interface ChatInputProps {
  placeholder?: string;
  sendLabel?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onSend?: () => void;
  className?: string;
}

export function ChatInput({
  placeholder,
  sendLabel,
  value = "",
  onValueChange,
  onSend,
  className = "",
}: ChatInputProps) {
  const { t } = useLocale();
  const resolvedPlaceholder = placeholder ?? t("chatInputPlaceholder");
  const resolvedSend = sendLabel ?? t("chatSend");
  return (
    <div
      className={`flex items-end gap-2 bg-zinc-100/50 border border-zinc-200 rounded-2xl p-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all duration-200 ${className}`}
    >
      <textarea
        className="w-full bg-transparent text-[14px] outline-none placeholder:text-zinc-400 py-2 px-3 resize-none max-h-32 min-h-[40px]"
        placeholder={resolvedPlaceholder}
        rows={1}
        value={value}
        onChange={(e) => {
          onValueChange?.(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend?.();
          }
        }}
      />
      <button
        type="button"
        aria-label={resolvedSend}
        className="shrink-0 rounded-xl bg-zinc-900 text-white p-2.5 hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
        onClick={onSend}
        disabled={!value.trim()}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
