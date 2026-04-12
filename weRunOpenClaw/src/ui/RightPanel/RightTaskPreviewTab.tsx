import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import type { VirtualPreviewServer } from "./types";

const PREVIEW_HEIGHT_STORAGE_KEY = "weclaw.preview.tabHeightPx";
const PREVIEW_HEIGHT_MIN = 200;
const PREVIEW_HEIGHT_MAX = Math.min(1200, typeof window !== "undefined" ? window.innerHeight - 80 : 900);
const PREVIEW_HEIGHT_DEFAULT = 360;

function readStoredPreviewHeight(): number {
  try {
    const raw = window.localStorage.getItem(PREVIEW_HEIGHT_STORAGE_KEY);
    const n = raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(n)) return PREVIEW_HEIGHT_DEFAULT;
    return Math.min(PREVIEW_HEIGHT_MAX, Math.max(PREVIEW_HEIGHT_MIN, Math.round(n)));
  } catch {
    return PREVIEW_HEIGHT_DEFAULT;
  }
}

export function RightTaskPreviewTab({
  servers,
  refreshVersion = 0,
  onRefresh,
}: {
  servers: VirtualPreviewServer[];
  refreshVersion?: number;
  onRefresh?: () => void;
}) {
  const { t } = useLocale();
  const [idx, setIdx] = useState(0);
  const [previewHeightPx, setPreviewHeightPx] = useState(PREVIEW_HEIGHT_DEFAULT);
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    setPreviewHeightPx(readStoredPreviewHeight());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREVIEW_HEIGHT_STORAGE_KEY, String(previewHeightPx));
    } catch {
      // ignore
    }
  }, [previewHeightPx]);

  useEffect(() => {
    setIdx((i) => {
      if (servers.length === 0) return 0;
      if (i >= servers.length) return servers.length - 1;
      return i;
    });
  }, [servers]);

  const endResize = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = e.clientY - drag.startY;
      const next = Math.min(
        PREVIEW_HEIGHT_MAX,
        Math.max(PREVIEW_HEIGHT_MIN, drag.startH + delta)
      );
      setPreviewHeightPx(next);
    };
    const onUp = () => endResize();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [endResize]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const current = servers[idx];

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startH: previewHeightPx };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  if (servers.length === 0) {
    return (
      <div className="flex-1 px-4 pb-4">
        <p className="text-xs text-zinc-500 leading-relaxed">
          {t("previewEmptyHint1")}{" "}
          <code className="text-zinc-600">npx serve dist -p 4173</code>
          {t("previewEmptyHint2")}
        </p>
        <p className="mt-2 text-xs text-zinc-400">{t("previewNoPorts")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 pb-4 gap-2">
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-xs text-zinc-500">{t("previewPortLabel")}</span>
        <select
          className="text-xs rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800 max-w-[240px]"
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
        >
          {servers.map((s, i) => (
            <option key={`${s.port}-${i}`} value={i}>
              :{s.port} — {s.url}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="text-xs rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onRefresh?.()}
          disabled={!current}
        >
          {t("refresh")}
        </button>
        <button
          type="button"
          className="text-xs rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setExpanded(true)}
          disabled={!current}
          title={t("previewExpandTitle")}
        >
          {t("previewExpand")}
        </button>
        <label className="flex items-center gap-1.5 text-xs text-zinc-500 ml-auto">
          <span className="whitespace-nowrap">{t("previewHeight")}</span>
          <input
            type="range"
            min={PREVIEW_HEIGHT_MIN}
            max={PREVIEW_HEIGHT_MAX}
            value={previewHeightPx}
            onChange={(e) => setPreviewHeightPx(Number(e.target.value))}
            className="w-[72px] max-w-[28vw] accent-zinc-700"
            aria-label={t("previewHeightAria")}
          />
        </label>
      </div>

      {current ? (
        <>
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label={t("previewResizeAria")}
            onPointerDown={startResize}
            className="h-2 shrink-0 -mx-1 rounded-md cursor-ns-resize flex items-center justify-center group touch-none"
          >
            <span className="h-1 w-10 rounded-full bg-zinc-200 group-hover:bg-zinc-400 transition-colors" />
          </div>
          <div
            className="shrink-0 flex flex-col rounded-xl border border-zinc-200 bg-white overflow-hidden"
            style={{ height: previewHeightPx, minHeight: PREVIEW_HEIGHT_MIN }}
          >
            <iframe
              key={`${current.port}:${refreshVersion}`}
              title={`preview-${current.port}`}
              className="w-full flex-1 min-h-0 border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              src={current.url}
            />
          </div>
        </>
      ) : null}

      {expanded && current ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t("previewDialogAria")}
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/55 backdrop-blur-[2px] border-0 cursor-default"
            aria-label={t("previewCloseBackdropAria")}
            onClick={() => setExpanded(false)}
          />
          <div className="relative flex flex-col w-full max-w-[min(1200px,96vw)] h-[min(88vh,900px)] max-h-[92vh] rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-zinc-100 bg-zinc-50/80">
              <span className="text-xs font-semibold text-zinc-800 truncate flex-1">
                {t("previewPortTitle")}
                {current.port}
              </span>
              <button
                type="button"
                className="text-xs rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-100"
                onClick={() => onRefresh?.()}
              >
                {t("refresh")}
              </button>
              <button
                type="button"
                className="text-xs rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-100 font-semibold"
                onClick={() => setExpanded(false)}
              >
                {t("close")}
              </button>
            </div>
            <iframe
              key={`modal-${current.port}:${refreshVersion}`}
              title={`preview-expanded-${current.port}`}
              className="flex-1 min-h-0 w-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              src={current.url}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
