import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Collapsible from "react-native-collapsible";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import { SimpleFlex } from "../utils/storeData";
import ParcelBox from "./ParcelBox";
import PickupPogressMap from "./PickupPogressMap";
export default function PickUpBox({
  index = 0,
  onPress,
  contact,
  OrderId = "00",
  LacationProgress = true,
  LableStatus = "Pickup",
  LableBackground = null,
  ProductItem = [],
  start,
  end,
  customerData = null,
  StatusIcon = null,
  statusData = null,
  IndexActive = true,
  DeliveryLable = false,
}: any) {
  const { t } = useTranslation();
  const [isCollapsed, setisCollapsed] = useState<boolean>(true);
  const pickup: boolean = false;
  const { setToast } = useContext(GlobalContextData);
  const getDirectDropboxLink = (sharedLink: string) => {
    if (!sharedLink) return "";

    let url = sharedLink
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("dropbox.com", "dl.dropboxusercontent.com");

    url = url.replace(/[?&](dl|raw)=\d/, "");

    url += (url.includes("?") ? "&" : "?") + "raw=1";

    return url;
  };

const WhatsaapRedirectFun = async (type: number) => {
  try {
    let countryCode = customerData?.country_code || "";
    if (!countryCode.startsWith("+")) {
      countryCode = `+${countryCode}`;
    }

    const phoneNumber = `${countryCode}${customerData?.mobiel || ""}`;
    const message = t("Hello! This is a test message.");
    let url = "";

    if (type === 1) {
      url = `https://api.whatsapp.com/send/?phone=${phoneNumber.replace("+", "")}&type=phone_number&app_absent=0`;
    } else if (type === 2) {
      const encodedMsg = encodeURIComponent(message);
      url = `https://api.whatsapp.com/send/?phone=${phoneNumber.replace(
        "+",
        ""
      )}&text=${encodedMsg}&type=phone_number&app_absent=0`;
    } else {
      setToast({
        top: 45,
        text: t("Invalid type — please pass 1 or 2 only."),
        type: "error",
        visible: true,
      });
      return;
    }

    console.log(url);
    await Linking.openURL(url);
  } catch (error) {
    console.log("WhatsApp redirect error:", error);
    setToast({
      top: 45,
      text: t("Something went wrong while opening WhatsApp."),
      type: "error",
      visible: true,
    });
  }
};





  return (
    <Pressable
      style={[styles.container, pickup && styles.BorderOrBg]}
      onPress={onPress}
    >
      <View style={[styles.Flex, { marginTop: 0 }]}>
        <View style={styles.TopContainer}>
          <View style={styles.NumberBox}>
            {IndexActive ? (
              <Text style={[styles.Text]}>{index + 1}</Text>
            ) : (
              <Text style={[styles.Text]}>{index}</Text>
            )}
          </View>

          <View style={{flex:1}}>
            <Text style={[[styles.Text], { fontSize: customerData?.display_name?.length > 25 ? 12  : 15,flex:1 }]} >
              {customerData?.display_name || ""}
            <Text
              style={[styles.OrderIdText, pickup && { color: Colors.black }]}
            >
              {`\n#${OrderId}` || 0}
            </Text>
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.LabelBox,
            {
              backgroundColor: LableBackground || Colors.Boxgray,
              maxWidth: "38%",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Text
            style={[
              styles.OrderIdText,
              {
                textAlign: "center",
                fontSize: 14,
                color: Colors.black,
              },
            ]}
          >
            {LableStatus}
          </Text>
        </View>
      </View>

      <View style={[styles.Flex, { marginTop: 0 }]}>
        <Text style={styles.OrderIdText}>{t("Total Parcel")}</Text>
        <View style={[SimpleFlex.Flex, { gap: 0 }]}>
          <Text style={styles.Text}>{ProductItem?.length}</Text>
          <TouchableOpacity
            style={{
              transform: [{ rotate: isCollapsed ? "0deg" : "180deg" }],
              paddingHorizontal: 10,
              paddingVertical: 10,
              // borderWidth:1,
            }}
            onPress={() => setisCollapsed((pre) => !pre)}
          >
            <Image source={Images.down} style={{ width: 18, height: 18 }} />
          </TouchableOpacity>
          {StatusIcon && (
            <Image
              source={{ uri: getDirectDropboxLink(StatusIcon) }}
              style={styles.NumberBox}
            />
          )}
        </View>
      </View>
      <Collapsible collapsed={isCollapsed}>
        <View style={styles.TotalProductConatiner}>
          <FlatList
            data={ProductItem}
            style={{ width: "100%", gap: 10 }}
            contentContainerStyle={styles.ContentContainerStyle}
            scrollEnabled={false}
            keyExtractor={(item, index) => `${index}`}
            renderItem={({ item, index }) => {
              return (
                <ParcelBox
                  qty={item?.qty}
                  index={index}
                  data={item}
                  title={item?.tms_product_name}
                  statusData={statusData}
                  Icon={getDirectDropboxLink(item?.tmsstatus?.shared_link)}
                />
              );
            }}
          />
        </View>
      </Collapsible>
      {LacationProgress && (
        <View style={{ marginTop: 15 }}>
          <PickupPogressMap
            start={start}
            end={end}
            DeliveryLable={DeliveryLable}
          />
        </View>
      )}

      {contact && (
        <View style={styles.Flex}>
          <Text style={styles.Text}>{t("Contact")}</Text>
          <View style={SimpleFlex.Flex}>
            <TouchableOpacity onPress={() => WhatsaapRedirectFun(1)}>
              <Image source={Images.WhatsApp} style={styles.Icon} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => WhatsaapRedirectFun(2)}>
              <Image source={Images.redWhatsApp} style={styles.Icon} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* <View style={styles.Flex}>
        <Text
          style={[
            styles.OrderIdText,
            { fontSize: 14 },
            pickup && { color: Colors.black },
          ]}
        >
          {t("Pickup")}
        </Text>
        <View style={styles.NumberBox}>
          <Text style={[styles.Text]}>3</Text>
        </View>
      </View> */}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 15,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
  },
  BorderOrBg: {
    borderWidth: 1,
    borderColor: Colors.borderColor,
    backgroundColor: Colors.lightGreen,
  },
  TopContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    width: "60%",
  },
  NumberBox: {
    width: 40,
    height: 40,
    backgroundColor: Colors.Boxgray,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  Text: {
    fontSize: 14,
    fontFamily: "SemiBold",
    color: Colors.black,
  },
  OrderIdText: {
    fontSize: 13,
    color: Colors.orderdark,
    fontFamily: "Medium",
  },
  Flex: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
  },
  LabelBox: {
    padding: 10,
    borderRadius: 4,
  },
  TotalProductConatiner: {
    marginVertical: 15,
  },
  ContentContainerStyle: {
    gap: 10,
  },
  Icon: {
    width: 28,
    height: 28,
  },
});
