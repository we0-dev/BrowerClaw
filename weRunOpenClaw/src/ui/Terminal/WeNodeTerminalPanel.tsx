import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useLocale } from "../../i18n/LocaleContext";
import { bootstrapWeNodeRuntime, reinstallOpenclawInWeNode } from "./weNodeBootstrap";

type BootState = "idle" | "booting" | "ready" | "error";
type TerminalTab = "init" | "free";

export function WeNodeTerminalPanel({
  className = "",
  defaultOpen = true,
  heightPx = 260,
  fillHeight = false,
  onOpenclawServerReady,
  onWeNodeReady,
  onExtraVirtualPortReady,
}: {
  className?: string;
  defaultOpen?: boolean;
  heightPx?: number;
  fillHeight?: boolean;
  onOpenclawServerReady?: (url: string) => void;
  onWeNodeReady?: (weNode: any) => void;
  onExtraVirtualPortReady?: (port: number, url: string) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const [bootState, setBootState] = useState<BootState>("idle");
  const [bootDetail, setBootDetail] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");
  const [initLogText, setInitLogText] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TerminalTab>("init");
  const [reinstalling, setReinstalling] = useState(false);
  const weNodeRef = useRef<any>(null);

  const initHostRef = useRef<HTMLDivElement | null>(null);
  const freeHostRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const initXtermRef = useRef<XTerm | null>(null);
  const initFitRef = useRef<FitAddon | null>(null);
  const initLogBufferRef = useRef<string>("");
  const initOpenedOnceRef = useRef(false);
  const initTermReadyRef = useRef(false);
  const mirrorBufferRef = useRef<string>("");

  const onOpenclawServerReadyRef = useRef(onOpenclawServerReady);
  const onWeNodeReadyRef = useRef(onWeNodeReady);
  const onExtraVirtualPortReadyRef = useRef(onExtraVirtualPortReady);

  useEffect(() => {
    onOpenclawServerReadyRef.current = onOpenclawServerReady;
  }, [onOpenclawServerReady]);
  useEffect(() => {
    onWeNodeReadyRef.current = onWeNodeReady;
  }, [onWeNodeReady]);
  useEffect(() => {
    onExtraVirtualPortReadyRef.current = onExtraVirtualPortReady;
  }, [onExtraVirtualPortReady]);

  const safeFit = (addon: FitAddon | null, term: XTerm | null) => {
    if (!addon || !term) return;
    try {
      const el = (term as any).element as HTMLElement | undefined;
      if (el && el.offsetHeight > 0) addon.fit();
    } catch {
      // ignore
    }
  };

  const scrollToBottom = (term: XTerm | null) => {
    if (!term) return;
    try {
      term.scrollToBottom();
    } catch {
      // ignore
    }
  };

  const writeInitLog = (s: string) => {
    const next = initLogBufferRef.current + s;
    initLogBufferRef.current = next;
    // Keep mirror lightweight: hide verbose npm/stdout/stderr chunks.
    const hideInMirror =
      s.includes("[stdout buffered]") ||
      s.includes("[stderr buffered]") ||
      /^\[spawn\]\s+npm install/i.test(s.trim()) ||
      /^\[spawn\]\s+npm install .* exit=/i.test(s.trim()) ||
      /^(added|audited|up to date in|found \d+ vulnerabilities)/im.test(s);
    if (!hideInMirror) {
      mirrorBufferRef.current += s;
      if (mirrorBufferRef.current.length > 12000) {
        mirrorBufferRef.current = mirrorBufferRef.current.slice(-12000);
      }
      setInitLogText(mirrorBufferRef.current);
    }
    const term = initXtermRef.current;
    if (!term || !initTermReadyRef.current) return;
    term.write(s.replace(/\n/g, "\r\n"), () => {
      requestAnimationFrame(() => scrollToBottom(term));
    });
  };

  const flushInitLogBufferToXterm = () => {
    const term = initXtermRef.current;
    if (!term || !initTermReadyRef.current) return;
    const buf = initLogBufferRef.current;
    try {
      term.clear();
      if (buf) term.write(buf.replace(/\n/g, "\r\n"));
      scrollToBottom(term);
    } catch {
      // ignore
    }
  };

  const waitForInitTerminalReady = async () => {
    const start = Date.now();
    while (!initTermReadyRef.current && Date.now() - start < 3000) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 16));
    }
  };

  useEffect(() => {
    if (initXtermRef.current) return;
    const iTerm = new XTerm({
      disableStdin: true,
      convertEol: false,
      scrollback: 50000,
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 12,
      theme: {
        background: "#ffffff",
        foreground: "#18181b",
        selectionBackground: "rgba(24, 24, 27, 0.18)",
      } as any,
    } as any);
    const iFit = new FitAddon();
    iTerm.loadAddon(iFit);
    initXtermRef.current = iTerm;
    initFitRef.current = iFit;
  }, []);

  useEffect(() => {
    if (!open) return;
    if (activeTab !== "init") return;
    const term = initXtermRef.current;
    const host = initHostRef.current;
    if (!term || !host) return;

    try {
      if (!initOpenedOnceRef.current) {
        term.open(host);
        initOpenedOnceRef.current = true;
        initTermReadyRef.current = true;
      }
      flushInitLogBufferToXterm();
      safeFit(initFitRef.current, initXtermRef.current);
      scrollToBottom(initXtermRef.current);
    } catch {
      // ignore
    }
  }, [open, activeTab]);

  useEffect(() => {
    let disposed = false;
    (async () => {
      setBootState("booting");
      try {
        await waitForInitTerminalReady();
        writeInitLog("== init terminal ready ==\n");

        const weNode = await bootstrapWeNodeRuntime({
          log: writeInitLog,
          setBootDetail,
          onOpenclawServerReady: (url) =>
            onOpenclawServerReadyRef.current?.(url),
          onExtraVirtualPortReady: (port, url) =>
            onExtraVirtualPortReadyRef.current?.(port, url),
        });
        if (disposed) return;

        weNodeRef.current = weNode;
        onWeNodeReadyRef.current?.(weNode);

        const fTerm = weNode.createTerminal({ Terminal: XTerm });
        if (freeHostRef.current) fTerm.attach(freeHostRef.current);
        const xterm = (fTerm as any).xterm ?? (fTerm as any).term;
        if (xterm) {
          xtermRef.current = xterm;
          const fFit = new FitAddon();
          xterm.loadAddon(fFit);
          fitRef.current = fFit;
        }
        fTerm.showPrompt();
        fTerm.input("cd /workspace/weNode && ls\n");

        setBootState("ready");
        writeInitLog("== boot complete ==\n");
      } catch (e: any) {
        if (disposed) return;
        setErrorText(e?.message || String(e));
        setBootState("error");
        writeInitLog(`\n== error ==\n${e?.message || String(e)}\n`);
      }
    })();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!open || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(() => {
      safeFit(initFitRef.current, initXtermRef.current);
      safeFit(fitRef.current, xtermRef.current);
    });
    if (initHostRef.current) obs.observe(initHostRef.current);
    if (freeHostRef.current) obs.observe(freeHostRef.current);
    return () => obs.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (activeTab === "init") {
        safeFit(initFitRef.current, initXtermRef.current);
        scrollToBottom(initXtermRef.current);
      } else {
        safeFit(fitRef.current, xtermRef.current);
        scrollToBottom(xtermRef.current);
        try {
          (xtermRef.current as any)?.textarea?.focus();
        } catch {
          // ignore
        }
      }
    }, 350);
    return () => clearTimeout(t);
  }, [open, activeTab, heightPx]);

  useEffect(() => {
    if (!open) return;
    if (activeTab !== "init") return;
    if (!initTermReadyRef.current) return;
    const t = window.setTimeout(() => {
      flushInitLogBufferToXterm();
      safeFit(initFitRef.current, initXtermRef.current);
      scrollToBottom(initXtermRef.current);
    }, 0);
    return () => window.clearTimeout(t);
  }, [initLogText, open, activeTab]);

  const containerStyle = fillHeight
    ? { height: open ? "100%" : 0 }
    : { height: open ? heightPx : 0 };

  return (
    <>
      {bootState !== "ready" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 we-terminal-loading backdrop-blur-[2px]" />
          <div className="relative w-[min(720px,88vw)] max-h-[85vh] overflow-hidden rounded-[2.5rem] bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-zinc-200/50 transition-all duration-500">
            <div className="max-h-[85vh] overflow-y-auto px-8 py-8 sm:px-12 sm:py-10">
              <div className="flex flex-col items-center gap-6 text-center">
              <div className="relative">
                <div className="we-terminal-spinner" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl">🦞</span>
                </div>
              </div>
              <div className="w-full">
                <div className="text-xl font-bold text-zinc-900 tracking-tight">
                  {bootState === "error" ? t("terminalBootErrorTitle") : t("terminalBootingTitle")}
                </div>
                <div className="mx-auto mt-2 max-w-[320px] text-[14px] leading-relaxed font-medium text-zinc-500">
                  {bootState === "error"
                    ? errorText || t("terminalBootErrorBody")
                    : bootDetail === "Installing dependencies (npm install)..."
                    ? t("terminalBootDepsBody")
                    : t("terminalBootInitBody")}
                </div>
                {bootState === "error" && errorText ? (
                  <div className="mx-auto mt-4 max-h-[22vh] max-w-[520px] overflow-y-auto rounded-xl border border-red-100 bg-red-50 p-3 text-left font-mono text-[11px] leading-relaxed text-red-600 break-all">
                    {errorText}
                  </div>
                ) : null}
                <div className="mx-auto mt-4 w-full max-w-[520px] text-left">
                  <div className="text-[10px] text-zinc-400 mb-1 font-semibold">
                    {t("terminalLogMirror")}
                  </div>
                  <pre className="max-h-[180px] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-[10px] leading-[1.4] text-zinc-700 font-mono whitespace-pre-wrap break-words">
                    {initLogText || t("terminalLogWaiting")}
                  </pre>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      <section
        className={`rounded-2xl ring-1 ring-zinc-200 bg-white overflow-hidden ${
          fillHeight ? "h-full min-h-0 flex flex-col" : ""
        } ${className}`}
      >
        <button
          type="button"
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
          onClick={() => setOpen(!open)}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-tight text-zinc-900">
              {t("chatHeaderWeNode")}
            </span>
            <span
              className={`text-[10px] uppercase font-bold ${
                bootState === "ready" ? "text-emerald-600" : "text-zinc-400"
              }`}
            >
              {bootState === "ready" ? "● Connected" : "● Booting"}
            </span>
          </div>
          <span
            className={`text-zinc-400 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </button>

        <div className="px-4 py-2 border-t border-zinc-100 flex items-center gap-1 bg-zinc-50/50">
          <button
            onClick={() => setActiveTab("init")}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === "init"
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t("terminalTabInit")}
          </button>
          <button
            onClick={() => setActiveTab("free")}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === "free"
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t("terminalTabFree")}
          </button>
          <div className="flex-1" />
          <button
            onClick={async () => {
              const wn = weNodeRef.current;
              if (!wn || reinstalling) return;
              setReinstalling(true);
              setActiveTab("init");
              try {
                await reinstallOpenclawInWeNode(wn, {
                  log: writeInitLog,
                  setBootDetail,
                });
              } finally {
                setReinstalling(false);
              }
            }}
            disabled={bootState !== "ready" || reinstalling}
            className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title={t("terminalReinstallTitle")}
          >
            {reinstalling ? t("terminalReinstalling") : t("terminalReinstall")}
          </button>
        </div>

        <div
          className={`relative overflow-hidden transition-[height] duration-300 ease-out border-t border-zinc-100 ${
            fillHeight ? "flex-1 min-h-0" : ""
          }`}
          style={containerStyle}
        >
          <div
            ref={initHostRef}
            className="we-terminal-host"
            style={{
              position: "absolute",
              inset: 0,
              visibility: activeTab === "init" ? "visible" : "hidden",
              zIndex: activeTab === "init" ? 1 : 0,
            }}
          />
          <div
            ref={freeHostRef}
            className="we-terminal-host"
            style={{
              position: "absolute",
              inset: 0,
              visibility: activeTab === "free" ? "visible" : "hidden",
              zIndex: activeTab === "free" ? 1 : 0,
            }}
          />
        </div>
      </section>
    </>
  );
}
