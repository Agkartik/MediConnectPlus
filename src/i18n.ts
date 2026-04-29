import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";

const STORAGE_KEY = "mc_lang";

function getSavedLng(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "en";
  } catch {
    return "en";
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: getSavedLng(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language;
}

export default i18n;
