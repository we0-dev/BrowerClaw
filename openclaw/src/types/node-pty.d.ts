declare module "@lydell/node-pty" {
  export function spawn(
    file: string,
    args: string[] | string,
    options?: {
      name?: string;
      cols?: number;
      rows?: number;
      cwd?: string;
      env?: Record<string, string>;
    },
  ): {
    pid: number;
    write(data: string | Buffer): void;
    onData(listener: (data: string) => void): void;
    onExit(listener: (event: { exitCode: number; signal?: number }) => void): void;
    kill?(signal?: string): void;
    resize?(cols: number, rows: number): void;
  };
}
