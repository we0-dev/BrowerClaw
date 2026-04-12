import { useCallback, useEffect, useMemo, useState } from "react";
import type { VirtualOpenclawSkillsApi } from "../../hooks/useVirtualOpenclawSkills";
import { useLocale } from "../../i18n/LocaleContext";

export function OpenclawSkillsPanel({
  api,
  variant = "main",
}: {
  api: VirtualOpenclawSkillsApi;
  /** main：中间栏整页（顶栏 Tab 下）；compact：窄侧栏 */
  variant?: "main" | "compact";
}) {
  const { t } = useLocale();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [draftMd, setDraftMd] = useState<string>("");
  const [savedHint, setSavedHint] = useState<string>("");
  const [search, setSearch] = useState("");

  const row = selectedFolder
    ? api.catalog.find((r) => r.folder === selectedFolder)
    : undefined;

  useEffect(() => {
    if (!selectedFolder) {
      setDraftMd("");
      return;
    }
    setDraftMd(api.getSkillMdForFolder(selectedFolder));
    // 仅在切换所选技能时同步草稿，避免其它技能开关更新时冲掉正在编辑的内容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder]);

  const flushDraftToPrefs = useCallback(() => {
    if (!selectedFolder) return;
    const baseline = api.catalog.find((r) => r.folder === selectedFolder)?.defaultSkillMd ?? "";
    if (draftMd === baseline) {
      api.clearSkillMdOverride(selectedFolder);
    } else {
      api.setSkillMdOverride(selectedFolder, draftMd);
    }
    setSavedHint(t("skillsSavedHint"));
    window.setTimeout(() => setSavedHint(""), 2400);
  }, [api, draftMd, selectedFolder, t]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return api.catalog;
    return api.catalog.filter((r) => r.folder.toLowerCase().includes(q));
  }, [api.catalog, search]);

  if (!api.ready) {
    return (
      <div className="h-full flex items-center justify-center px-4 bg-white">
        <p className="text-sm text-zinc-500">{t("skillsLoading")}</p>
      </div>
    );
  }

  const hint = (
    <p className="text-xs text-zinc-500 leading-relaxed">
      {t("skillsHintA")}{" "}
      <code className="text-zinc-600">openclaw.json</code>{" "}
      <code className="text-zinc-600">skills.entries</code>
      {t("skillsHintB")}{" "}
      <code className="text-zinc-600">skills/&lt;name&gt;/SKILL.md</code>
      {t("skillsHintC")}
    </p>
  );

  const list = (
    <div className="min-h-0 overflow-y-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100 bg-white">
      {filteredCatalog.map((r) => {
            const on = api.isFolderEnabled(r.folder);
            return (
              <div
                key={r.folder}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 text-sm",
                  selectedFolder === r.folder ? "bg-zinc-50" : "bg-white",
                ].join(" ")}
              >
                <button
                  type="button"
                  className="flex-1 text-left font-medium text-zinc-800 truncate"
                  onClick={() => setSelectedFolder(r.folder)}
                >
                  {r.folder}
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  className={[
                    "relative h-7 w-11 shrink-0 rounded-full transition-colors",
                    on ? "bg-emerald-500" : "bg-zinc-300",
                  ].join(" ")}
                  onClick={() => api.setFolderEnabled(r.folder, !on)}
                >
                  <span
                    className={[
                      "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                      on ? "left-4" : "left-0.5",
                    ].join(" ")}
                  />
                </button>
              </div>
            );
          })}
    </div>
  );

  const editor =
    selectedFolder && row ? (
      <div className="min-h-0 flex flex-col gap-2 h-full">
        <div className="flex items-center justify-between gap-2 shrink-0">
          <span className="text-xs font-medium text-zinc-600">SKILL.md · {selectedFolder}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs px-2 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              onClick={() => {
                setDraftMd(row.defaultSkillMd);
                api.clearSkillMdOverride(selectedFolder);
                setSavedHint(t("skillsResetHint"));
                window.setTimeout(() => setSavedHint(""), 2000);
              }}
            >
              {t("skillsRestore")}
            </button>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={() => flushDraftToPrefs()}
            >
              {t("skillsSaveEdit")}
            </button>
          </div>
        </div>
        <textarea
          className="flex-1 min-h-[200px] w-full rounded-xl border border-zinc-200 p-3 text-xs font-mono text-zinc-800 resize-y focus:outline-none focus:ring-2 focus:ring-zinc-300"
          value={draftMd}
          onChange={(e) => setDraftMd(e.target.value)}
          spellCheck={false}
        />
        {savedHint ? <p className="text-xs text-emerald-600 shrink-0">{savedHint}</p> : null}
      </div>
    ) : (
      <p className="text-xs text-zinc-400">{t("skillsPickPrompt")}</p>
    );

  if (variant === "main") {
    return (
      <div className="h-full min-h-0 flex flex-col bg-zinc-50/50">
        <div className="shrink-0 px-6 pt-5 pb-4 bg-white border-b border-zinc-100">
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">{t("skillsTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("skillsSubtitle")}</p>
          <div className="mt-4 max-w-md">
            <label className="sr-only" htmlFor="skill-search">
              {t("skillsSearchLabel")}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm" aria-hidden>
                ⌕
              </span>
              <input
                id="skill-search"
                type="search"
                placeholder={t("skillsSearchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 pl-9 pr-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 px-6 py-4 flex flex-col gap-3">
          {hint}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(240px,320px)_1fr] gap-4">
            {list}
            <div className="min-h-0 flex flex-col bg-white rounded-xl border border-zinc-200 p-4">
              {editor}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 px-4 pb-4">
      {hint}
      <div className="flex-1 min-h-0 grid grid-cols-1 gap-3 overflow-hidden">
        {list}
        {editor}
      </div>
    </div>
  );
}
