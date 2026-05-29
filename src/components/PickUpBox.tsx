import { Image } from 'expo-image';
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import { FONTS, SimpleFlex } from "../utils/storeData";
import CustomCollapsible from "./CustomCollapsible";
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

  backOrder = false,
  defaultExpand = false,
  AllisCollapsed = null,
  downButton = false,
  external_platform_data = null,
  driver_note = null,
  additional_cost_label = null,
  ItemData
}: any) {
  const { t } = useTranslation();
  const [isCollapsed, setisCollapsed] = useState<boolean>(AllisCollapsed !== null ? AllisCollapsed : true);
  const pickup: boolean = false;
  const collapsibleRef = useRef<any>(null);
  const { setToast } = useContext(GlobalContextData);

  const getDirectDropboxLink = (sharedLink: string) => {
    if (!sharedLink) return "";

    let url = sharedLink
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("dropbox.com", "dl.dropboxusercontent.com");


    url = url.replace(/[?&](dl|raw)=\d/g, "");


    url += (url.includes("?") ? "&" : "?") + "raw=1";

    return encodeURI(url);
  };

  const WhatsaapRedirectFun = async (type: number) => {
    try {
      const phoneNumber = getPhoneNumber();

      if (!phoneNumber) {
        setToast({
          top: 45,
          text: t("Phone number not found."),
          type: "error",
          visible: true,
        });
        return;
      }

      const message = ItemData?.message || "";
      let url = "";

      const formattedNumber = phoneNumber.replace("+", "");

      if (type === 1) {
        url = `https://api.whatsapp.com/send/?phone=${formattedNumber}&type=phone_number&app_absent=0`;
      } else if (type === 2) {
        const encodedMsg = encodeURIComponent(message);

        url = `https://api.whatsapp.com/send/?phone=${formattedNumber}&text=${encodedMsg}&type=phone_number&app_absent=0`;
      } else {
        setToast({
          top: 45,
          text: t("Invalid type — please pass 1 or 2 only."),
          type: "error",
          visible: true,
        });
        return;
      }

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

  const getPhoneNumber = () => {
    let countryCode = "";
    let mobile = "";
    if (!ItemData?.external_platform) {

      if (["1", "2"].includes(ItemData?.status)) {
        countryCode = ItemData?.direct_client?.country_code || "";
        mobile = ItemData?.direct_client?.mobiel || "";
      } else if (["4"].includes(ItemData?.status)) {
        countryCode = ItemData?.customer?.country_code || "";
        mobile = ItemData?.customer?.mobiel || "";
      }
    } else {
      mobile = ItemData?.external_phone
    }


    if (!mobile) return null;


    if (countryCode && !countryCode.startsWith("+")) {
      countryCode = `+${countryCode}`;
    }

    return `${countryCode} ${mobile}`.trim();
  };

  const handleCall = async () => {
    const phoneNumber = getPhoneNumber();

    if (!phoneNumber) return;

    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch (error) {
      console.log("Call Error:", error);
    }
  };

  useEffect(() => {
    setisCollapsed(AllisCollapsed)
  }, [AllisCollapsed])
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

          <View style={{ flex: 1 }}>
            <Text style={[[styles.Text], { fontSize: customerData?.display_name?.length > 25 ? 12 : 15, flex: 1 }]} >
              {external_platform_data || ""}
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
            {t(LableStatus)}
          </Text>
        </View>
      </View>

      <View style={[styles.Flex, { marginTop: 0 }]}>
        <Text style={styles.OrderIdText}>{t("Total Parcel")}</Text>
        <View style={[SimpleFlex.Flex, { marginVertical: 5 }]}>
          <Text style={styles.Text}>{ProductItem?.length}</Text>
          {
            AllisCollapsed == null || downButton &&
            <TouchableOpacity
              style={{
                transform: [{ rotate: !isCollapsed ? "0deg" : "180deg" }],
                paddingHorizontal: 10,
                paddingVertical: 10,
                // borderWidth:1,
              }}
              onPress={() => setisCollapsed(!isCollapsed)}
            >
              <Image source={Images.down} style={{ width: 18, height: 18 }} />
            </TouchableOpacity>
          }
          {StatusIcon && (
            <Image
              source={{ uri: getDirectDropboxLink(StatusIcon), }}
              style={styles.NumberBox}
              cachePolicy="memory-disk"
              transition={200}
            />
          )}
        </View>
      </View>
      <CustomCollapsible visible={isCollapsed}>
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
                  backOrder={backOrder ? item?.item_label !== null : false}
                />
              );
            }}
          />
        </View>
      </CustomCollapsible>
      {
        driver_note &&
        <View style={styles.DriverBG}>
          <Text style={[styles.Text, { color: "#FFEA00" }]}>{driver_note || ""}</Text>
        </View>
      }
      {LacationProgress && (
        <View style={{ marginTop: 15 }}>
          <PickupPogressMap
            start={start}
            end={end}
            ItemData={ItemData}
            DeliveryLable={["4", "5"]?.includes(ItemData?.status)}
          />
        </View>
      )}

      {contact && (
        <View style={styles.Flex}>
          <Text style={styles.Text}>{t("Contact")}</Text>
          <View style={SimpleFlex.Flex}>
            <TouchableOpacity activeOpacity={0.85} onPress={handleCall}>
              <Text style={styles.Text}>{getPhoneNumber()}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => WhatsaapRedirectFun(2)}>
              <Image source={Images.WhatsApp} style={styles.Icon} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      {!!additional_cost_label && (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>
            {additional_cost_label}
          </Text>
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
  DriverBG: {
    backgroundColor: "#595959",
    padding: 5,
    borderRadius: 4

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
  labelContainer: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    alignSelf: "flex-start",
  },

  labelText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: FONTS.Medium,
    lineHeight: 20,
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
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  OrderIdText: {
    fontSize: 13,
    color: Colors.orderdark,
    fontFamily: FONTS.Medium,
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
