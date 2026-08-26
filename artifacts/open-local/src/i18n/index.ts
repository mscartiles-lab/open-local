import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./en.json";
import es from "./es.json";
import vi from "./vi.json";
import ptBR from "./pt-BR.json";
import fr from "./fr.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      vi: { translation: vi },
      "pt-BR": { translation: ptBR },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "es", "vi", "pt-BR", "fr"],
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "openlocal_lang",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "pt-BR", label: "Português" },
  { code: "fr", label: "Français" },
] as const;
