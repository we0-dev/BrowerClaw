import { useEffect, useMemo, useState } from "react";
import type { VirtualOpenclawConfigApi } from "../../hooks/useVirtualOpenclawConfig";
import { useLocale } from "../../i18n/LocaleContext";

function normalizeJsonText(text: string): string {
  return text.replace(/\s+$/g, "");
}

export function OpenclawConfigPanel({
  api,
  defaultConfigJson,
}: {
  api: VirtualOpenclawConfigApi;
  defaultConfigJson: string;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useState("");
  const [savedHint, setSavedHint] = useState("");
  const [errorHint, setErrorHint] = useState("");

  const effectiveCurrent = useMemo(
    () => api.prefs.openclawConfigJson || defaultConfigJson,
    [api.prefs.openclawConfigJson, defaultConfigJson]
  );

  useEffect(() => {
    if (!api.ready) return;
    setDraft(effectiveCurrent);
  }, [api.ready, effectiveCurrent]);

  if (!api.ready) {
    return (
      <div className="h-full flex items-center justify-center px-4 bg-white">
        <p className="text-sm text-zinc-500">{t("configLoading")}</p>
      </div>
    );
  }

  const onSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      api.resetOpenclawConfigJson();
      setSavedHint(t("configSavedBuiltin"));
      setErrorHint("");
      window.setTimeout(() => setSavedHint(""), 2200);
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      const pretty = `${JSON.stringify(parsed, null, 2)}\n`;
      api.setOpenclawConfigJson(pretty);
      setDraft(pretty);
      setSavedHint(t("configSavedCustom"));
      setErrorHint("");
      window.setTimeout(() => setSavedHint(""), 2200);
    } catch {
      setErrorHint(t("configJsonInvalid"));
      setSavedHint("");
    }
  };

  const onReset = () => {
    api.resetOpenclawConfigJson();
    setDraft(defaultConfigJson);
    setSavedHint(t("configRestoredDefault"));
    setErrorHint("");
    window.setTimeout(() => setSavedHint(""), 2000);
  };

  const changed =
    normalizeJsonText(draft) !== normalizeJsonText(effectiveCurrent);

  return (
    <div className="h-full min-h-0 flex flex-col bg-zinc-50/50">
      <div className="shrink-0 px-6 pt-5 pb-4 bg-white border-b border-zinc-100">
        <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">{t("configTitle")}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {t("configIntroA")}{" "}
          <code className="text-zinc-700">openclaw.json</code>
          {t("configIntroB")}
        </p>
      </div>
      <div className="flex-1 min-h-0 px-6 py-4 flex flex-col gap-3">
        <p className="text-xs text-zinc-500 leading-relaxed">{t("configHint")}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="text-xs px-2 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            onClick={onReset}
          >
            {t("configReset")}
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
            onClick={onSave}
            disabled={!changed}
          >
            {t("configSave")}
          </button>
        </div>
        <textarea
          className="flex-1 min-h-[280px] w-full rounded-xl border border-zinc-200 p-3 text-xs font-mono text-zinc-800 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-white"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          placeholder='{\n  "models": { ... }\n}'
        />
        {errorHint ? <p className="text-xs text-red-600">{errorHint}</p> : null}
        {savedHint ? <p className="text-xs text-emerald-600">{savedHint}</p> : null}
      </div>
    </div>
  );
}
