import { GlobalContextData } from "@/src/context/GlobalContext";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import SelectDropdown from "react-native-select-dropdown";
import apiConstants from "../../api/apiConstants";
import { Images } from "../../assets/images";
import ButtonComponent from "../../components/buttonComponent";
import ApiService from "../../utils/Apiservice";
import { Colors } from "../../utils/colors";
import { getData, storeData } from "../../utils/storeData";
import i18n from "../Translation/i18n";

type RootStackParamList = {
  OnBoarding: undefined;
  // Add more screens if needed
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
  const {
    GOOGLE_API_KEY,
    setGOOGLE_API_KEY,
    CompanyLogo,
    setCompanyLogo,
    Permission,
    setPermission,
    SelectLanguage,
    setSelectLanguage,
  } = useContext(GlobalContextData);
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  const [isLanguageValid, setIsLanguageValid] = useState<boolean>(true);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);

  // Fetch language list
  const fetchLanguages = async () => {
    try {
      const data = await ApiService(apiConstants.langauge, {});
      console.log("language", data);

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

  const changeLanguage = async (language_shortname: string) => {
    try {
      await storeData("userLanguage", language_shortname);
      setSelectLanguage(language_shortname);
      await i18n.changeLanguage(language_shortname);
      setCurrentLanguage(language_shortname);
    } catch (err) {
      console.log("Language change error:", err);
    }
  };

  const handleLanguageSelect = async (item: LanguageItem) => {
    setCurrentLanguage(item.language_shortname);
    await changeLanguage(item.language_shortname);
    setIsLanguageValid(true);
  };

  const handleEnter = async () => {
    if (!currentLanguage) {
      setIsLanguageValid(false);
      Alert.alert(t("Validation Error"), t("Please select a language"));
      return;
    }

    let data = await getData("USERDATA");
    if (data) {
      navigation.navigate("BottomTabs");
    } else {
      navigation.navigate("OnBoarding");
    }
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image source={Images.roundlogo} style={styles.logo} />
      </View>

      {/* Language Dropdown */}
      <Text style={styles.title}>
        {t("SelectLanguage")}
        <Text style={styles.required}>*</Text>
      </Text>

      <SelectDropdown
        data={languages || []}
        onSelect={handleLanguageSelect}
        renderButton={(selectedItem: LanguageItem | null) => (
          <View
            style={[
              styles.dropdownButtonStyle,
              !isLanguageValid && styles.invalidInput,
            ]}
          >
            <Text style={styles.dropdownButtonTxtStyle}>
              {selectedItem ? selectedItem.language_name : t("SelectLanguage")}
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
          isSelected: boolean
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

      {/* Enter Button */}
      <View style={styles.submitButtonContainer}>
        <ButtonComponent
          onPress={handleEnter}
          marginTop={RFValue(15)}
          width={"100%"}
          title={t("Enter")}
          // height={60}
        />
      </View>
    </View>
  );
};

export default SelectLanguage;

const styles = StyleSheet.create({
  dropdownButtonStyle: {
    height: RFValue(35),
    borderWidth: 1,
    borderColor: Colors.litegray,
    width: "100%",
    borderRadius: 7,
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
    fontFamily: "regular",
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
    fontFamily: "regular",
    color: Colors.black,
  },
  title: {
    fontSize: RFValue(14),
    fontFamily: "Medium",
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
