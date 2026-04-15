# weclaw

**Other languages:** [简体中文](README.zh-CN.md)

**weclaw** is a browser-hosted runtime for **Mini OpenClaw**. It uses `weRunOpenClaw/` as the web UI shell and runs the agent inside `weNode`, a browser-side terminal runtime centered on **Node.js**, with Python support mainly kept for running script files bundled inside some skills.

Instead of running the agent against your host machine by default, **weclaw treats the browser as the sandbox**. The workspace, terminal, and preview all live inside the browser runtime, while **OPFS** is used for local persistence so task state, conversations, config, and workspace files can stay inside the current browser environment.

> `openclaw/` is the Mini OpenClaw runtime slice kept in this repo. `weRunOpenClaw/weNode` is integrated from packaged browser runtime artifacts. This README only describes that at the product level and does not expand on the packaged source details.

## Why weclaw

- **Run Mini OpenClaw in the browser** without installing a full host-side OpenClaw stack
- **Browser-native isolation** with a bounded workspace instead of default host filesystem access
- **Node.js-first terminal runtime with Python skill-script compatibility**
- **OPFS persistence** for tasks, conversations, virtual config, skill state, and workspace files
- **Task-based workspaces** with sync between VFS and OPFS during task switching
- **Built-in preview flow** for services started inside weNode
- **Static deployment friendly** with a frontend build plus browser runtime

## Features

- **Browser agent workspace** with chat, terminal, file view, artifacts, and preview in one page
- **Mini OpenClaw integration** that keeps local agent execution, skills, memory, and a small toolset
- **Skills management** for virtual OpenClaw skills and `SKILL.md`
- **Config editor** for the virtual `openclaw.json`
- **Persistent multi-task sessions** backed by OPFS
- **Preview port bridging** for dev servers and generated app output inside weNode

## How it differs from full OpenClaw

Public OpenClaw docs usually describe the full product with Gateway, control-plane features, messaging channels, and more surrounding surfaces. **This repository is not that full stack.**

The `openclaw/` tree here is an intentionally reduced **Mini** slice. `weRunOpenClaw/` adds the browser delivery layer so the agent can be driven from a web page instead of a host-native deployment.


| Dimension        | Full OpenClaw (typical)                                   | weclaw (this repo)                            |
| ---------------- | --------------------------------------------------------- | --------------------------------------------- |
| Deployment       | Host or server services, often with gateway-style runtime | Static web app + in-browser runtime           |
| Execution        | Node services on the host                                 | weNode terminal inside the browser            |
| Filesystem scope | Closer to real host access                                | Bounded browser-side workspace by default     |
| Persistence      | Host files and long-lived services                        | Browser OPFS                                  |
| Goal             | Full product surface                                      | Lightweight, web-delivered Mini agent runtime |

## Security model

- **The browser is the first sandbox**: the agent works against the weNode virtual workspace instead of your real host directories
- **Reduced attack surface**: Mini OpenClaw removes gateway and messaging-channel surfaces
- **Clear client boundary**: only `VITE_*` variables are exposed to the frontend bundle
- **Web delivery with bounded risk**: static hosting plus browser runtime is easier to reason about than a larger host-native stack

## Repository layout


| Path                    | Role                                                                           |
| ----------------------- | ------------------------------------------------------------------------------ |
| `openclaw/`             | Mini OpenClaw runtime with agent, skills, memory, and minimal tools            |
| `weRunOpenClaw/`        | Browser UI and weNode integration layer                                        |
| `weRunOpenClaw/weNode/` | Browser Node-first runtime assets plus Python skill-script compatibility notes |
| `Dockerfile`            | Builds the runtime and serves the app with Nginx                               |

## Requirements

- **Node.js**: `22+` recommended
- **pnpm**: `10.x` recommended
- **Browser support**: `Web Workers` and `SharedArrayBuffer`
- **Headers**:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: credentialless`

## Quick start

### Local development

Build `openclaw` first because `weRunOpenClaw` reads the built files from `openclaw/dist`.

```bash
cd openclaw
corepack enable
pnpm install
pnpm build

cd ../weRunOpenClaw
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

### Using bun

```bash
cd openclaw
bun install
bun run build

cd ../weRunOpenClaw
bun install
bun run dev
```

### Preview the production build

```bash
cd weRunOpenClaw
pnpm build
pnpm preview
```

## Configuration

Use `.env`, `.env.local`, or `.env.production` inside `weRunOpenClaw/`. Only variables prefixed with `VITE_` are exposed to the frontend.

Example:

```env
VITE_OPENCLAW_GEMINI_BASE_URL=https://your-model-host.example.com/v1
VITE_OPENCLAW_GEMINI_API_KEY=sk-your-key-here
VITE_OPENCLAW_LAST_TOUCHED_AT=2026-04-12T00:00:00.000Z
VITE_OPENCLAW_LAST_TOUCHED_VERSION=2026.1.0
```

Meaning:

- `VITE_OPENCLAW_GEMINI_BASE_URL`: model API base URL
- `VITE_OPENCLAW_GEMINI_API_KEY`: model API key
- `VITE_OPENCLAW_LAST_TOUCHED_AT`: timestamp stored in the virtual OpenClaw config
- `VITE_OPENCLAW_LAST_TOUCHED_VERSION`: version stored in the virtual OpenClaw config

If these variables are missing, the app falls back to the default config generation in `weRunOpenClaw/src/ui/Terminal/weNodeBootstrap.ts`.

Recommendation:

- The virtual `openclaw.json` works best with an **OpenAI-compatible gateway such as NewAPI**
- In this project, model requests are usually sent directly from the browser, and NewAPI-style gateways tend to be more reliable for browser-direct traffic and compatibility
- Platforms such as **Volcengine** may be blocked or behave inconsistently in browser-direct scenarios due to risk controls, auth expectations, CORS policy, or request-shape restrictions
- If you need to use Volcengine or a similar provider, it is safer to add your own stable relay or same-origin proxy in front of it instead of calling the raw endpoint directly from the browser

## Docker

```bash
docker build -t weclaw .
docker run --rm -p 8080:80 weclaw
```

Browse to `http://localhost:8080`.

## FAQ

<details>
<summary><strong>What is stored in OPFS?</strong></summary>

This project mainly persists task records, conversations, virtual OpenClaw config, skill preferences, and task workspace files into the browser's local OPFS storage.

</details>

<details>
<summary><strong>Is this the full OpenClaw product?</strong></summary>

No. This repo packages a reduced Mini OpenClaw runtime with a browser-hosted UI layer focused on bounded, web-delivered agent execution.

</details>

<details>
<summary><strong>Why is a NewAPI-style gateway recommended by default?</strong></summary>

Because the model endpoint in the virtual `openclaw.json` is typically accessed directly by the browser. For that delivery model, OpenAI-compatible gateways such as NewAPI are usually easier to make work reliably, while providers like Volcengine may reject or restrict browser-side requests due to platform controls, auth flow mismatch, or CORS behavior.

</details>

## Further reading

- `openclaw/README.md`
