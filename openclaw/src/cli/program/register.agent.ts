import type { Command } from "commander";
import { agentCliCommand } from "../../commands/agent-cli.js";
import { setVerbose } from "../../globals.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { formatHelpExamples } from "../help-format.js";
import { createDefaultDeps } from "../deps.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerAgentCommands(program: Command) {
  program
    .command("agent")
    .description("Run an agent turn locally")
    .requiredOption("-m, --message <text>", "Message body for the agent")
    .option("--session-id <id>", "Use an explicit local session id")
    .option("--agent <id>", "Agent id")
    .option("--thinking <level>", "Thinking level: off | minimal | low | medium | high")
    .option("--verbose <on|off>", "Persist agent verbose level for the session")
    .option("--json", "Output result as JSON", false)
    .option(
      "--timeout <seconds>",
      "Override agent command timeout (seconds, default 600 or config value)",
    )
    .addHelpText(
      "after",
      () =>
        `
${theme.heading("Examples:")}
${formatHelpExamples([
  ['openclaw agent --agent main --message "status update"', "Start a local agent turn."],
  ['openclaw agent --agent ops --message "Summarize logs"', "Use a specific agent."],
  [
    'openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium --json',
    "Target a session with explicit thinking level.",
  ],
  [
    'openclaw agent --agent main --message "Trace logs" --verbose on',
    "Enable verbose logging for the session.",
  ],
])}

${theme.muted("Docs:")} ${formatDocsLink("/cli/agent", "docs.openclaw.ai/cli/agent")}`,
    )
    .action(async (opts) => {
      const verboseLevel = typeof opts.verbose === "string" ? opts.verbose.toLowerCase() : "";
      setVerbose(verboseLevel === "on");
      await runCommandWithRuntime(defaultRuntime, async () => {
        await agentCliCommand(opts, defaultRuntime, createDefaultDeps());
      });
    });
}
