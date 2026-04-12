import { OPENCLAW_API_SERVE_PORT } from "./syncChatToOpenclawWorkspace";

const GUARD_KEY = "__weclawOpenclawServeKillGuard";

type ProcessRow = {
  pid: number;
  command?: string;
  args?: string[];
  state?: string;
};

function looksLikeBundledOpenclawServe(row: ProcessRow, apiPort: number): boolean {
  const cmd = String(row.command ?? "");
  const args = Array.isArray(row.args) ? row.args.map((a) => String(a)) : [];
  const isOpenclawEntry =
    cmd.includes("openclaw/dist/index.js") || cmd.includes("openclaw\\dist\\index.js");
  if (!isOpenclawEntry) return false;
  const hasServe = args.some((a) => a === "serve");
  const hasPort = args.some((a) => a === String(apiPort));
  return hasServe && hasPort;
}

/**
 * 防止 agent / 用户在 weNode 里 exec `kill`、`pkill` 等时误杀承载 openclaw serve 的 worker。
 * 通过包装 processManager.kill，拒绝对受保护 PID 发送信号（teardown 仍直接 handle.kill，不受影响）。
 */
export function installOpenclawServeKillGuard(
  weNode: any,
  apiPort: number = OPENCLAW_API_SERVE_PORT
): void {
  const pm = weNode?.processManager;
  if (!pm || typeof pm.kill !== "function" || pm[GUARD_KEY]) {
    return;
  }

  const protectedPids = new Set<number>();

  const addPid = (pid: unknown) => {
    const n = typeof pid === "number" ? pid : Number(pid);
    if (Number.isFinite(n) && n > 0) protectedPids.add(n);
  };

  const scanList = () => {
    try {
      const list = pm.listProcesses?.() as ProcessRow[] | undefined;
      if (!Array.isArray(list)) return;
      for (const row of list) {
        if (!row || row.state === "exited") continue;
        if (looksLikeBundledOpenclawServe(row, apiPort)) {
          addPid(row.pid);
        }
      }
    } catch {
      // ignore
    }
  };

  const origKill = pm.kill.bind(pm);
  pm.kill = function patchedKill(pid: number, signal?: string) {
    if (protectedPids.has(pid)) {
      return false;
    }
    return origKill(pid, signal);
  };

  pm.on?.("server-listen", (listenPid: number, port: number) => {
    if (port === apiPort) {
      addPid(listenPid);
    }
  });

  pm[GUARD_KEY] = { protectedPids, scanList };
  scanList();
}

/** serve 启动后再扫一次进程表，弥补 listen 事件前后的空窗 */
export function rescanOpenclawServeKillGuard(weNode: any): void {
  const pm = weNode?.processManager;
  pm?.[GUARD_KEY]?.scanList?.();
}
