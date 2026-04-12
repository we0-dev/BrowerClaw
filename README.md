# weclaw

**Other languages:** [简体中文](README.zh-CN.md)

**weclaw** ships a **browser-hosted** experience around **OpenClaw Mini** (a trimmed tree from the [OpenClaw](https://github.com/openclaw/openclaw) project): agent loop, skills, memory, and a small built-in toolset live under `openclaw/`; the UI shell is `weRunOpenClaw/` (Vite + React). The “terminal” runs in **weNode**, a browser-side runtime that needs **SharedArrayBuffer**, so the app relies on **cross-origin isolation** headers (configured in Vite and in the Nginx image).

### How this differs from “full” upstream OpenClaw

What you see in public docs and blogs for **OpenClaw** (for example [docs.openclaw.ai](https://docs.openclaw.ai/) and gateway-focused write-ups) describes the **full product**: a long-lived **Gateway** process (control plane, WebSocket, HTTP APIs, optional **messaging channels** such as WhatsApp / Telegram / Discord, session routing, queueing, and often a **self-hosted** deployment on your machine or server).

**This repository is not that full stack.** The `openclaw/` tree here is **OpenClaw Mini**, which intentionally **drops** gateway-style services, messaging channels, macOS/iOS/Android shells, extensions/plugins, and several large product surfaces—see `openclaw/README.md` for the exact scope. **weclaw** adds a **static web + in-browser runtime** layer (`weRunOpenClaw` + weNode) so you can drive the mini agent from a page instead of (or in addition to) a local CLI on the host OS.

| Dimension | Upstream “full” OpenClaw (typical) | weclaw (this repo) |
|-----------|-------------------------------------|----------------------|
| Topology | Gateway daemon, multi-client control plane | No gateway in the Mini slice; browser UI + embedded runtime |
| Channels | Many chat / automation integrations | **None** in Mini (no inbound channel surface) |
| Docs fit | Gateway config, channels, sessions | Mini README + `weRunOpenClaw/weNode/weNode-usage.md` |
| Deployment | Often Node service + secrets on host | Static build + Docker/Nginx **or** `vite dev` |

If something is not in `openclaw/README.md`’s “What remains” list, assume **it is out of scope** for this tree unless you merge upstream changes yourself.

### Security advantages

- **Smaller attack surface than the full OpenClaw stack.** Mini intentionally drops the Gateway, messaging channels, and many integrations—large classes of **inbound control-plane and chat-channel exposure** common in the full product **do not exist here**, so your threat model is easier to explain and defend.
- **Transparent client boundary.** Only `VITE_*` variables are shipped to the browser, so you always know **exactly what is public**. When you need credentials off the client, you can add a **server-side proxy** with a clear, deliberate step instead of accidental leakage from server-only config.
- **Standards-based hardening for weNode.** **COOP / COEP** cross-origin isolation is how modern browsers safely enable **SharedArrayBuffer**; weclaw wires this through `vite.config.ts` and the Nginx snippet in `Dockerfile`, aligning with a well-documented platform security pattern.
- **Bounded agent execution.** The agent’s tools run **inside the sandbox you give it** (e.g. weNode VFS), so impact is **scoped** rather than granting blanket host access by default—good for predictable operations and reviews.
- **Static-friendly deployment.** Serving a **built SPA + Nginx** avoids a long-lived gateway daemon on the wire for the UI slice; combine with **pinned lockfiles**, **HTTPS** to model hosts you trust, and routine audits for a simple, reviewable supply-chain story.

Operational hygiene still matters: do not commit production secrets to git; rotate any key that has ever appeared in CI logs or chat.

### Browser sandbox vs OpenClaw on the host (why the sandbox helps)

- **Host filesystem is not the default workspace.** weNode tools operate against a **virtual in-browser workspace** (see `weRunOpenClaw/weNode/weNode-usage.md`), not your entire home folder or disk. Compared with running OpenClaw **as your OS user** on a real path, accidental or over-eager prompts are **much less likely** to touch unrelated host projects, SSH keys outside the workspace, or system config—blast radius stays **inside the sandbox you ship**.
- **Different process boundary.** The agent runs **inside a tab** under the browser’s process and security model, not as an extra long-lived **host daemon** with ambient login/session authority. Together with **COOP / COEP**, that is often a **smaller, clearer** trust shell than “full shell on my machine.”
- **Shareable without cloning a machine.** A **URL + static build** reproduces the same UI and weNode slice; collaborators do not need to install and harden a **full host OpenClaw footprint** just to try the mini agent.
- **Fewer host-native moving parts.** You avoid scaling the “always-on service + secrets beside personal files” pattern for this slice; delivery is closer to **immutable artifacts** (build output, container). The trade-off is honest: when you **must** automate the real host (installers, arbitrary paths, hardware), **native OpenClaw / CLI on the machine** remains the right tool—weclaw optimizes for **bounded, web-delivered** automation instead.

### Repository layout

| Path | Role |
|------|------|
| `openclaw/` | OpenClaw Mini — Node 22+, `pnpm build` → `dist/` |
| `weRunOpenClaw/` | Frontend + weNode; dev server default port **5173** |
| `Dockerfile` | Builds both; serves `weRunOpenClaw/dist` via Nginx |

### Prerequisites

- **Node.js**: **≥ 22.12** for `openclaw`; align with Node 22 for Docker parity  
- **pnpm**: `pnpm@10.x` — enable with `corepack enable`

### Run locally

```bash
cd weRunOpenClaw
corepack enable
pnpm install
pnpm dev
```

Open **http://localhost:5173** (`strictPort: true` — free the port or edit `vite.config.ts`).

```bash
cd weRunOpenClaw
pnpm build
pnpm preview
```

### Build OpenClaw core (optional)

```bash
cd openclaw
corepack enable
pnpm install
pnpm build
```

CLI usage: `openclaw/README.md`.

### Configuration (`VITE_*`)

Configure under **`weRunOpenClaw/`** using **`.env`**, **`.env.local`**, or **`.env.production`** (do not commit real secrets). Vite only exposes variables that start with `VITE_`.

**Example — `weRunOpenClaw/.env.local`:**

```env
# OpenAI-compatible chat/completions base URL (no trailing slash issues: use /v1 as your provider expects)
VITE_OPENCLAW_GEMINI_BASE_URL=https://your-model-host.example.com/v1

# Client-visible by Vite design—use a server proxy if the key must stay off-device
VITE_OPENCLAW_GEMINI_API_KEY=sk-your-key-here

# Optional metadata written into the generated OpenClaw config JSON
VITE_OPENCLAW_LAST_TOUCHED_AT=2026-04-12T00:00:00.000Z
VITE_OPENCLAW_LAST_TOUCHED_VERSION=2026.1.0
```

Then from `weRunOpenClaw/` run `pnpm dev` or `pnpm build` so Vite picks up the file.

**Example — Docker image with build-time args** (same variable names as in `Dockerfile`):

```bash
docker build -t weclaw \
  --build-arg VITE_OPENCLAW_GEMINI_BASE_URL=https://your-model-host.example.com/v1 \
  --build-arg VITE_OPENCLAW_GEMINI_API_KEY=sk-your-key-here \
  --build-arg VITE_OPENCLAW_LAST_TOUCHED_AT=2026-04-12T00:00:00.000Z \
  --build-arg VITE_OPENCLAW_LAST_TOUCHED_VERSION=2026.1.0 \
  .
```

Variable meanings:

- `VITE_OPENCLAW_GEMINI_BASE_URL` — OpenAI-compatible API base URL  
- `VITE_OPENCLAW_GEMINI_API_KEY` — shipped in the client bundle per Vite rules; use a **server-side proxy** if the key must stay off the client (see **Transparent client boundary** above)  
- `VITE_OPENCLAW_LAST_TOUCHED_AT`, `VITE_OPENCLAW_LAST_TOUCHED_VERSION` — virtual config metadata  

**Where values are read:** at build/dev time Vite injects `import.meta.env`. If variables are unset, the bundle falls back to defaults in `weRunOpenClaw/src/ui/Terminal/weNodeBootstrap.ts` (`getDefaultOpenclawConfigJson`)—prefer `.env.local` / CI secrets instead of relying on fallbacks.

**API key endpoint and CORS:** requests to `VITE_OPENCLAW_GEMINI_BASE_URL` are made **from the browser**. The host serving that URL must **allow your app’s origin** via **CORS** (`Access-Control-Allow-Origin` and related headers), or you must put a **same-origin reverse proxy** in front of the model API so calls are no longer cross-origin. This is **not** the same as **cross-origin isolation** (COOP/COEP) on weclaw itself—those headers stay enabled for weNode; do **not** remove them to “fix” model CORS.

### Docker

```bash
docker build -t weclaw .
docker run --rm -p 8080:80 weclaw
```

Browse **http://localhost:8080**.

### Further reading

- weNode + isolation: `weRunOpenClaw/weNode/weNode-usage.md`  
- Mini scope: `openclaw/README.md`  
- Upstream docs (full product): [https://docs.openclaw.ai/](https://docs.openclaw.ai/)
