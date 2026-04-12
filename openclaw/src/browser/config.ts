export type ResolvedBrowserProfile = {
  cdpPort: number;
  color?: string;
};

export type ResolvedBrowserConfig = {
  enabled: boolean;
  evaluateEnabled: boolean;
  controlPort: number;
  cdpProtocol: string;
  cdpHost: string;
  cdpIsLoopback: boolean;
  remoteCdpTimeoutMs: number;
  remoteCdpHandshakeTimeoutMs: number;
  color?: string;
  executablePath?: string;
  headless: boolean;
  noSandbox: boolean;
  attachOnly: boolean;
  defaultProfile: string;
  profiles: Record<string, ResolvedBrowserProfile>;
};

export function resolveProfile(
  config: ResolvedBrowserConfig,
  profileName: string,
): ResolvedBrowserProfile | null {
  return config.profiles[profileName] ?? null;
}
