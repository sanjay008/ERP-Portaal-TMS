import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
import Menu, {
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import i18n from "../screens/Translation/i18n";
import { Colors } from "../utils/colors";
import { storeData } from "../utils/storeData";
export default function CustomHeader() {
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
  const { t } = useTranslation();

  const onMenuAction = async (lang: string) => {
    try {
      await storeData("userLanguage", lang);
      await i18n.changeLanguage(lang);
      setSelectLanguage(lang);
    } catch (error) {
      console.warn("Language change error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={Images.logo} style={styles.logo} resizeMode="contain" />
      <Menu>
        <MenuTrigger>
          <View style={[styles.SimpleFlex, { backgroundColor: "transparent" }]}>
            <Text
              style={[
                styles.menuText,
                {
                  backgroundColor: "transparent",
                  includeFontPadding: false,
                },
              ]}
              selectable={false}
            >
              {SelectLanguage === "en" ? "English" : "Netherlands"}
            </Text>
            <Image
              source={Images.down}
              style={{ width: 20, height: 20, tintColor: "#000" }}
              resizeMode="contain"
            />
          </View>
        </MenuTrigger>

        <MenuOptions
          customStyles={{
            optionsContainer: {
              backgroundColor: Colors.white,
              borderRadius: 8,
              paddingVertical: 5,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 5,
              elevation: 3,
            },
          }}
        >
          <MenuOption
            onSelect={() => onMenuAction("en")}
            customStyles={{
              optionWrapper: styles.option,
            }}
          >
            <Text
              style={[
                styles.optionText,
                {
                  color: SelectLanguage === "en" ? Colors.primary : "#000",
                  fontWeight: SelectLanguage === "en" ? "bold" : "normal",
                },
              ]}
            >
              {t("English")}
            </Text>
          </MenuOption>

          <MenuOption
            onSelect={() => onMenuAction("nl")}
            customStyles={{
              optionWrapper: styles.option,
            }}
          >
            <Text
              style={[
                styles.optionText,
                {
                  color: SelectLanguage === "nl" ? Colors.primary : "#000",
                  fontWeight: SelectLanguage === "nl" ? "bold" : "normal",
                },
              ]}
            >
              {t("Netherland")}
            </Text>
          </MenuOption>
        </MenuOptions>
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    elevation: 0,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: Colors.Boxgray,
  },
  logo: {
    width: 175,
    height: 40,
  },
  menuText: {
    fontSize: 16,
    color: Colors.black,
    fontFamily: "Medium",
  },
  SimpleFlex: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  option: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  optionText: {
    fontSize: 15,
    color: Colors.black,
    fontFamily: "Medium",
  },
});
