# weclaw

**其它语言：** [English](README.md)

**weclaw** 将 **OpenClaw Mini**（来自 [OpenClaw](https://github.com/openclaw/openclaw) 的精简树：本地 agent、skills、memory、少量内置工具，见 `openclaw/README.md`）放进**浏览器**：壳层是 `weRunOpenClaw/`（Vite + React），终端侧通过 **weNode** 在页内运行；weNode 依赖 **SharedArrayBuffer**，因此必须配置 **跨源隔离** 响应头（Vite 与 Docker 内 Nginx 已示例配置）。

### 与网上「完整版」OpenClaw 的差别

公开文档与社区文章里的 **OpenClaw**（例如 [docs.openclaw.ai](https://docs.openclaw.ai/)）通常指**完整形态**：长期运行的 **Gateway**、控制面 / WebSocket、HTTP API、**多聊天通道**（如 WhatsApp、Telegram、Discord 等）、会话与队列路由，多见于**本机或自建服务器**部署。

**本仓库不是那一套。** `openclaw/` 在此为 **Mini**，已主动去掉 Gateway、消息通道、各端 App、扩展插件等大块能力。**weclaw** 在此基础上提供**静态 Web + 浏览器内运行时**，用网页驱动 Mini 里的 agent，而不是完整 Gateway 拓扑。

| 维度 | 上游完整 OpenClaw（常见描述） | weclaw（本仓库） |
|------|------------------------------|------------------|
| 架构 | Gateway 常驻、多客户端控制面 | Mini 无 Gateway；浏览器 UI + 页内运行时 |
| 通道 | 多种消息 / 自动化集成 | Mini **无**入站消息通道 |
| 文档 | Gateway、通道、会话等 | `openclaw/README.md` + `weRunOpenClaw/weNode/weNode-usage.md` |
| 部署 | 多为 Node 服务 + 主机密钥 | 静态资源 + Nginx / Docker **或** `vite dev` |

若能力未列在 `openclaw/README.md` 的「What remains」中，在本树中应视为**不在范围内**（除非自行合并上游）。

### 安全方面的优点

- **比完整 OpenClaw 更小的攻击面。** Mini 主动拿掉 Gateway、消息通道和大量集成，完整版里常见的**入站控制面、聊天通道暴露**等一整类风险**在本形态下不存在**，威胁模型更简单、也更容易向他人说明。
- **前端边界清晰、可预期。** 只有带 `VITE_` 前缀的变量会进浏览器包，**公开面一目了然**；若要把密钥留在服务端，只需显式加一层**服务端代理**，而不是从「本应只在服务器」的配置里意外带出。
- **符合平台安全惯例的 weNode 加固。** **COOP / COEP** 跨源隔离是现代浏览器安全启用 **SharedArrayBuffer** 的标准路径；weclaw 在 `vite.config.ts` 与 `Dockerfile` 的 Nginx 片段里已对齐该模式，便于对照文档做审计与部署。
- **Agent 能力有明确边界。** 工具在**你配置好的沙箱**内运行（如 weNode 虚拟文件系统等），影响范围**可界定**，而不是默认放开整台宿主机——利于运维预期与安全评审。
- **静态化部署友好。** 以**构建产物 + Nginx** 托管，相对长期驻留的 Gateway 守护进程，**暴露面与密钥散落点更少**；再配合**锁版本 lockfile**、只连你信任的 **HTTPS** 模型端点并做依赖审计，供应链故事简单、可复查。

运维上仍建议：勿将生产密钥提交 git；任何曾出现在 CI 日志、聊天里的密钥应**轮换**。

### 浏览器沙箱 vs 本机上的 OpenClaw（沙箱带来的优点）

- **宿主机文件系统不是默认工作区。** weNode 里工具面对的是**页内虚拟工作区**（见 `weRunOpenClaw/weNode/weNode-usage.md`），而不是整个用户目录或磁盘。相对「以 **OS 用户身份** 在真实路径上跑 OpenClaw / CLI」，误操作或过度热心的 prompt **更难**波及无关项目、工作区外的 SSH 私钥或系统配置——影响范围默认**落在你提供的沙箱里**。
- **进程与身份边界不同。** Agent 在**浏览器标签页**内、受浏览器进程与安全模型约束，而不是再多一个长期驻留的**本机守护进程**、天然携带登录会话与环境权限。再配合 **COOP / COEP**，信任边界往往比「在我笔记本上开全功能 shell」**更小、更好讲清楚**。
- **分享成本低，不必复制一台机器环境。** 给同事一个 **URL + 静态构建** 即可复现同一套 UI 与 weNode 切片；不必为「试一下 Mini agent」让对方先装一整套**本机 OpenClaw 面**并做好加固。
- **运维形态更简单。** 这一层更接近**不可变产物**（构建产物、镜像），而不是把「长期服务 + 与个人文件混放的主机密钥」模式在每台机器上铺开。取舍也要说清：若你**必须**对真实宿主机做自动化（任意路径、安装程序、硬件等），**本机上的原生 OpenClaw / CLI** 仍是正确选择——weclaw 侧重的是**有边界的、通过网页交付**的自动化。

### 仓库结构

| 目录 | 说明 |
|------|------|
| `openclaw/` | OpenClaw Mini；Node 22+；`pnpm build` 产出 `dist/` |
| `weRunOpenClaw/` | 前端 + weNode；开发端口默认 **5173** |
| `Dockerfile` | 构建两者；Nginx 托管静态资源 |

### 环境要求

- **Node.js**：`openclaw` 建议 **≥ 22.12**；与 Dockerfile 的 Node 22 对齐即可  
- **pnpm**：`pnpm@10.x`（`corepack enable`）

### 本地启动

```bash
cd weRunOpenClaw
corepack enable
pnpm install
pnpm dev
```

浏览器打开 **http://localhost:5173**（`strictPort: true`，端口占用需先释放或改配置。）

```bash
cd weRunOpenClaw
pnpm build
pnpm preview
```

### 构建 OpenClaw 核心（可选）

```bash
cd openclaw
corepack enable
pnpm install
pnpm build
```

更多 CLI：`openclaw/README.md`。

### 配置（`VITE_*`）

在 **`weRunOpenClaw/`** 目录下使用 **`.env`**、**`.env.local`** 或 **`.env.production`**（勿提交真实密钥）。只有以 `VITE_` 开头的变量会被 Vite 暴露给前端。

**示例 — `weRunOpenClaw/.env.local`：**

```env
# OpenAI 兼容的聊天 / completions 根地址（按你的服务商要求写，常见为 /v1）
VITE_OPENCLAW_GEMINI_BASE_URL=https://your-model-host.example.com/v1

# 按 Vite 规则会进前端包；密钥需保密时请走服务端代理
VITE_OPENCLAW_GEMINI_API_KEY=sk-your-key-here

# 可选：写入生成出来的 OpenClaw 配置 JSON 的元数据
VITE_OPENCLAW_LAST_TOUCHED_AT=2026-04-12T00:00:00.000Z
VITE_OPENCLAW_LAST_TOUCHED_VERSION=2026.1.0
```

在 `weRunOpenClaw/` 下执行 `pnpm dev` 或 `pnpm build`，Vite 会读取上述文件。

**示例 — Docker 构建时传入同名变量**（与 `Dockerfile` 中 `ARG` 一致）：

```bash
docker build -t weclaw \
  --build-arg VITE_OPENCLAW_GEMINI_BASE_URL=https://your-model-host.example.com/v1 \
  --build-arg VITE_OPENCLAW_GEMINI_API_KEY=sk-your-key-here \
  --build-arg VITE_OPENCLAW_LAST_TOUCHED_AT=2026-04-12T00:00:00.000Z \
  --build-arg VITE_OPENCLAW_LAST_TOUCHED_VERSION=2026.1.0 \
  .
```

字段说明：

- `VITE_OPENCLAW_GEMINI_BASE_URL`  
- `VITE_OPENCLAW_GEMINI_API_KEY` — 按 Vite 规则会进入前端包体；若密钥不能出浏览器，请用**服务端代理**（见上文「前端边界清晰」）  
- `VITE_OPENCLAW_LAST_TOUCHED_AT`、`VITE_OPENCLAW_LAST_TOUCHED_VERSION`  

**密钥写在哪里、代码从哪里读：**开发与构建时由 Vite 把 `import.meta.env` 打进前端；若未设置环境变量，会退回到 `weRunOpenClaw/src/ui/Terminal/weNodeBootstrap.ts` 里 `getDefaultOpenclawConfigJson` 的默认值——**正式环境请用 `.env.local` 或 CI/CD 注入**，不要依赖仓库内默认占位。

**模型地址与「跨域」：**`VITE_OPENCLAW_GEMINI_BASE_URL` 由**浏览器直接请求**。因此托管 API Key 的模型或中转服务必须在服务端**放行你站点来源的 CORS**（返回合适的 `Access-Control-Allow-Origin` 等），或在前面加一层**与页面同源的反向代理**，让请求不再跨域。这与本应用为 weNode 开启的**跨源隔离**（COOP / COEP）是两件事：**不要**为了模型接口报错而去关掉页面上的隔离头；应在模型服务端或代理上处理 CORS。

### Docker

```bash
docker build -t weclaw .
docker run --rm -p 8080:80 weclaw
```

访问 **http://localhost:8080**。

### 延伸阅读

- weNode 与跨源隔离：`weRunOpenClaw/weNode/weNode-usage.md`  
- Mini 范围：`openclaw/README.md`  
- 上游完整产品文档：[https://docs.openclaw.ai/](https://docs.openclaw.ai/)
