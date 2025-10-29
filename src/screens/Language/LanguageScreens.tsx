import DetailsHeader from "@/src/components/DetailsHeader";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { Colors } from "@/src/utils/colors";
import { storeData } from "@/src/utils/storeData";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import i18n from "../Translation/i18n";
import { styles } from "./styles";

export default function LanguageScreens() {
  const { t } = useTranslation();
  const { SelectLanguage, setSelectLanguage } = useContext(GlobalContextData);

  const LanguageChangeFun = async (lang:string) => {
    try {
      await storeData("userLanguage", lang);
      await i18n.changeLanguage(lang);
      setSelectLanguage(lang);
    } catch (error) {
      console.warn("Language change error:", error);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <DetailsHeader title={t("Language")} />
      <View style={styles.Background}>
        <Pressable style={styles.LanguageContainer} onPress={()=>LanguageChangeFun('en')}>
          <Text style={styles.Text}>English</Text>
          <View style={[styles.AciverContainer,{borderColor:SelectLanguage == 'en' ? Colors.primary : Colors.languageborder}]}>
            {SelectLanguage == "en" && <View style={styles.IsActive} />}
          </View>
        </Pressable>
        <Pressable style={styles.LanguageContainer} onPress={()=>LanguageChangeFun('nl')}>
          <Text style={styles.Text}>Dutch</Text>
          <View style={[styles.AciverContainer,{borderColor:SelectLanguage == 'nl' ? Colors.primary : Colors.languageborder}]}>
            {SelectLanguage == "nl" && <View style={styles.IsActive} />}
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
