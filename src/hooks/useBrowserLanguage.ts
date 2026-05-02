import { useState, useEffect } from "react";

export type SupportedLang = "ko" | "en" | "ja" | "zh" | "vi";

const SUPPORTED_LANGS: SupportedLang[] = ["ko", "en", "ja", "zh", "vi"];

function detectLanguage(): SupportedLang {
  const browserLang = navigator.language?.slice(0, 2)?.toLowerCase() ?? "ko";
  return SUPPORTED_LANGS.includes(browserLang as SupportedLang)
    ? (browserLang as SupportedLang)
    : "en"; // fallback to English for unsupported languages, Korean users will get "ko"
}

export const LANG_LABELS: Record<SupportedLang, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  vi: "Tiếng Việt",
};

export function useBrowserLanguage() {
  const [lang, setLang] = useState<SupportedLang>(detectLanguage);

  const cycleLang = () => {
    setLang((prev) => {
      const idx = SUPPORTED_LANGS.indexOf(prev);
      return SUPPORTED_LANGS[(idx + 1) % SUPPORTED_LANGS.length];
    });
  };

  return { lang, setLang, cycleLang };
}
