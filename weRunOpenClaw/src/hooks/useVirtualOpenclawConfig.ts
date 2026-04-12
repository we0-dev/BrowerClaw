import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadVirtualOpenclawConfigPrefs,
  saveVirtualOpenclawConfigPrefs,
  type VirtualOpenclawConfigPrefsV1,
} from "../lib/opfsVirtualOpenclawConfigStore";

export type VirtualOpenclawConfigApi = {
  ready: boolean;
  prefs: VirtualOpenclawConfigPrefsV1;
  setOpenclawConfigJson: (json: string) => void;
  resetOpenclawConfigJson: () => void;
};

export function useVirtualOpenclawConfig(): VirtualOpenclawConfigApi {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<VirtualOpenclawConfigPrefsV1>(() => ({
    version: 1,
    openclawConfigJson: "",
  }));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadVirtualOpenclawConfigPrefs();
      if (!cancelled) {
        setPrefs(loaded);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setOpenclawConfigJson = useCallback((json: string) => {
    setPrefs((p) => {
      const next = { ...p, openclawConfigJson: json };
      void saveVirtualOpenclawConfigPrefs(next);
      return next;
    });
  }, []);

  const resetOpenclawConfigJson = useCallback(() => {
    setPrefs((p) => {
      const next = { ...p, openclawConfigJson: "" };
      void saveVirtualOpenclawConfigPrefs(next);
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      ready,
      prefs,
      setOpenclawConfigJson,
      resetOpenclawConfigJson,
    }),
    [ready, prefs, setOpenclawConfigJson, resetOpenclawConfigJson]
  );
}
