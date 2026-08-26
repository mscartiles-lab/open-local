import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import pt from "./pt-BR.json";
import vi from "./vi.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "pt-BR", label: "Português (BR)" },
  { code: "fr", label: "Français" },
] as const;

export type SupportedLangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const LANG_STORAGE_KEY = "openlocal_lang";

// Detect device locale and return the best matching supported language code.
function detectLocale(): string {
  const locales = Localization.getLocales();
  for (const locale of locales) {
    const tag = locale.languageTag ?? "";
    // exact match (e.g. "pt-BR")
    if (SUPPORTED_LANGUAGES.some((l) => l.code === tag)) return tag;
    // language-only match (e.g. "pt" → "pt-BR", "es" → "es")
    const lang = tag.split("-")[0];
    const match = SUPPORTED_LANGUAGES.find((l) => l.code.split("-")[0] === lang);
    if (match) return match.code;
  }
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    vi: { translation: vi },
    "pt-BR": { translation: pt },
    fr: { translation: fr },
  },
  lng: detectLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

// Async: load persisted language preference and apply it.
AsyncStorage.getItem(LANG_STORAGE_KEY).then((saved) => {
  if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
    i18n.changeLanguage(saved);
  }
});

export async function setLanguage(code: string): Promise<void> {
  await AsyncStorage.setItem(LANG_STORAGE_KEY, code);
  await i18n.changeLanguage(code);
}

export default i18n;
