import { useCallback, useEffect, useMemo, useState } from "react";
import { applyVirtualOpenclawSkillsToWeNode } from "../lib/applyVirtualOpenclawSkills";
import { getBundledSkillCatalog, type BundledSkillRow } from "../lib/bundledOpenclawSkillCatalog";
import {
  loadVirtualSkillsPrefs,
  saveVirtualSkillsPrefs,
  type VirtualSkillsPrefsV1,
} from "../lib/opfsVirtualSkillsStore";

export type VirtualOpenclawSkillsApi = {
  ready: boolean;
  catalog: BundledSkillRow[];
  prefs: VirtualSkillsPrefsV1;
  /** 是否对该 folder 启用（未列入 disabledFolders） */
  isFolderEnabled: (folder: string) => boolean;
  setFolderEnabled: (folder: string, enabled: boolean) => void;
  /** 当前编辑用正文；无覆盖时返回内置默认 */
  getSkillMdForFolder: (folder: string) => string;
  /** 仅更新内存与 OPFS，不直接写 VFS（由 weNode effect 统一应用） */
  setSkillMdOverride: (folder: string, markdown: string) => void;
  clearSkillMdOverride: (folder: string) => void;
  resetSkillMd: (folder: string) => void;
};

export function useVirtualOpenclawSkills(weNode: unknown | null): VirtualOpenclawSkillsApi {
  const [ready, setReady] = useState(false);
  const [catalog] = useState(() => getBundledSkillCatalog());
  const [prefs, setPrefs] = useState<VirtualSkillsPrefsV1>(() => ({
    version: 1,
    disabledFolders: [],
    skillMdOverrides: {},
  }));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadVirtualSkillsPrefs();
      if (!cancelled) {
        setPrefs(loaded);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !weNode) return;
    void applyVirtualOpenclawSkillsToWeNode(weNode, prefs).catch(() => {
      // VFS 可能尚未就绪；忽略
    });
  }, [ready, weNode, prefs]);

  const isFolderEnabled = useCallback(
    (folder: string) => !prefs.disabledFolders.includes(folder),
    [prefs.disabledFolders]
  );

  const setFolderEnabled = useCallback((folder: string, enabled: boolean) => {
    setPrefs((p) => {
      const set = new Set(p.disabledFolders);
      if (enabled) set.delete(folder);
      else set.add(folder);
      const next = {
        ...p,
        disabledFolders: [...set].sort(),
      };
      void saveVirtualSkillsPrefs(next);
      return next;
    });
  }, []);

  const getSkillMdForFolder = useCallback(
    (folder: string) => {
      const row = catalog.find((r) => r.folder === folder);
      const fallback = row?.defaultSkillMd ?? "";
      return prefs.skillMdOverrides[folder] ?? fallback;
    },
    [catalog, prefs.skillMdOverrides]
  );

  const setSkillMdOverride = useCallback((folder: string, markdown: string) => {
    setPrefs((p) => {
      const skillMdOverrides = { ...p.skillMdOverrides, [folder]: markdown };
      const next = { ...p, skillMdOverrides };
      void saveVirtualSkillsPrefs(next);
      return next;
    });
  }, []);

  const clearSkillMdOverride = useCallback((folder: string) => {
    setPrefs((p) => {
      const skillMdOverrides = { ...p.skillMdOverrides };
      delete skillMdOverrides[folder];
      const next = { ...p, skillMdOverrides };
      void saveVirtualSkillsPrefs(next);
      return next;
    });
  }, []);

  const resetSkillMd = useCallback(
    (folder: string) => {
      clearSkillMdOverride(folder);
    },
    [clearSkillMdOverride]
  );

  return useMemo(
    () => ({
      ready,
      catalog,
      prefs,
      isFolderEnabled,
      setFolderEnabled,
      getSkillMdForFolder,
      setSkillMdOverride,
      clearSkillMdOverride,
      resetSkillMd,
    }),
    [
      ready,
      catalog,
      prefs,
      isFolderEnabled,
      setFolderEnabled,
      getSkillMdForFolder,
      setSkillMdOverride,
      clearSkillMdOverride,
      resetSkillMd,
    ]
  );
}
