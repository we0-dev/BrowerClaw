import type { Command } from "commander";

import { registerAgentCommands } from "./register.agent.js";
import { registerSetupCommand } from "./register.setup.js";
import { registerSubCliCommands } from "./register.subclis.js";
import type { ProgramContext } from "./context.js";

type CommandRegisterParams = {
  program: Command;
  ctx: ProgramContext;
  argv: string[];
};

type RouteSpec = {
  match: (path: string[]) => boolean;
  loadPlugins?: boolean;
  run: (argv: string[]) => Promise<boolean>;
};

export type CommandRegistration = {
  id: string;
  register: (params: CommandRegisterParams) => void;
  routes?: RouteSpec[];
};

export const commandRegistry: CommandRegistration[] = [
  {
    id: "setup",
    register: ({ program }) => registerSetupCommand(program),
  },
  {
    id: "agent",
    register: ({ program }) => registerAgentCommands(program),
  },
  {
    id: "subclis",
    register: ({ program, argv }) => registerSubCliCommands(program, argv),
  },
];

export function registerProgramCommands(
  program: Command,
  ctx: ProgramContext,
  argv: string[] = process.argv,
) {
  for (const entry of commandRegistry) {
    entry.register({ program, ctx, argv });
  }
}

export function findRoutedCommand(path: string[]): RouteSpec | null {
  for (const entry of commandRegistry) {
    if (!entry.routes) continue;
    for (const route of entry.routes) {
      if (route.match(path)) return route;
    }
  }
  return null;
}
