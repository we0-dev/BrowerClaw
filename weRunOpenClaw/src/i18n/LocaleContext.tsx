import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { detectBrowserLocale, type AppLocale } from "./detectBrowserLocale";
import { getMessages, type MessageKey } from "./messages";

type LocaleContextValue = {
  locale: AppLocale;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useMemo(() => detectBrowserLocale(), []);
  const table = useMemo(() => getMessages(locale), [locale]);
  const t = useCallback((key: MessageKey) => table[key], [table]);
  const value = useMemo(() => ({ locale, t }), [locale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
