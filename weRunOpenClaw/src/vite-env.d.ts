/// <reference types="vite/client" />

/** TS lib 未包含的 OPFS 目录枚举（运行时 Chrome/Edge 支持） */
interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<
    [string, FileSystemFileHandle | FileSystemDirectoryHandle]
  >;
}

