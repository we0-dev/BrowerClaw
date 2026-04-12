# OpenClaw Mini

This repo has been trimmed down to a local-first agent runtime.

What remains:
- local `agent` execution
- `skills`
- `memory` and session memory files
- basic tools for file work, shell work, web fetch/search, and image understanding

What was intentionally removed:
- gateway
- messaging channels
- apps and UI shells
- extensions/plugins
- browser/canvas/nodes/cron style product surfaces

## Runtime

- Node `22+`
- package manager: `pnpm` recommended

## Install

```bash
pnpm install
pnpm build
```

## Use

```bash
openclaw setup
openclaw agent --message "Summarize this project"
openclaw skills
```

## Scope

This tree is meant to stay small. If a module does not serve the core agent loop, skills, memory, or the minimal built-in tools, it should not be here.
