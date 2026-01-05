import React from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

type Props = {
  index: number;
  data: any;
  qty?: number;
  title?: string;
  Icon?: string | null;
  statusData?: any;
  backOrder?: boolean;
  onPress?: () => void;
};

export default function ParcelBox({
  index,
  data,
  qty = 0,
  title = "",
  Icon = "",
  statusData = null,
  backOrder = false,
  onPress,
}: Props) {
  const { t } = useTranslation();

  const getDirectDropboxLink = (sharedLink: string) => {
    if (!sharedLink) return "";

    let url = sharedLink
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("dropbox.com", "dl.dropboxusercontent.com");

    url = url.replace(/[?&](dl|raw)=\d/, "");

    url += (url.includes("?") ? "&" : "?") + "raw=1";

    return url;
  };

  const displayTitle =
    title.length > 70 ? title.slice(0, 67).trim() + "..." : title;

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.LeftSection}>
        <View style={styles.NumberBox}>
          <Text style={styles.Text}>{index + 1}</Text>
        </View>

        <Text
          numberOfLines={3}
          style={[
            styles.Text,
            styles.TitleText,
            { fontSize: title.length > 40 ? 12 : 13 },
          ]}
        >
          {displayTitle}
        </Text>
      </View>

      <View style={styles.RightSection}>
        {data?.tmslabel && (
          <View
            style={[
              styles.itemLable,
              { backgroundColor: data?.tmslabel?.color },
            ]}
          >
            <Image
              source={{ uri: getDirectDropboxLink(data?.tmslabel?.shared_link) }}
              style={{ width: 20, height: 20 }}
            />
          </View>
        )}

        <View
          style={[
            styles.Status,
            { backgroundColor: data?.tmsstatus?.color || Colors.background },
          ]}
        >
          <Image
            source={{
              uri: Icon || getDirectDropboxLink(data?.tmsstatus?.shared_link),
            }}
            style={styles.Icon}
            resizeMode="contain"
            tintColor={Colors.black}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    elevation: 2,
    shadowColor: Colors.gray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2.5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  LeftSection: {
    flex: 0.8,
    flexDirection: "row",
    alignItems: "center",
  },

  RightSection: {
    flex: 0.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },

  NumberBox: {
    width: 36,
    height: 36,
    backgroundColor: Colors.BtnBg,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  Text: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },

  TitleText: {
    marginLeft: 10,
    flexShrink: 1,
    flexWrap: "wrap",
  },

  LabelText: {
    fontSize: 10,
    fontFamily: FONTS.SemiBold,
    color: Colors.darkText,
    textAlign: "right",
    marginRight: 8,
  },

  Status: {
    width: 30,
    height: 30,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },

  Icon: {
    width: 18,
    height: 18,
  },

  itemLable: {
    width: 25,
    height: 25,
    backgroundColor: Colors.gray,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
});
