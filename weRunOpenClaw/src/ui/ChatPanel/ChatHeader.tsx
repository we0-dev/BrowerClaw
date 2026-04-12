import { useLocale } from "../../i18n/LocaleContext";

export interface ChatHeaderProps {
  title: string;
  className?: string;
  frontendPreviewPromptEnabled?: boolean;
  onToggleFrontendPreviewPrompt?: (enabled: boolean) => void;
}

export function ChatHeader({
  title,
  className = "",
  frontendPreviewPromptEnabled = true,
  onToggleFrontendPreviewPrompt,
}: ChatHeaderProps) {
  const { t } = useLocale();
  return (
    <div
      className={`h-11 flex items-center justify-between px-4 bg-white sticky top-0 z-10 ${className}`}
    >
      <div className="text-[13px] font-bold text-zinc-900 truncate tracking-tight">{title}</div>
      <button
        type="button"
        onClick={() => onToggleFrontendPreviewPrompt?.(!frontendPreviewPromptEnabled)}
        className={`ml-3 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-semibold transition-colors ${
          frontendPreviewPromptEnabled
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-zinc-300 bg-zinc-50 text-zinc-500"
        }`}
        title={t("chatFrontendPreviewTitle")}
      >
        <span>{t("chatFrontendPreviewMode")}</span>
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            frontendPreviewPromptEnabled ? "bg-emerald-500" : "bg-zinc-400"
          }`}
        />
      </button>
    </div>
  );
}
