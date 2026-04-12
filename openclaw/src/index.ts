#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export {
  BUILTIN_TOOLS,
  runAgent,
  runChat,
  runCli,
  runConversation,
  runServe,
  runSetup,
  runSkills,
} from "./agents/mini-agent.js";

import { runCli } from "./agents/mini-agent.js";

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isMainModule()) {
  void runCli(process.argv).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[openclaw] ${message}`);
    process.exit(1);
  });
}
