import { OPENCLAW_WORKSPACE_SKILLS_VFS_ROOT } from "../../lib/openclawVfsPaths";
import { OPENCLAW_API_SERVE_PORT } from "../../lib/syncChatToOpenclawWorkspace";
import { loadVirtualOpenclawConfigPrefs } from "../../lib/opfsVirtualOpenclawConfigStore";
import {
  installOpenclawServeKillGuard,
  rescanOpenclawServeKillGuard,
} from "../../lib/weNodeProtectOpenclawServe";
// @ts-ignore
import { WeNode } from "../../../weNode/index.mjs";

type LogFn = (s: string) => void;

export type WeNodeBootstrapOptions = {
  log: LogFn;
  setBootDetail?: (s: string) => void;
  onOpenclawServerReady?: (url: string) => void;
  onExtraVirtualPortReady?: (port: number, url: string) => void;
};

function ensurePosixDirname(path: string) {
  const i = path.lastIndexOf("/");
  if (i <= 0) return "/";
  return path.slice(0, i);
}

function buildOpenclawRuntimePackageJson(raw: string) {
  const pkg = JSON.parse(raw);
  delete pkg.devDependencies;
  delete pkg.optionalDependencies;
  delete pkg.scripts;
  delete pkg.pnpm;
  delete pkg.overrides;
  delete pkg.vitest;
  delete pkg.packageManager;
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

export function getDefaultOpenclawConfigJson() {
  const baseUrl =
    (import.meta as any).env?.VITE_OPENCLAW_GEMINI_BASE_URL ??
    "";
  const apiKey =
    (import.meta as any).env?.VITE_OPENCLAW_GEMINI_API_KEY ??
    "xxxxxxxxxxxx";
  const lastTouchedAt =
    (import.meta as any).env?.VITE_OPENCLAW_LAST_TOUCHED_AT ??
    "2026-03-09T05:40:00.000Z";
  const lastTouchedVersion =
    (import.meta as any).env?.VITE_OPENCLAW_LAST_TOUCHED_VERSION ?? "2026.1.29";

  const cfg = {
    meta: {
      lastTouchedVersion,
      lastTouchedAt,
    },
    models: {
      providers: {
        gemini: {
          baseUrl,
          apiKey,
          api: "openai-completions",
          models: [
            {
              id: "weclaw",
              name: "weclaw",
              contextWindow: 1048576,
              maxTokens: 16384,
              reasoning: false,
              input: ["text"],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              api: "openai-completions",
            },
          ],
        },
      },
    },
    agents: {
      defaults: {
        model: { primary: "gemini/weclaw" },
        workspace: "/home/user/.openclaw/workspace",
        compaction: { mode: "safeguard" },
        maxConcurrent: 4,
        subagents: { maxConcurrent: 8 },
      },
    },
    messages: { ackReactionScope: "group-mentions" },
    commands: { native: "auto", nativeSkills: "auto" },
  };

  return `${JSON.stringify(cfg, null, 2)}\n`;
}

const OPENCLAW_DIST_RAW: Record<string, string> = import.meta.glob(
  "../../../../openclaw/dist/**/*",
  { as: "raw", eager: true }
);
const OPENCLAW_ROOT_RAW: Record<string, string> = import.meta.glob(
  "../../../../openclaw/{package.json,openclaw.mjs}",
  { as: "raw", eager: true }
);
const OPENCLAW_DOCS_TEMPLATES_RAW: Record<string, string> = import.meta.glob(
  "../../../../openclaw/docs/reference/templates/**/*",
  { as: "raw", eager: true }
);
const OPENCLAW_SKILLS_TEXT_RAW: Record<string, string> = import.meta.glob(
  "../../../../openclaw/skills/**/*.{md,txt,sh,py,js,mjs,cjs,ts,tsx,json,yaml,yml,toml}",
  { as: "raw", eager: true }
);
const OPENCLAW_CONFIG_PATH = "/home/user/.openclaw/openclaw.json";

async function seedWeNodeFiles(weNode: any) {
  const filesToSeed: Array<{ url: string; path: string }> = [
    { url: "/weNode/weNode-usage.md", path: "/workspace/weNode/weNode-usage.md" },
    { url: "/weNode/index.mjs", path: "/workspace/weNode/index.mjs" },
    { url: "/weNode/index.cjs", path: "/workspace/weNode/index.cjs" },
  ];
  await weNode.fs.mkdir("/workspace/weNode", { recursive: true });
  await Promise.all(
    filesToSeed.map(async (f) => {
      try {
        const res = await fetch(f.url);
        if (!res.ok) return;
        const text = await res.text();
        await weNode.fs.writeFile(f.path, text);
      } catch {
        // ignore
      }
    })
  );
}

async function seedOpenclawConfigToWeNode(weNode: any) {
  const dir = ensurePosixDirname(OPENCLAW_CONFIG_PATH);
  await weNode.fs.mkdir(dir, { recursive: true });
  const preferred = await loadVirtualOpenclawConfigPrefs().catch(() => null);
  const preferredText = preferred?.openclawConfigJson?.trim() ?? "";
  if (preferredText) {
    try {
      const parsed = JSON.parse(preferredText);
      await weNode.fs.writeFile(OPENCLAW_CONFIG_PATH, `${JSON.stringify(parsed, null, 2)}\n`);
      return;
    } catch {
      // 用户配置不合法时自动回退到默认配置，避免阻塞启动
    }
  }
  await weNode.fs.writeFile(OPENCLAW_CONFIG_PATH, getDefaultOpenclawConfigJson());
}

async function opfsRemoveDir(segments: string[]): Promise<void> {
  try {
    if (!navigator.storage?.getDirectory) return;
    let dir = await navigator.storage.getDirectory();
    for (let i = 0; i < segments.length - 1; i++) {
      dir = await dir.getDirectoryHandle(segments[i], { create: false });
    }
    await dir.removeEntry(segments[segments.length - 1], { recursive: true });
  } catch {
    // 目录不存在时忽略
  }
}

/** WeNode 虚拟路径 /x/y/z 对应 OPFS weNode/fs/x/y/z */
function vfsToOpfsSegments(vfsPath: string): string[] {
  const parts = vfsPath.replace(/^\//, "").split("/").filter(Boolean);
  return ["weNode", "fs", ...parts];
}

async function purgeOpenclawBundledDirsFromOpfs(): Promise<void> {
  await Promise.all([
    opfsRemoveDir(vfsToOpfsSegments("/workspace/openclaw/dist")),
  ]);
}

async function seedOpenclawRootToWeNode(weNode: any) {
  const entries = Object.entries(OPENCLAW_ROOT_RAW);
  if (entries.length === 0) return;
  await weNode.fs.mkdir("/workspace/openclaw", { recursive: true });
  await Promise.all(
    entries.map(async ([sourcePath, raw]) => {
      const marker = "/openclaw/";
      const idx = sourcePath.lastIndexOf(marker);
      if (idx < 0) return;
      const rel = sourcePath.slice(idx + marker.length);
      if (!rel) return;
      const targetPath = `/workspace/openclaw/${rel}`;
      const dir = ensurePosixDirname(targetPath);
      await weNode.fs.mkdir(dir, { recursive: true });
      if (rel === "package.json") {
        await weNode.fs.writeFile(targetPath, buildOpenclawRuntimePackageJson(raw));
      } else {
        await weNode.fs.writeFile(targetPath, raw);
      }
    })
  );
}

async function seedOpenclawDistToWeNode(weNode: any) {
  const entries = Object.entries(OPENCLAW_DIST_RAW);
  if (entries.length === 0) return;
  await weNode.fs.mkdir("/workspace/openclaw/dist", { recursive: true });
  await Promise.all(
    entries.map(async ([sourcePath, raw]) => {
      const marker = "/openclaw/dist/";
      const idx = sourcePath.lastIndexOf(marker);
      if (idx < 0) return;
      const rel = sourcePath.slice(idx + marker.length);
      if (!rel) return;
      const targetPath = `/workspace/openclaw/dist/${rel}`;
      const dir = ensurePosixDirname(targetPath);
      await weNode.fs.mkdir(dir, { recursive: true });
      await weNode.fs.writeFile(targetPath, raw);
    })
  );
}

async function seedOpenclawDocsTemplatesToWeNode(weNode: any) {
  const entries = Object.entries(OPENCLAW_DOCS_TEMPLATES_RAW);
  if (entries.length === 0) return;
  await weNode.fs.mkdir("/workspace/openclaw/docs/reference/templates", {
    recursive: true,
  });
  await Promise.all(
    entries.map(async ([sourcePath, raw]) => {
      const marker = "/openclaw/docs/reference/templates/";
      const idx = sourcePath.lastIndexOf(marker);
      if (idx < 0) return;
      const rel = sourcePath.slice(idx + marker.length);
      if (!rel) return;
      const targetPath = `/workspace/openclaw/docs/reference/templates/${rel}`;
      const dir = ensurePosixDirname(targetPath);
      await weNode.fs.mkdir(dir, { recursive: true });
      await weNode.fs.writeFile(targetPath, raw);
    })
  );
}

async function seedOpenclawSkillsToWeNode(weNode: any) {
  const entries = Object.entries(OPENCLAW_SKILLS_TEXT_RAW);
  if (entries.length === 0) return;
  await weNode.fs.mkdir("/workspace/openclaw/skills", { recursive: true });
  await weNode.fs.mkdir(OPENCLAW_WORKSPACE_SKILLS_VFS_ROOT, { recursive: true });
  await Promise.all(
    entries.map(async ([sourcePath, raw]) => {
      const marker = "/openclaw/skills/";
      const idx = sourcePath.lastIndexOf(marker);
      if (idx < 0) return;
      const rel = sourcePath.slice(idx + marker.length);
      if (!rel) return;
      const targetPath = `/workspace/openclaw/skills/${rel}`;
      const dir = ensurePosixDirname(targetPath);
      await weNode.fs.mkdir(dir, { recursive: true });
      await weNode.fs.writeFile(targetPath, raw);
      const wsPath = `${OPENCLAW_WORKSPACE_SKILLS_VFS_ROOT}/${rel}`;
      const wsDir = ensurePosixDirname(wsPath);
      await weNode.fs.mkdir(wsDir, { recursive: true });
      await weNode.fs.writeFile(wsPath, raw);
    })
  );
}

async function npmInstallOpenclawInWeNode(weNode: any, log?: LogFn) {
  log?.("[spawn] npm install (openclaw)\n");
  const proc = await weNode.spawn(
    "npm",
    [
      "install",
      "--omit=dev",
      "--no-audit",
      "--no-fund",
      "--no-optional",
      "--ignore-scripts",
      "--no-package-lock",
    ],
    {
      cwd: "/workspace/openclaw",
      env: {
        npm_config_progress: "false",
        npm_config_loglevel: "warn",
        npm_config_optional: "false",
      },
    }
  );
  let out = "";
  let err = "";
  proc.on("output", (d: string) => {
    out += d;
    log?.(d);
  });
  proc.on("error", (d: string) => {
    err += d;
    log?.(d);
  });
  const result = await proc.completion;
  const finalStdout = String(result?.stdout ?? out);
  const finalStderr = String(result?.stderr ?? err);
  if (!out.trim() && finalStdout.trim()) log?.(`\n[stdout buffered]\n${finalStdout}\n`);
  if (!err.trim() && finalStderr.trim()) log?.(`\n[stderr buffered]\n${finalStderr}\n`);
  log?.(`[spawn] npm install (openclaw) exit=${String(result?.exitCode ?? "unknown")}\n`);
  if (!result || typeof result.exitCode !== "number" || result.exitCode !== 0) {
    const stdoutTail = finalStdout.trim().slice(-4000);
    const stderrTail = finalStderr.trim().slice(-8000);
    throw new Error(
      `openclaw 依赖安装失败（exit=${String(result?.exitCode ?? "unknown")}）。${
        stderrTail || stdoutTail
          ? `\n\n[stderr]\n${stderrTail || "(empty)"}\n\n[stdout]\n${
              stdoutTail || "(empty)"
            }`
          : ""
      }`
    );
  }
}

async function npmInstallClipboardBinaryInWeNode(weNode: any, log?: LogFn) {
  const pkg = "@mariozechner/clipboard-linux-x64-musl";
  log?.(`[spawn] npm install ${pkg}\n`);
  const proc = await weNode.spawn(
    "npm",
    ["install", pkg, "--no-audit", "--no-fund", "--no-package-lock"],
    {
      cwd: "/workspace/openclaw",
      env: {
        npm_config_progress: "false",
        npm_config_loglevel: "warn",
      },
    }
  );
  let out = "";
  let err = "";
  proc.on("output", (d: string) => {
    out += d;
    log?.(d);
  });
  proc.on("error", (d: string) => {
    err += d;
    log?.(d);
  });
  const result = await proc.completion;
  const finalStdout = String(result?.stdout ?? out);
  const finalStderr = String(result?.stderr ?? err);
  if (!out.trim() && finalStdout.trim()) log?.(`\n[stdout buffered]\n${finalStdout}\n`);
  if (!err.trim() && finalStderr.trim()) log?.(`\n[stderr buffered]\n${finalStderr}\n`);
  log?.(`[spawn] npm install ${pkg} exit=${String(result?.exitCode ?? "unknown")}\n`);
  if (!result || typeof result.exitCode !== "number" || result.exitCode !== 0) {
    const stdoutTail = finalStdout.trim().slice(-4000);
    const stderrTail = finalStderr.trim().slice(-8000);
    throw new Error(
      `安装 ${pkg} 失败（exit=${String(result?.exitCode ?? "unknown")}）。${
        stderrTail || stdoutTail
          ? `\n\n[stderr]\n${stderrTail || "(empty)"}\n\n[stdout]\n${
              stdoutTail || "(empty)"
            }`
          : ""
      }`
    );
  }
}

let _openclawServeProc: any = null;

async function killOpenclawServe(): Promise<void> {
  const proc = _openclawServeProc;
  _openclawServeProc = null;
  try {
    proc?.kill?.();
  } catch {
    // ignore
  }
  // 等进程实际退出，给端口释放一点时间
  await new Promise<void>((r) => window.setTimeout(r, 600));
}

async function startOpenclawServeInWeNode(weNode: any, log?: LogFn) {
  const entry = "/workspace/openclaw/dist/index.js";
  log?.(`[spawn] node ${entry} serve --port 3187\n`);
  const proc = await weNode.spawn(
    `node ${entry}`,
    ["serve", "--port", "3187"],
    { cwd: "/workspace/openclaw", env: { PORT: "3187" } }
  );
  _openclawServeProc = proc;
  proc.on("output", (d: string) => log?.(d));
  proc.on("error", (d: string) => log?.(d));
  proc.completion.then((r: any) => {
    if (_openclawServeProc === proc) _openclawServeProc = null;
    if (!r || typeof r.exitCode !== "number") return;
    if (r.exitCode === 0) {
      log?.("[spawn] openclaw serve exited with code 0\n");
      return;
    }
    log?.(
      `\n[openclaw serve] exit=${String(r.exitCode)}\n[stderr]\n${
        String(r.stderr ?? "").trim() || "(empty)"
      }\n\n[stdout]\n${String(r.stdout ?? "").trim() || "(empty)"}\n`
    );
  });
}

export async function reinstallOpenclawInWeNode(
  weNode: any,
  options: WeNodeBootstrapOptions
): Promise<void> {
  const { log, setBootDetail } = options;
  log("\n== reinstall openclaw ==\n");

  log("$ kill openclaw serve\n");
  await killOpenclawServe();

  log("$ purge bundled dirs from OPFS\n");
  await purgeOpenclawBundledDirsFromOpfs();

  setBootDetail?.("Preparing openclaw runtime...");
  log("$ seed /workspace/openclaw/{package.json,openclaw.mjs}\n");
  await seedOpenclawRootToWeNode(weNode);
  log("$ seed /workspace/openclaw/dist/**/*\n");
  await seedOpenclawDistToWeNode(weNode);
  log("$ seed /workspace/openclaw/docs/reference/templates/**/*\n");
  await seedOpenclawDocsTemplatesToWeNode(weNode);
  log("$ seed /workspace/openclaw/skills/**/*\n");
  await seedOpenclawSkillsToWeNode(weNode);
  log("== openclaw files prepared ==\n");

  setBootDetail?.("Installing dependencies (npm install)...");
  log("\n$ cd /workspace/openclaw\n");
  await npmInstallOpenclawInWeNode(weNode, log);
  await npmInstallClipboardBinaryInWeNode(weNode, log);
  log("== dependencies installed ==\n");

  setBootDetail?.("Starting openclaw server...");
  log(`\n$ write config -> ${OPENCLAW_CONFIG_PATH}\n`);
  await seedOpenclawConfigToWeNode(weNode);
  log("$ node /workspace/openclaw/dist/index.js serve --port 3187\n");
  await startOpenclawServeInWeNode(weNode, log);
  rescanOpenclawServeKillGuard(weNode);
  log("== openclaw reinstalled ==\n");
}

export async function bootstrapWeNodeRuntime(
  options: WeNodeBootstrapOptions
): Promise<any> {
  const { log, setBootDetail, onOpenclawServerReady, onExtraVirtualPortReady } = options;
  log("== openclaw runtime boot ==\n");
  setBootDetail?.("Booting weNode runtime...");
  log("$ purge bundled dirs from OPFS\n");
  await purgeOpenclawBundledDirsFromOpfs();
  log("\n$ WeNode.boot --workdir /workspace --sw /__sw__.js\n");

  let bootTick = 0;
  const bootProgressTimer = window.setInterval(() => {
    bootTick += 1;
    log(`[boot] waiting for WeNode.boot() ... ${bootTick * 3}s\n`);
  }, 3000);
  const bootWarnTimer = window.setTimeout(() => {
    log("[boot] WeNode.boot() is taking longer than expected; check /__sw__.js and browser console.\n");
  }, 15000);

  const BOOT_TIMEOUT_MS = 45000;
  const bootWithTimeout = (swUrl?: string) => {
    const bootPromise = WeNode.boot({
      workdir: "/workspace",
      ...(swUrl ? { swUrl } : {}),
      env: { HOME: "/home/user", OPENCLAW_SKIP_GIT: "1" },
      onServerReady: (port: number, url: string) => {
        log(`[boot] virtual server ready: port=${port} url=${url}\n`);
        if (port === OPENCLAW_API_SERVE_PORT) onOpenclawServerReady?.(url);
        else onExtraVirtualPortReady?.(port, url);
      },
    });
    const bootTimeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(
          new Error(`WeNode.boot 超时（>${BOOT_TIMEOUT_MS / 1000}s, swUrl=${swUrl ?? "(none)"})`)
        );
      }, BOOT_TIMEOUT_MS);
    });
    return Promise.race([bootPromise, bootTimeoutPromise]);
  };

  let weNode: any;
  try {
    try {
      weNode = await bootWithTimeout("/__sw__.js");
    } catch (bootErr: any) {
      log(`[boot] primary boot failed: ${bootErr?.message || String(bootErr)}\n`);
      log("\n$ WeNode.boot --workdir /workspace (without service worker)\n");
      weNode = await bootWithTimeout();
    }
  } finally {
    window.clearInterval(bootProgressTimer);
    window.clearTimeout(bootWarnTimer);
  }

  log("\n== weNode runtime ready ==\n");
  installOpenclawServeKillGuard(weNode, OPENCLAW_API_SERVE_PORT);

  setBootDetail?.("Preparing openclaw runtime...");
  log("\n$ seed /workspace/weNode/*\n");
  await seedWeNodeFiles(weNode);
  log("$ seed /workspace/openclaw/{package.json,openclaw.mjs}\n");
  await seedOpenclawRootToWeNode(weNode);
  log("$ seed /workspace/openclaw/dist/**/*\n");
  await seedOpenclawDistToWeNode(weNode);
  log("$ seed /workspace/openclaw/docs/reference/templates/**/*\n");
  await seedOpenclawDocsTemplatesToWeNode(weNode);
  log("$ seed /workspace/openclaw/skills/**/*\n");
  await seedOpenclawSkillsToWeNode(weNode);
  log("== openclaw files prepared ==\n");

  setBootDetail?.("Installing dependencies (npm install)...");
  log("\n$ cd /workspace/openclaw\n");
  await npmInstallOpenclawInWeNode(weNode, log);
  await npmInstallClipboardBinaryInWeNode(weNode, log);
  log("== dependencies installed ==\n");

  setBootDetail?.("Starting openclaw server...");
  log(`\n$ write config -> ${OPENCLAW_CONFIG_PATH}\n`);
  await seedOpenclawConfigToWeNode(weNode);
  log("$ node /workspace/openclaw/dist/index.js serve --port 3187\n");
  await startOpenclawServeInWeNode(weNode, log);
  rescanOpenclawServeKillGuard(weNode);
  log("== openclaw server bootstrapped ==\n");

  return weNode;
}
