# weclaw

**其它语言：** [English](README.md)

**weclaw** 是一个把 **Mini OpenClaw** 放进浏览器里的项目。它基于 `weRunOpenClaw/` 提供网页 UI，通过浏览器内的 `weNode` 终端承载以 **Node.js 为主** 的运行能力，并兼容执行部分 skills 附带的 Python 脚本，让你直接在网页里运行一个删减版的小龙虾 agent。

和把 agent 直接跑在本机终端不同，**weclaw 天然把浏览器当作环境沙箱**：工作区、终端和预览都被收敛在浏览器侧运行时里；同时使用 **OPFS** 做本地持久化，把任务、对话、配置和工作区内容尽量留在当前浏览器环境中。

> `openclaw/` 是本仓库内保留的 Mini OpenClaw 运行时切片；`weRunOpenClaw/weNode` 使用打包后的浏览器运行时代码接入页面。这部分实现只在功能层面点到为止，README 不展开源码细节。

## 为什么选择 weclaw？

- **浏览器里直接跑小龙虾**：不依赖宿主机安装完整 OpenClaw 服务栈，打开页面即可进入 agent 终端
- **浏览器天然隔离**：默认工作区不直连宿主机文件系统，适合做边界明确的网页内自动化
- **Node.js 主运行时，兼容 Python去运行 Skill 脚本**：核心终端与 agent 主要运行在浏览器内 Node 环境中，Python 支持主要用于执行部分 skills 自带脚本
- **OPFS 持久化**：任务列表、会话记录、虚拟配置、技能开关与工作区内容可在浏览器本地落盘
- **任务式工作区**：不同任务拥有独立工作区，可在任务切换时做 VFS 与 OPFS 的同步
- **内置预览能力**：weNode 内启动的服务端口可映射为浏览器预览地址，便于查看生成结果
- **静态部署友好**：核心形态是前端静态页面 + 浏览器运行时，适合用 Nginx 或 Docker 托管

## 功能特性

- **浏览器 Agent 工作台**：聊天面板、终端、文件夹视图、产物预览在一个页面中协同工作
- **Mini OpenClaw 集成**：保留本地 agent、skills、memory 和少量内置工具，去掉 Gateway、消息通道和重型产品外壳
- **Skills 管理**：浏览器侧管理虚拟 OpenClaw 的 skills 开关与 `SKILL.md`
- **配置面板**：直接编辑虚拟 `openclaw.json`，保存后在下次运行时生效
- **多任务持久化**：每个任务的聊天记录与工作区文件可回写到 OPFS，刷新页面后仍可恢复
- **预览端口桥接**：在 weNode 里启动开发服务器或静态服务后，可直接在右侧预览面板打开

## 它和完整版 OpenClaw 的区别

公开资料中的 OpenClaw 通常指带有 Gateway、控制面、消息通道和更多外围集成的完整产品。**weclaw 不是那一套。**

本仓库里的 `openclaw/` 是一个刻意缩减后的 **Mini** 版本，只保留本地 agent 执行、skills、memory 和最小工具集；`weRunOpenClaw/` 则负责把这套能力搬进浏览器，让你通过网页来驱动它。


| 维度     | 完整版 OpenClaw（常见描述）     | weclaw（本仓库）                   |
| -------- | ------------------------------- | ---------------------------------- |
| 部署形态 | 常驻服务 / Gateway / 多外围能力 | 静态 Web 页面 + 浏览器内运行时     |
| 运行环境 | 主机或服务器上的 Node 服务      | 浏览器中的 weNode 终端             |
| 文件边界 | 更接近宿主机真实环境            | 默认落在浏览器沙箱工作区           |
| 持久化   | 依赖宿主机文件与服务状态        | 基于浏览器 OPFS                    |
| 目标     | 完整产品能力                    | 轻量、可网页交付的 Mini agent 体验 |

## 安全与隔离

- **浏览器就是第一层沙箱**：agent 默认操作的是 weNode 虚拟工作区，而不是你的真实宿主机目录
- **攻击面更小**：Mini OpenClaw 去掉了 Gateway、消息通道和大量外围集成，暴露面更容易理解
- **边界更清晰**：前端公开的配置就是 `VITE_*` 变量；如果不希望密钥进入浏览器，可自行加服务端代理
- **更适合网页交付**：静态部署 + 浏览器运行时，比在每台机器上铺一个完整 agent 栈更容易控制边界

## 仓库结构


| 目录                    | 说明                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `openclaw/`             | Mini OpenClaw 运行时，负责 agent、skills、memory 和最小工具集  |
| `weRunOpenClaw/`        | 浏览器端 UI 与 weNode 集成层                                   |
| `weRunOpenClaw/weNode/` | 浏览器内 Node 主运行时及 Python Skill 脚本兼容层相关产物与说明 |
| `Dockerfile`            | 构建`openclaw` 与前端页面，并用 Nginx 托管                     |

## 环境要求

- **Node.js**：建议 `22+`
- **pnpm**：建议 `10.x`
- **浏览器**：需要支持 `Web Workers` 与 `SharedArrayBuffer`
- **响应头**：必须开启跨源隔离
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: credentialless`

## 快速开始

### 本地开发

先构建 `openclaw`，因为 `weRunOpenClaw` 会读取 `openclaw/dist` 内的构建产物。

```bash
cd openclaw
corepack enable
pnpm install
pnpm build

cd ../weRunOpenClaw
pnpm install
pnpm dev
```

打开 `http://localhost:5173`。

### 使用 bun

```bash
cd openclaw
bun install
bun run build

cd ../weRunOpenClaw
bun install
bun run dev
```

### 预览生产构建

```bash
cd weRunOpenClaw
pnpm build
pnpm preview
```

## 配置说明

在 `weRunOpenClaw/` 目录下使用 `.env`、`.env.local` 或 `.env.production`。只有 `VITE_` 前缀的变量会被注入前端。

示例：

```env
VITE_OPENCLAW_GEMINI_BASE_URL=https://your-model-host.example.com/v1
VITE_OPENCLAW_GEMINI_API_KEY=sk-your-key-here
VITE_OPENCLAW_LAST_TOUCHED_AT=2026-04-12T00:00:00.000Z
VITE_OPENCLAW_LAST_TOUCHED_VERSION=2026.1.0
```

字段含义：

- `VITE_OPENCLAW_GEMINI_BASE_URL`：模型服务根地址
- `VITE_OPENCLAW_GEMINI_API_KEY`：模型服务 API Key
- `VITE_OPENCLAW_LAST_TOUCHED_AT`：写入虚拟 OpenClaw 配置的时间戳
- `VITE_OPENCLAW_LAST_TOUCHED_VERSION`：写入虚拟 OpenClaw 配置的版本号

如果这些变量没有提供，前端会回退到 `weRunOpenClaw/src/ui/Terminal/weNodeBootstrap.ts` 中的默认配置生成逻辑。

推荐说明：

- 虚拟 `openclaw.json` 默认更推荐使用 **NewAPI 网关** 这类 OpenAI 兼容网关地址
- 原因是本项目的模型请求主要由浏览器直接发出，NewAPI 一类网关在浏览器直连、兼容性和接口行为上通常更稳定
- **火山引擎** 之类的服务在浏览器环境下可能因为风控、鉴权策略、跨域策略或请求特征限制而被拦截，导致调用不稳定
- 如果你必须接火山引擎或类似平台，建议自行在前面增加一层稳定的中转或同源代理，而不是直接让浏览器请求其原始接口

## Docker

```bash
docker build -t weclaw .
docker run --rm -p 8080:80 weclaw
```

访问 `http://localhost:8080`。

## 常见问题

<details>
<summary><strong>OPFS 里保存了什么？</strong></summary>

当前项目主要把任务记录、对话内容、虚拟 OpenClaw 配置、skills 状态以及任务工作区文件持久化到浏览器本地的 OPFS 中。

</details>

<details>
<summary><strong>这是不是完整的 OpenClaw？</strong></summary>

不是。这里是删减后的 Mini OpenClaw，加上一层浏览器运行界面，目标是做网页内、带隔离边界的轻量 agent 运行环境。

</details>

<details>
<summary><strong>为什么默认更推荐 NewAPI 网关？</strong></summary>

因为虚拟 `openclaw.json` 里的模型地址通常会被浏览器直接访问。对这个场景来说，NewAPI 一类 OpenAI 兼容网关往往更容易适配浏览器直连；而火山引擎等平台可能会因为浏览器侧请求被风控、鉴权链路不匹配或跨域限制而出现拦截和不稳定现象。

</details>

## 延伸阅读

- `openclaw/README.md`
