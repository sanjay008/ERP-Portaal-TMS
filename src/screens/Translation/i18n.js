import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import apiConstants from "../../api/apiConstants";
import ApiService from "../../utils/Apiservice";
// import { ApiService, apiConstants } from './ApiService'; // Import ApiService

const loadLanguage = async () => {
  const storedLanguage = await AsyncStorage.getItem("userLanguage");
  return storedLanguage || "nl"; // Default to 'nl' if none is found
};

export const languagedata = async () => {
  try {
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
