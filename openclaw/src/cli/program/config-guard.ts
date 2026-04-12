import type { RuntimeEnv } from "../../runtime.js";

export async function ensureConfigReady(params: {
  runtime: RuntimeEnv;
  commandPath?: string[];
}): Promise<void> {
  void params.runtime;
  void params.commandPath;
}
