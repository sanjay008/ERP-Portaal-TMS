import apiConstants from "@/src/api/apiConstants";
import DetailsHeader from "@/src/components/DetailsHeader";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { storeData } from "@/src/utils/storeData";
import React, { useCallback, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import i18n from "../Translation/i18n";
import { styles } from "./styles";

export default function LanguageScreens() {
  const { t } = useTranslation();
  const { SelectLanguage, setSelectLanguage, AllLanguage, setAllLanguage } = useContext(GlobalContextData);
  const [IsLoading, setIsLoading] = useState<boolean>(false);

  const LanguageChangeFun = async (lang: string) => {
    try {
      await storeData("userLanguage", lang);
      await i18n.changeLanguage(lang);
      setSelectLanguage(lang);
      console.warn("lanaguge change", lang);

    } catch (error) {
      console.warn("Language change error:", error);
    }
  };
  const fetchLanguages = async () => {
    setIsLoading(true)
    try {
      const data = await ApiService(apiConstants.langauge, {});

      if (data?.status && Array.isArray(data?.data)) {
        setAllLanguage(data?.data || []);
      }
    } catch (err) {
      console.log("Error fetching languages:", err);
    }
    finally {
      setIsLoading(false);
    }
  };
  const renderItem = useCallback(({ item }: any) => {
    return (
      <Pressable
        style={styles.LanguageContainer}
        onPress={() => LanguageChangeFun(item?.language_shortname)}
      >
        <Text style={styles.Text}>{item?.language_name}</Text>

        <View
          style={[
            styles.AciverContainer,
            {
              borderColor:
                SelectLanguage === item?.language_shortname
                  ? Colors.primary
                  : Colors.languageborder,
            },
          ]}
        >
          {SelectLanguage === item?.language_shortname && (
            <View style={styles.IsActive} />
          )}
        </View>
      </Pressable>
    );
  }, [LanguageChangeFun, SelectLanguage, Colors]);

  const keyExtractor = useCallback((item: any) => item?.id?.toString(), []);
  return (
    <SafeAreaView style={styles.container}>
      <DetailsHeader title={t("Language")} />
      <View style={styles.Background}>
        <Animated.FlatList
          data={AllLanguage}
          refreshControl={
            <RefreshControl
              onRefresh={fetchLanguages}
              refreshing={IsLoading}
            />
          }
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainerStyle}
          windowSize={5}
          removeClippedSubviews={true}
          extraData={SelectLanguage}
          itemLayoutAnimation={LinearTransition}
          getItemLayout={(data, index) => ({
            length: 60,
            offset: 60 * index,
            index,
          })}
        />
      </View>
    </SafeAreaView>
  );
}
