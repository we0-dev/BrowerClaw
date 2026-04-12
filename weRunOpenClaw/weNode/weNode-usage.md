# weNode（WeNode SDK）在本项目中的使用说明

本仓库里提到的 `weNode` 指 `WeNode` 这个 SDK（源码在 `src/sdk/weNode.ts`），用于在**浏览器**中提供“类 Node.js”的运行环境：虚拟文件系统、脚本执行、shell/终端交互、以及在 Worker 内启动 HTTP 服务并映射到可访问的预览 URL。

## 1. 能力概览

- **启动运行时**：`await WeNode.boot(options)`
- **文件系统（VFS）**：`weNode.fs.*`（如 `mkdir/readFile/writeFile/exists`）
- **跑命令 / 跑脚本**
  - **交互式**：`weNode.createTerminal(...)` + `terminal.input("cmd\n")`
  - **编程式**：`await weNode.spawn(cmd, args?, opts?)` 得到 `WeNodeProcess`
- **预览 URL**：Worker 内有 server listen 时，通过 `onServerReady(port, url)` 回调拿到 URL

## 2. 运行前置条件（非常重要）

`WeNode.boot()` 会硬性要求：

- 浏览器支持 **Web Workers**
- 浏览器支持 **SharedArrayBuffer**
  - 这通常意味着页面必须开启 **Cross-Origin-Isolation**
  - 需要的响应头（至少）：
    - `Cross-Origin-Opener-Policy: same-origin`
    - `Cross-Origin-Embedder-Policy: credentialless`

如果没有这些条件，会在启动时抛错（见 `src/sdk/weNode.ts`）。

## 3. 最小启动示例（来自 `examples/vite-terminal`）

仓库里最完整的“如何接入 weNode”的样例是：`examples/vite-terminal/src/main.ts`。

### 3.1 初始化 weNode

典型初始化参数：

- `workdir`：工作目录（例如 `/workspace`）
- `files`：启动时写入 VFS 的种子文件（字符串或 `Uint8Array`）
- `env`：环境变量（例如 `HOME`）
- `swUrl`：可选，注册 Service Worker（用于请求代理/预览能力）
- `onServerReady`：当 weNode 内部启动服务时返回可访问 URL

示例代码（同仓库文件一致，节选）：

```ts
const weNode = await WeNode.boot({
  workdir: "/workspace",
  files: {
    "/workspace/hello.js": 'console.log("hello from weNode");\n',
  },
  swUrl: "/__sw__.js",
  env: { HOME: "/home/user" },
  onServerReady: (port, url) => {
    console.log("server ready:", port, url);
  },
});
```

### 3.2 挂载终端（xterm）

`createTerminal()` 会把一个可交互的终端和 weNode 的 shell 执行通道连起来：

```ts
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

const terminal = weNode.createTerminal({ Terminal, FitAddon });
terminal.attach(document.querySelector("#terminal")!);
terminal.showPrompt();

// 发送命令（注意换行）
terminal.input("pwd\n");
terminal.input("ls\n");
```

说明：

- 终端模式下，weNode 会维护一个**持久 shell worker** 来复用状态（cwd、进程树、端口等）。
- `terminal.input()` 适合 UI 交互（按钮、输入框回车等）。

## 4. 编程式执行：`weNode.spawn()`

当你不需要交互终端 UI，而是想在代码里启动一个任务并读取输出，可用：

```ts
const proc = await weNode.spawn("node", ["hello.js"], { cwd: "/workspace" });

proc.on("output", (data) => console.log("[stdout]", data));
proc.on("error", (data) => console.warn("[stderr]", data));

const { exitCode } = await proc.completion;
console.log("exit:", exitCode);
```

要点：

- `spawn()` 的每次调用会创建一个**专属 worker 进程**（与终端复用的“持久 shell worker”不同）。
- `SpawnOptions` 支持 `cwd/env/signal`（见 `src/sdk/types.ts`）。

## 5. 文件系统：`weNode.fs`

`weNode.fs` 是对虚拟文件系统的封装（底层是内存卷 `MemoryVolume`）。常见用法：

```ts
await weNode.fs.mkdir("/workspace/app", { recursive: true });
await weNode.fs.writeFile("/workspace/app/readme.md", "# Hi\n");
const text = await weNode.fs.readFile("/workspace/app/readme.md", "utf8");
const ok = await weNode.fs.exists("/workspace/app/readme.md");
```

## 6. 预览 URL：`onServerReady` / `weNode.port()`

如果你在 weNode 中启动了会监听端口的服务（例如 `pnpm dev` / `vite` / `http-server`），主线程会通过 `onServerReady(port, url)` 告诉你访问地址。

另外，也可以用 `weNode.port(portNumber)` 查询该端口是否已被代理并返回 URL（没有则为 `null`）。

## 7. 常见问题 / 坑位

- **启动时报 SharedArrayBuffer 相关错误**：基本就是 COOP/COEP 没配好；本地 dev server 也要配响应头。
- **命令执行慢**：终端模式已经复用了 shell worker；如果你每次都用 `spawn()` 跑短命令，会有 worker 启动成本。
- **文件变化与 HMR**：weNode 内部有 VFS bridge 用于把主线程文件变化广播到 worker（供 HMR/开发服务器使用），如果你绕过 `weNode.fs` 直接操作底层实现，可能影响同步。

## 8. 进一步阅读（本仓库）

- `src/sdk/weNode.ts`：`boot/spawn/createTerminal` 的核心逻辑
- `src/sdk/types.ts`：`WeNodeOptions/SpawnOptions/TerminalOptions`
- `examples/vite-terminal/src/main.ts`：完整可运行的接入示例（含文件种子、终端 UI、预览 iframe）

