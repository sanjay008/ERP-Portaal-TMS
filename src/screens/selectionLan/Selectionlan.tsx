import { GlobalContextData } from "@/src/context/GlobalContext";
import { persistLanguageSelection } from "@/src/utils/languagePreference";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import SelectDropdown from "react-native-select-dropdown";
import apiConstants from "../../api/apiConstants";
import { Images } from "../../assets/images";
import ButtonComponent from "../../components/buttonComponent";
import ApiService from "../../utils/Apiservice";
import { Colors } from "../../utils/colors";
import { FONTS, getData } from "../../utils/storeData";
import i18n from "../Translation/i18n";

type RootStackParamList = {
  OnBoarding: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "OnBoarding"
>;

interface LanguageItem {
  language_name: string;
  language_shortname: string;
}

const SelectLanguage: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp | any>();
  const { setSelectLanguage } = useContext(GlobalContextData);
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  const [isLanguageValid, setIsLanguageValid] = useState<boolean>(true);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);

  const fetchLanguages = async () => {
    try {
      const data = await ApiService(apiConstants.langauge, {});
      if (data?.status && Array.isArray(data.data)) {
        setLanguages(data.data);
      }
    } catch (err) {
      console.log("Error fetching languages:", err);
    }
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  const selectedLanguageItem = useMemo(
    () =>
      languages.find((item) => item.language_shortname === currentLanguage) ||
      null,
    [languages, currentLanguage],
  );

  const handleLanguageSelect = async (item: LanguageItem) => {
    const code = item?.language_shortname;
    if (!code) return;
    setCurrentLanguage(code);
    setIsLanguageValid(true);
    try {
      await i18n.changeLanguage(code);
    } catch (err) {
      console.log("Language preview error:", err);
    }
  };

  const handleEnter = async () => {
    const isKnown =
      !!currentLanguage &&
      languages.some((item) => item.language_shortname === currentLanguage);

    if (!isKnown) {
      setIsLanguageValid(false);
      Alert.alert(t("Validation Issue"), t("Please select a language"));
      return;
    }

    try {
      const code = await persistLanguageSelection(currentLanguage);
      setSelectLanguage(code);
      await i18n.changeLanguage(code);

      const data = await getData("USERDATA");
      if (data) {
        navigation.navigate("BottomTabs");
      } else {
        navigation.navigate("OnBoarding");
      }
    } catch (err) {
      console.log("Language persist error:", err);
      setIsLanguageValid(false);
      Alert.alert(t("Validation Issue"), t("Please select a language"));
    }
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={styles.logoContainer}>
        <Image source={Images.roundlogo} style={styles.logo} />
      </View>

      <Text style={styles.title}>
        {t("Select Language")}
        <Text style={styles.required}>*</Text>
      </Text>

      <SelectDropdown
        data={languages || []}
        onSelect={handleLanguageSelect}
        renderButton={() => (
          <View
            style={[
              styles.dropdownButtonStyle,
              !isLanguageValid && styles.invalidInput,
            ]}
          >
            <Text style={styles.dropdownButtonTxtStyle}>
              {selectedLanguageItem
                ? selectedLanguageItem.language_name
                : t("Select Language")}
            </Text>
            <Image
              source={Images.down}
              style={{ height: 20, width: 20, tintColor: Colors.black }}
            />
          </View>
        )}
        renderItem={(
          item: LanguageItem,
          index: number,
          isSelected: boolean,
        ) => (
          <View
            style={[
              styles.dropdownItemStyle,
              isSelected && { backgroundColor: Colors.white },
            ]}
          >
            <Text style={styles.dropdownItemTxtStyle}>
              {item.language_name}
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        dropdownStyle={styles.dropdownMenuStyle}
      />

      <View style={styles.submitButtonContainer}>
        <ButtonComponent
          onPress={handleEnter}
          marginTop={RFValue(15)}
          width={"100%"}
          title={t("Enter")}
        />
      </View>
    </View>
  );
};

export default SelectLanguage;

const styles = StyleSheet.create({
  dropdownButtonStyle: {
    height: RFValue(40),
    borderWidth: 1,
    borderColor: Colors.litegray,
    width: "100%",
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: RFValue(5),
  },
  dropdownButtonTxtStyle: {
    flex: 1,
    fontSize: 14,
    marginLeft: "3%",
    fontFamily: FONTS.Regular,
    color: Colors.black,
  },
  dropdownMenuStyle: {
    backgroundColor: Colors.white,
    borderRadius: 8,
  },
  dropdownItemStyle: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownItemTxtStyle: {
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: Colors.black,
  },
  title: {
    fontSize: RFValue(14),
    fontFamily: FONTS.Medium,
    color: Colors.black,
    marginBottom: RFValue(5),
    marginTop: RFValue(20),
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: RFValue(80),
  },
  logo: {
    height: 200,
    width: 200,
  },
  submitButtonContainer: {
    marginTop: 30,
  },
  invalidInput: {
    borderColor: Colors.red,
  },
  required: {
    color: Colors.red,
  },
});
