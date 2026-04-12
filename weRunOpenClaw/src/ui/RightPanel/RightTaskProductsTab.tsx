import { useCallback, useEffect, useState } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import { openclawTaskWorkspaceVfsPath } from "../../lib/syncChatToOpenclawWorkspace";
import { vfsCollectTaskArtifacts, vfsReadText } from "../../lib/weNodeVfs";
import { Markdown } from "../Markdown/Markdown";

export function RightTaskProductsTab({
  taskId,
  weNode,
}: {
  taskId: string;
  weNode: unknown | null;
}) {
  const { t } = useLocale();
  const [artifacts, setArtifacts] = useState<{ relPath: string; path: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<{ relPath: string; path: string } | null>(null);
  const [body, setBody] = useState<string | null>(null);

  const root = openclawTaskWorkspaceVfsPath(taskId);

  const refresh = useCallback(async () => {
    if (!weNode) {
      setArtifacts([]);
      return;
    }
    setLoading(true);
    try {
      const list = await vfsCollectTaskArtifacts(weNode, root);
      setArtifacts(list);
    } finally {
      setLoading(false);
    }
  }, [weNode, root]);

  useEffect(() => {
    setActive(null);
    setBody(null);
  }, [taskId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!active || !weNode) {
      setBody(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const t = await vfsReadText(weNode, active.path);
      if (!cancelled) setBody(t);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, weNode]);

  const isHtml = active && /\.html?$/i.test(active.relPath);
  const isMarkdown = active && /\.(md|markdown)$/i.test(active.relPath);

  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 pt-3 pb-4 gap-3 bg-white">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-[11px] text-zinc-400 font-medium tracking-tight">
          {t("productsScanLead")}{" "}
          <code className="text-zinc-600 bg-zinc-100 px-1 rounded">dist/</code>
          {t("productsScanMid")}
          <code className="text-zinc-600 bg-zinc-100 px-1 rounded">output/</code>
          {t("productsScanTail")}
        </p>
        <button
          type="button"
          className="text-[11px] px-2 py-1 rounded border border-zinc-200 text-zinc-600 font-medium hover:bg-zinc-50 transition-colors active:scale-95"
          onClick={() => void refresh()}
        >
          {t("refresh")}
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="min-h-[100px] max-h-[35%] overflow-y-auto rounded-lg divide-y divide-zinc-100 bg-zinc-100/50">
          {!weNode ? (
            <p className="p-4 text-[12px] text-zinc-400 text-center">{t("waitWeNode")}</p>
          ) : loading ? (
            <p className="p-4 text-[12px] text-zinc-400 text-center">{t("scanning")}</p>
          ) : artifacts.length === 0 ? (
            <p className="p-4 text-[12px] text-zinc-400 text-center">{t("noArtifacts")}</p>
          ) : (
            artifacts.map((a) => (
              <button
                key={a.path}
                type="button"
                className={[
                  "w-full text-left px-3 py-1.5 text-[12px] font-mono transition-colors flex items-center gap-2",
                  active?.path === a.path
                    ? "bg-white text-zinc-900 font-semibold"
                    : "text-zinc-500 hover:bg-white/50 hover:text-zinc-700",
                ].join(" ")}
                onClick={() => setActive(a)}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${active?.path === a.path ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                {a.relPath}
              </button>
            ))
          )}
        </div>
        <div className="min-h-0 flex-1 rounded-lg bg-zinc-50/30 overflow-hidden flex flex-col shadow-sm">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-[12px] bg-zinc-50/10">
              {t("pickFilePreview")}
            </div>
          ) : isHtml ? (
            <iframe
              title={active.relPath}
              className="flex-1 min-h-[200px] w-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin"
              srcDoc={body ?? ""}
            />
          ) : isMarkdown ? (
            <div className="flex-1 min-h-0 overflow-auto p-4 bg-zinc-50/5">
              <Markdown markdown={body ?? ""} className="text-[13px]" />
            </div>
          ) : (
            <pre className="flex-1 min-h-0 overflow-auto p-4 text-[12px] font-mono text-zinc-800 whitespace-pre-wrap leading-relaxed bg-zinc-50/5">
              {body ?? t("reading")}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
