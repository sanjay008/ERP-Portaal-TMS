import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import apiConstants from "../../api/apiConstants";
import ApiService from "../../utils/Apiservice";
import { hydrateApiBaseUrl } from "../../utils/apiBaseUrl";
import {
  DEFAULT_LANGUAGE,
  getStoredUserLanguage,
} from "../../utils/languagePreference";

const loadLanguage = async () => {
  try {
    const storedLanguage = await getStoredUserLanguage();
    return storedLanguage || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

export const languagedata = async () => {
  try {
    await hydrateApiBaseUrl();
    const data = await ApiService(apiConstants.langauge, {});
    if (data.status) {
      const languageData = data.data.reduce((acc, language) => {
        acc[language.language_shortname] = { translation: language.data };
        return acc;
      }, {});

      const selectedLanguage = await loadLanguage();

      i18n.use(initReactI18next).init({
        lng: selectedLanguage,
        fallbackLng: "en",
        resources: languageData,
        interpolation: { escapeValue: false },
      });
    } else {
      console.log("Invalid API response");
    }
  } catch (err) {
    console.log("Error fetching language data:", err);
  }
};

languagedata();

export default i18n;
