import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "react-native-localize";

import af from "../locales/af.json";
import ar from "../locales/ar.json";
import de from "../locales/de.json";
import en from "../locales/en.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import hi from "../locales/hi.json";
import id from "../locales/id.json";
import ja from "../locales/ja.json";
import ko from "../locales/ko.json";
import ru from "../locales/ru.json";
import vi from "../locales/vi.json";
import zh from "../locales/zh.json";

export const i18nInitPromise = (async () => {
    const savedLang = await AsyncStorage.getItem("appLanguage");
    const locales = Localization.getLocales();
    const defaultLang = savedLang || (locales[0]?.languageCode ?? "en");

    await i18n
        .use(initReactI18next)
        .init({
            compatibilityJSON: "v3",
            lng: defaultLang,
            fallbackLng: "en",
            resources: {
                en: { translation: en },
                hi: { translation: hi },
                ru: { translation: ru },
                af: { translation: af },
                ar: { translation: ar },
                de: { translation: de },
                es: { translation: es },
                fr: { translation: fr },
                id: { translation: id },
                ja: { translation: ja },
                ko: { translation: ko },
                vi: { translation: vi },
                zh: { translation: zh },
            },
            interpolation: { escapeValue: false },
        });
    return i18n;
})();

export default i18n;
