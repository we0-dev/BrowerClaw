import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  flushTaskWorkspaceVfsToOpfs,
  hydrateTaskWorkspaceVfs,
  purgeTaskWorkspaceVfsFolder,
} from "../lib/taskWorkspaceVfsSync";
import { useOpfsTasks } from "../hooks/useOpfsTasks";
import { useVirtualOpenclawSkills } from "../hooks/useVirtualOpenclawSkills";
import { useVirtualOpenclawConfig } from "../hooks/useVirtualOpenclawConfig";
import {
  CenterWorkspaceTabs,
  type CenterWorkspaceTab,
} from "../ui/CenterWorkspaceTabs";
import { OpenclawSkillsPanel } from "../ui/RightPanel/OpenclawSkillsPanel";
import { OpenclawConfigPanel } from "../ui/RightPanel/OpenclawConfigPanel";
import {
  mirrorOpfsTasksChatsToOpenclawWorkspace,
  mirrorTaskChatToOpenclawWorkspace,
} from "../lib/syncChatToOpenclawWorkspace";
import { buildTaskWorkspacePreviewFingerprint } from "../lib/taskWorkspacePreviewRefresh";
import type { VirtualPreviewServer } from "../ui/RightPanel/types";
import { Sidebar } from "../ui/Sidebar";
import type { TaskItem } from "../ui/Sidebar/types";
import { ChatPanel } from "../ui/ChatPanel";
import type { PersistedChatMessage } from "../ui/ChatPanel/types";
import { RightPanel } from "../ui/RightPanel";
import { WeNodeTerminalPanel } from "../ui/Terminal/WeNodeTerminalPanel";
import { getDefaultOpenclawConfigJson } from "../ui/Terminal/weNodeBootstrap";
import { useLocale } from "../i18n/LocaleContext";

export function BrowserClawPage() {
  const { t } = useLocale();
  const {
    ready,
    tasks,
    activeRecord,
    selectTask,
    createTask,
    deleteTask,
    persistConversation,
  } = useOpfsTasks();
  const weNodeRef = useRef<unknown>(null);
  const lastWeNodeRef = useRef<unknown>(null);
  const prevActiveTaskIdRef = useRef<string | null>(null);
  const [weNode, setWeNode] = useState<unknown>(null);
  const [mainTab, setMainTab] = useState<CenterWorkspaceTab>("chat");
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [virtualPreviewServers, setVirtualPreviewServers] = useState<VirtualPreviewServer[]>([]);
  const [rightPanelTab, setRightPanelTab] = useState(3);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [previewRefreshVersion, setPreviewRefreshVersion] = useState(0);
  const lastPreviewPortsKeyRef = useRef("");
  const previewFingerprintRef = useRef<string | null>(null);
  const previewRefreshTimerRef = useRef<number | null>(null);
  const openclawSkills = useVirtualOpenclawSkills(weNode);
  const openclawConfig = useVirtualOpenclawConfig();
  const defaultOpenclawConfigJson = useMemo(() => getDefaultOpenclawConfigJson(), []);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 280 && newWidth < 800) {
        setRightPanelWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const onExtraVirtualPortReady = useCallback((port: number, url: string) => {
    setVirtualPreviewServers((prev) => {
      const next = prev.filter((p) => p.port !== port);
      next.push({ port, url });
      return next.sort((a, b) => a.port - b.port);
    });
  }, []);

  /** 非 3187 预览端口就绪时默认切到右侧「预览」tab */
  useEffect(() => {
    const key = virtualPreviewServers
      .map((s) => s.port)
      .sort((a, b) => a - b)
      .join(",");
    if (key === lastPreviewPortsKeyRef.current) return;
    lastPreviewPortsKeyRef.current = key;
    if (key) setRightPanelTab(2);
  }, [virtualPreviewServers]);

  const triggerPreviewRefresh = useCallback(() => {
    setPreviewRefreshVersion((prev) => prev + 1);
  }, []);

  const navItems = useMemo(
    () => [
      { id: "chat" as const, label: t("navNewTask"), active: mainTab === "chat" },
      { id: "skills" as const, label: t("navSkills"), active: mainTab === "skills" },
      { id: "config" as const, label: t("navConfig"), active: mainTab === "config" },
    ],
    [mainTab, t]
  );

  const rightTabs = useMemo(
    () => [
      t("rightTabArtifacts"),
      t("rightTabFolder"),
      t("rightTabPreview"),
      t("rightTabTerminal"),
    ],
    [t]
  );

  useEffect(() => {
    if (!ready) return;
    if (activeRecord) return;
    if (tasks.length > 0) {
      void selectTask(tasks[0].id);
    } else {
      void createTask();
    }
  }, [ready, activeRecord, tasks, selectTask, createTask]);

  const onWeNodeReady = useCallback((w: unknown) => {
    weNodeRef.current = w;
    setWeNode(w);
    void mirrorOpfsTasksChatsToOpenclawWorkspace(w).catch(() => {
      // 镜像失败不影响 UI
    });
  }, []);

  const onConversationPersist = useCallback(
    async (taskId: string, messages: PersistedChatMessage[], sessionId: string | null) => {
      const saved = await persistConversation(taskId, messages, sessionId);
      const w = weNodeRef.current;
      if (saved && w) {
        await mirrorTaskChatToOpenclawWorkspace(w, saved).catch(() => {
          // ignore
        });
        await flushTaskWorkspaceVfsToOpfs(w, taskId).catch(() => {
          // ignore
        });
      }
    },
    [persistConversation]
  );

  /** weNode 就绪或切换左侧任务：OPFS ↔ 当前任务 VFS 对齐，避免多任务工作区串数据 */
  useEffect(() => {
    if (!weNode) {
      return;
    }
    if (!activeRecord) {
      prevActiveTaskIdRef.current = null;
      return;
    }
    const w = weNode;
    const record = activeRecord;
    const taskId = record.id;
    const weNodeChanged = lastWeNodeRef.current !== w;
    lastWeNodeRef.current = w;
    const prevId = prevActiveTaskIdRef.current;
    const taskChanged = prevId !== taskId;
    if (!taskChanged && !weNodeChanged) {
      return;
    }
    void (async () => {
      if (taskChanged && prevId) {
        await flushTaskWorkspaceVfsToOpfs(w, prevId).catch(() => {
          // ignore
        });
      }
      await hydrateTaskWorkspaceVfs(w, record).catch(() => {
        // ignore
      });
      prevActiveTaskIdRef.current = taskId;
    })();
  }, [weNode, activeRecord, activeRecord?.id]);

  /** 定时把当前任务 VFS 工作区刷回 OPFS（agent 在终端改文件时也能落盘） */
  useEffect(() => {
    if (!weNode || !activeRecord) return;
    const taskId = activeRecord.id;
    const tick = () => {
      const w = weNodeRef.current;
      if (w) void flushTaskWorkspaceVfsToOpfs(w, taskId).catch(() => {});
    };
    const id = window.setInterval(tick, 25_000);
    return () => window.clearInterval(id);
  }, [weNode, activeRecord?.id]);

  useEffect(() => {
    previewFingerprintRef.current = null;
    if (previewRefreshTimerRef.current != null) {
      window.clearTimeout(previewRefreshTimerRef.current);
      previewRefreshTimerRef.current = null;
    }
  }, [activeRecord?.id, weNode]);

  useEffect(() => {
    if (!weNode || !activeRecord || virtualPreviewServers.length === 0) return;
    let disposed = false;
    const taskId = activeRecord.id;

    const schedulePreviewRefresh = () => {
      if (previewRefreshTimerRef.current != null) {
        window.clearTimeout(previewRefreshTimerRef.current);
      }
      // 连续写文件时只合并触发一次重载，避免 iframe 抖动。
      previewRefreshTimerRef.current = window.setTimeout(() => {
        previewRefreshTimerRef.current = null;
        triggerPreviewRefresh();
      }, 700);
    };

    const pollWorkspaceChanges = async () => {
      const fingerprint = await buildTaskWorkspacePreviewFingerprint(
        weNodeRef.current ?? weNode,
        taskId
      );
      if (disposed || fingerprint == null) return;
      const prev = previewFingerprintRef.current;
      previewFingerprintRef.current = fingerprint;
      if (prev != null && prev !== fingerprint) {
        schedulePreviewRefresh();
      }
    };

    void pollWorkspaceChanges();
    const id = window.setInterval(() => {
      void pollWorkspaceChanges();
    }, 2000);

    return () => {
      disposed = true;
      window.clearInterval(id);
      if (previewRefreshTimerRef.current != null) {
        window.clearTimeout(previewRefreshTimerRef.current);
        previewRefreshTimerRef.current = null;
      }
    };
  }, [weNode, activeRecord?.id, virtualPreviewServers.length, triggerPreviewRefresh]);

  const taskItems: TaskItem[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: t.subtitle,
  }));

  if (!ready || !activeRecord) {
    return (
      <div className="h-[100vh] min-h-0 max-h-[100vh] overflow-hidden bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-500">{t("loadingTasks")}</p>
      </div>
    );
  }

  return (
    <div 
      className={`h-[100vh] min-h-0 max-h-[100vh] overflow-hidden bg-white flex flex-col font-sans selection:bg-zinc-200 ${isResizing ? 'cursor-col-resize select-none' : ''}`}
    >
      <div 
        className="h-full min-h-0 flex-1 grid relative"
        style={{ gridTemplateColumns: `240px 1fr ${rightPanelWidth}px` }}
      >
        <Sidebar
          searchPlaceholder={t("searchTasks")}
          newTaskLabel={t("newTaskButton")}
          taskSectionTitle={t("taskSection")}
          navSectionTitle={t("navSection")}
          tasks={taskItems}
          navItems={navItems}
          onNewTask={() => {
            setMainTab("chat");
            void (async () => {
              await createTask();
              const w = weNodeRef.current;
              if (w) {
                await mirrorOpfsTasksChatsToOpenclawWorkspace(w).catch(() => {
                  // ignore
                });
              }
            })();
          }}
          onTaskClick={(t) => {
            setMainTab("chat");
            if (t.id) void selectTask(t.id);
          }}
          onTaskDelete={(t) => {
            const tid = t.id;
            if (!tid) return;
            void (async () => {
              await deleteTask(tid);
              const w = weNodeRef.current;
              if (w) {
                await purgeTaskWorkspaceVfsFolder(w, tid).catch(() => {
                  // ignore
                });
                await mirrorOpfsTasksChatsToOpenclawWorkspace(w).catch(() => {
                  // ignore
                });
              }
            })();
          }}
          onNavClick={(item) => {
            if (item.id === "skills") setMainTab("skills");
            if (item.id === "config") setMainTab("config");
            if (item.id === "chat") setMainTab("chat");
          }}
        />
        <div className="min-h-0 h-full flex flex-col overflow-hidden bg-white relative">
          <CenterWorkspaceTabs value={mainTab} onChange={setMainTab} />
          <div className="min-h-0 flex-1 flex flex-col overflow-hidden bg-zinc-50/10">
            {mainTab === "chat" ? (
              <ChatPanel
                title={activeRecord.title}
                inputPlaceholder={t("chatInputPlaceholder")}
                sendLabel={t("chatSend")}
                taskId={activeRecord.id}
                initialPersisted={{
                  messages: activeRecord.messages,
                  sessionId: activeRecord.sessionId,
                }}
                onConversationPersist={onConversationPersist}
                embedWeNodeTerminal={false}
                apiUrl={apiUrl}
              />
            ) : mainTab === "skills" ? (
              <OpenclawSkillsPanel api={openclawSkills} variant="main" />
            ) : (
              <OpenclawConfigPanel
                api={openclawConfig}
                defaultConfigJson={defaultOpenclawConfigJson}
              />
            )}
          </div>

          {/* Resize Handle */}
          <div 
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-50 group"
            onMouseDown={startResizing}
          >
            <div className={`w-[1px] h-full ml-auto transition-colors ${isResizing ? 'bg-zinc-400' : 'bg-zinc-200/50 group-hover:bg-zinc-300'}`} />
          </div>
        </div>
        <RightPanel
          tabs={rightTabs}
          taskId={activeRecord.id}
          weNode={weNode}
          virtualPreviewServers={virtualPreviewServers}
          activeTabIndex={rightPanelTab}
          previewRefreshVersion={previewRefreshVersion}
          onTabChange={setRightPanelTab}
          onPreviewRefresh={triggerPreviewRefresh}
          terminalContent={
            <WeNodeTerminalPanel
              className="w-full h-full"
              fillHeight
              onOpenclawServerReady={(url) => setApiUrl(url)}
              onWeNodeReady={onWeNodeReady}
              onExtraVirtualPortReady={onExtraVirtualPortReady}
            />
          }
        />
      </div>
    </div>
  );
}

