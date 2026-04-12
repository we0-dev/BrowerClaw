import { useCallback, useEffect, useState } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import { vfsListDir, type VfsEntry } from "../../lib/weNodeVfs";
import { openclawTaskWorkspaceVfsPath } from "../../lib/syncChatToOpenclawWorkspace";
import { Markdown } from "../Markdown/Markdown";

export function RightTaskFolderTab({
  taskId,
  weNode,
}: {
  taskId: string;
  weNode: unknown | null;
}) {
  const { t } = useLocale();
  const [relParts, setRelParts] = useState<string[]>([]);
  const [entries, setEntries] = useState<VfsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string } | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);

  const root = openclawTaskWorkspaceVfsPath(taskId);
  const currentDir =
    relParts.length === 0 ? root : `${root}/${relParts.join("/")}`;
  const isMarkdown = selectedFile ? /\.(md|markdown)$/i.test(selectedFile.name) : false;

  const refresh = useCallback(async () => {
    if (!weNode) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const list = await vfsListDir(weNode, currentDir);
      setEntries(list);
    } finally {
      setLoading(false);
    }
  }, [weNode, currentDir]);

  useEffect(() => {
    setRelParts([]);
    setSelectedFile(null);
    setFileText(null);
  }, [taskId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openDir = (name: string) => {
    setRelParts((p) => [...p, name]);
    setSelectedFile(null);
    setFileText(null);
  };

  const goCrumb = (idx: number) => {
    setRelParts((p) => p.slice(0, idx));
    setSelectedFile(null);
    setFileText(null);
  };

  const openFile = async (e: VfsEntry) => {
    if (!weNode || e.kind !== "file") return;
    setSelectedFile({ path: e.path, name: e.name });
    const fs = (weNode as { fs?: { readFile?: (p: string, enc?: string) => Promise<unknown> } }).fs;
    if (!fs?.readFile) {
      setFileText(t("fsReadFileUnsupported"));
      return;
    }
    try {
      const buf = await fs.readFile(e.path, "utf8");
      setFileText(typeof buf === "string" ? buf : new TextDecoder().decode(buf as Uint8Array));
    } catch (err) {
      setFileText(String(err));
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 pt-3 pb-4 gap-3 bg-white">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="text-[11px] text-zinc-400 flex items-center overflow-hidden font-medium" title={currentDir}>
          <button
            type="button"
            className="text-zinc-900 hover:underline transition-colors shrink-0 font-bold"
            onClick={() => goCrumb(0)}
          >
            Root
          </button>
          <div className="flex items-center overflow-x-auto scrollbar-none whitespace-nowrap">
            {relParts.map((seg, i) => (
              <span key={`${seg}-${i}`} className="flex items-center">
                <span className="text-zinc-300 mx-1">/</span>
                <button
                  type="button"
                  className="hover:text-zinc-900 hover:underline transition-colors"
                  onClick={() => goCrumb(i + 1)}
                >
                  {seg}
                </button>
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="text-[11px] px-2 py-1 rounded border border-zinc-200 text-zinc-600 font-medium hover:bg-zinc-50 transition-colors active:scale-95 shrink-0"
          onClick={() => void refresh()}
        >
          {t("refresh")}
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="min-h-[120px] max-h-[45%] overflow-y-auto rounded-lg divide-y divide-zinc-100 bg-zinc-100/50">
          {!weNode ? (
            <p className="p-4 text-[12px] text-zinc-400 text-center">{t("waitWeNode")}</p>
          ) : loading ? (
            <p className="p-4 text-[12px] text-zinc-400 text-center">{t("folderReading")}</p>
          ) : entries.length === 0 ? (
            <p className="p-4 text-[12px] text-zinc-400 text-center">{t("emptyDir")}</p>
          ) : (
            entries.map((e) => (
              <button
                key={e.path}
                type="button"
                className="w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 hover:bg-white transition-all group"
                onClick={() => (e.kind === "dir" ? openDir(e.name) : void openFile(e))}
              >
                <div className={`w-3.5 h-3.5 flex items-center justify-center rounded ${e.kind === 'dir' ? 'text-zinc-900' : 'text-zinc-400'}`}>
                  {e.kind === 'dir' ? (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )}
                </div>
                <span className="text-zinc-700 group-hover:text-zinc-900 font-medium truncate">{e.name}</span>
              </button>
            ))
          )}
        </div>
        {selectedFile ? (
          <div className="min-h-0 flex-1 flex flex-col rounded-lg bg-zinc-50/30 overflow-hidden shadow-sm">
            <div className="shrink-0 px-3 py-1.5 text-[11px] font-bold text-zinc-900 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <span className="truncate">{selectedFile.name}</span>
            </div>
            {isMarkdown ? (
              <div className="flex-1 min-h-0 overflow-auto p-4 bg-zinc-50/5">
                <Markdown markdown={fileText ?? ""} className="text-[13px]" />
              </div>
            ) : (
              <pre className="flex-1 min-h-0 overflow-auto p-4 text-[12px] font-mono text-zinc-800 whitespace-pre-wrap break-all leading-relaxed bg-zinc-50/5">
                {fileText ?? t("reading")}
              </pre>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-[12px] border border-dashed border-zinc-200 rounded-lg bg-zinc-50/5">
            {t("clickToPreviewFile")}
          </div>
        )}
      </div>
    </div>
  );
}
