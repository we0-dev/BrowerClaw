import { useMemo, useState } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type { RightPanelProps } from "./types";
import { RightPanelTabs } from "./RightPanelTabs";
import { RightTaskFolderTab } from "./RightTaskFolderTab";
import { RightTaskProductsTab } from "./RightTaskProductsTab";
import { RightTaskPreviewTab } from "./RightTaskPreviewTab";

export function RightPanel({
  tabs,
  activeTabIndex: activeTabIndexProp = 0,
  previewRefreshVersion = 0,
  onTabChange,
  onMenuClick,
  onPreviewRefresh,
  taskId,
  weNode,
  virtualPreviewServers = [],
  terminalContent,
}: RightPanelProps) {
  const { t } = useLocale();
  const resolvedTabs = useMemo(
    () =>
      tabs ?? [
        t("rightTabArtifacts"),
        t("rightTabFolder"),
        t("rightTabPreview"),
        t("rightTabTerminal"),
      ],
    [tabs, t]
  );
  const [internalTab, setInternalTab] = useState(0);
  const controlled = typeof onTabChange === "function";
  const activeTabIndex = controlled ? activeTabIndexProp : internalTab;
  const handleTabChange = (i: number) => {
    if (controlled) onTabChange?.(i);
    else setInternalTab(i);
  };

  const tid = taskId ?? "";
  const previewList = useMemo(
    () => [...virtualPreviewServers].sort((a, b) => a.port - b.port),
    [virtualPreviewServers]
  );

  return (
    <aside className="h-full min-h-0 bg-zinc-50/50 overflow-hidden flex flex-col">
      <div className="h-full flex flex-col min-h-0">
        <RightPanelTabs
          tabs={resolvedTabs}
          activeIndex={activeTabIndex}
          onTabChange={handleTabChange}
          onMenuClick={onMenuClick}
        />
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {!tid ? (
            <p className="p-4 text-xs text-zinc-400">{t("rightNoTask")}</p>
          ) : (
            <>
              <div className={`flex-1 min-h-0 ${activeTabIndex === 0 ? "" : "hidden"}`}>
                <RightTaskProductsTab taskId={tid} weNode={weNode ?? null} />
              </div>
              <div className={`flex-1 min-h-0 ${activeTabIndex === 1 ? "" : "hidden"}`}>
                <RightTaskFolderTab taskId={tid} weNode={weNode ?? null} />
              </div>
              <div className={`flex-1 min-h-0 ${activeTabIndex === 2 ? "" : "hidden"}`}>
                <RightTaskPreviewTab
                  servers={previewList}
                  refreshVersion={previewRefreshVersion}
                  onRefresh={onPreviewRefresh}
                />
              </div>
              <div className={`flex-1 min-h-0 p-3 bg-zinc-50/30 ${activeTabIndex === 3 ? "" : "hidden"}`}>
                {terminalContent}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
