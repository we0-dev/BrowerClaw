import http from "node:http";

import type { ResolvedBrowserConfig } from "./config.js";

export type BrowserBridge = {
  server: http.Server;
  baseUrl: string;
  state: {
    resolved: ResolvedBrowserConfig;
  };
};

export async function startBrowserBridgeServer(params: {
  resolved: ResolvedBrowserConfig;
  onEnsureAttachTarget?: () => Promise<void>;
}): Promise<BrowserBridge> {
  await params.onEnsureAttachTarget?.();
  const server = http.createServer((_req, res) => {
    res.writeHead(503, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Browser bridge is unavailable in the mini build." }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  const port = address && typeof address === "object" ? address.port : 0;
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    state: { resolved: params.resolved },
  };
}

export async function stopBrowserBridgeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}
