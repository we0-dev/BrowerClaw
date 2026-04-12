import { useMemo } from "react";
import { useLocale } from "../i18n/LocaleContext";

export type CenterWorkspaceTab = "chat" | "skills" | "config";

export function CenterWorkspaceTabs({
  value,
  onChange,
}: {
  value: CenterWorkspaceTab;
  onChange: (tab: CenterWorkspaceTab) => void;
}) {
  const { t } = useLocale();
  const tabs = useMemo(
    () =>
      [
        { id: "chat" as const, label: t("centerTabChat") },
        { id: "skills" as const, label: t("centerTabSkills") },
        { id: "config" as const, label: t("centerTabConfig") },
      ] as const,
    [t]
  );
  return (
    <div className="shrink-0 min-h-0 overflow-x-auto bg-white px-2 pt-2 pb-1">
      <div className="flex items-center gap-1 px-1">
        {tabs.map((t) => {
          const on = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={[
                "text-[12px] px-4 py-1.5 rounded-lg transition-all duration-200 relative",
                on
                  ? "bg-white shadow-sm ring-1 ring-zinc-200 text-zinc-900 font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50",
              ].join(" ")}
              onClick={() => onChange(t.id)}
            >
              {t.label}
              {on && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-zinc-900" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
