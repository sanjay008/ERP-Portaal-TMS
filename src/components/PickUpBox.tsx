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
import { isDeliveryPhaseOrder } from "../utils/orderStatus";
import { FONTS, SimpleFlex } from "../utils/storeData";
import CustomCollapsible from "./CustomCollapsible";
import ParcelBox from "./ParcelBox";
import PickupPogressMap from "./PickupPogressMap";

const stripHtmlTags = (value: unknown): string => {
  if (value == null) return "";
  return String(value).replace(/<[^>]*>/g, "").trim();
};

function PickUpBox({
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
  ItemData,
  external_order_id = null,
  showScannerButton = false,
  onScannerPress,
  onParcelManualVerify,
}: any) {
  const { t } = useTranslation();
  const [isCollapsed, setisCollapsed] = useState<boolean>(AllisCollapsed !== null ? AllisCollapsed : true);
  const pickup: boolean = false;
  const collapsibleRef = useRef<any>(null);
  const { setToast } = useContext(GlobalContextData);
  const cleanedDriverNote = stripHtmlTags(driver_note);

  const getDirectDropboxLink = (sharedLink: string) => {
    if (!sharedLink) return "";

    let url = sharedLink
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("dropbox.com", "dl.dropboxusercontent.com");

    url = url.replace(/[?&](dl|raw)=\d/g, "");

    url += (url.includes("?") ? "&" : "?") + "raw=1";

    return encodeURI(url);
  };

  const getPhoneNumber = () => {
    const mobile = ItemData?.wa_whatsapp_number || "";
    if (!mobile) return null;
    return mobile;
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

      const message = ItemData?.driver_whatsapp_message || "";
      let url = "";

      if (type === 1) {
        url = `https://api.whatsapp.com/send/?phone=${phoneNumber}&type=phone_number&app_absent=0`;
      } else if (type === 2) {
        const encodedMsg = encodeURIComponent(message);
        url = `https://api.whatsapp.com/send/?phone=${phoneNumber}&text=${encodedMsg}&type=phone_number&app_absent=0`;
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
      setToast({
        top: 45,
        text: t("Something went wrong while opening WhatsApp."),
        type: "error",
        visible: true,
      });
    }
  };

  const handleCall = async () => {
    const phoneNumber = getPhoneNumber();
    if (!phoneNumber) return;
    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch (error) {
      // call failed
    }
  };

  useEffect(() => {
    setisCollapsed(AllisCollapsed);
  }, [AllisCollapsed]);

  return (
    <Pressable
      style={[styles.container, pickup && styles.BorderOrBg]}
      onPress={onPress}
    >
      <View style={[styles.Flex,{marginTop:0,marginBottom:10}]}>
        <Text
          style={[styles.OrderIdTextBig, pickup && { color: Colors.black }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {`#${OrderId}`}
        </Text>
        <Text
          style={[styles.OrderId, pickup && { color: Colors.black }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {ItemData?.stop_data?.sort_order}
        </Text>
      </View>
      <View style={[styles.Flex, { marginTop: 0 }]}>
        <View style={styles.TopContainer}>
          <View style={styles.NumberBox}>
            {IndexActive ? (
              <Text style={styles.Text}>{index + 1}</Text>
            ) : (
              <Text style={styles.Text}>{index}</Text>
            )}
          </View>

          <View style={styles.TopTextWrapper}>
            {!!external_platform_data && (
              <Text
                style={styles.PlatformText}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {external_platform_data}
              </Text>
            )}
            <Text
              style={[styles.OrderIdText, pickup && { color: Colors.black }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {`#${OrderId}`}
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
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {t(LableStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.matarialTab}>
        {
          ItemData?.tms_order_type == "pickup" &&
          <View style={[styles.Exchange, { backgroundColor: "#00b43c" }]}>
            <Image source={Images.UpSideArrow} style={[styles.ExChangeIcon,]} tintColor={Colors.white} />
          </View>

        }
        {
          ItemData?.tms_order_type == "delivery" &&
          <View style={[styles.Exchange, { backgroundColor: "#007bff" }]}>
            <Image source={Images.deliveryILabelcon} style={[styles.ExChangeIcon,]} tintColor={Colors.white} />
          </View>
        }
        {
          ItemData?.is_exchange == 1 &&
          <View style={styles.Exchange}>
            <Image source={Images.ExchangeIcon} style={styles.ExChangeIcon} tintColor={Colors.white} />
          </View>
        }
      </View>

      <View style={[styles.Flex, { marginTop: 0 }]}>
        <Text style={styles.OrderIdText}>{t("Total Parcel")}</Text>
        <View style={[SimpleFlex.Flex, { marginVertical: 5 }]}>
          <Text style={styles.Text}>{ProductItem?.length}</Text>
          {showScannerButton && onScannerPress && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onScannerPress}
              style={styles.scannerBtn}
            >
              <Image
                source={Images.Scan}
                style={styles.scannerIcon}
                tintColor={Colors.white}
              />
            </TouchableOpacity>
          )}
          {(AllisCollapsed == null || downButton) && (
            <TouchableOpacity
              style={{
                transform: [{ rotate: !isCollapsed ? "0deg" : "180deg" }],
                paddingHorizontal: 10,
                paddingVertical: 10,
              }}
              onPress={() => setisCollapsed(!isCollapsed)}
            >
              <Image source={Images.down} style={{ width: 18, height: 18 }} />
            </TouchableOpacity>
          )}
          {StatusIcon && (
            <Image
              source={{ uri: getDirectDropboxLink(StatusIcon) }}
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
            keyExtractor={(item, index) => String(item?.id ?? index)}
            renderItem={({ item, index }) => {
              console.log("item",item);
              
              const canManualVerify =
                Number(item?.allow_direct_scan) === 1 &&
                typeof onParcelManualVerify === 'function';

              return (
                <ParcelBox
                  qty={item?.qty}
                  index={index}
                  data={item}
                  title={item?.tms_product_name}
                  statusData={statusData}
                  Icon={getDirectDropboxLink(item?.tmsstatus?.shared_link)}
                  backOrder={backOrder ? item?.item_label !== null : false}
                  showManualVerify={canManualVerify}
                  onManualVerify={() =>
               
                    
                    onParcelManualVerify({
                      order_id: item?.tms_order_id,
                      item_id: item?.id,
                      item,
                    })}
                  
                  
                />
              );
            }}
          />
        </View>
      </CustomCollapsible>

      {!!cleanedDriverNote && (
        <View style={styles.DriverBG}>
          <Text style={[styles.Text, { color: "#FFEA00" }]}>{cleanedDriverNote}</Text>
        </View>
      )}

      {LacationProgress && (
        <View style={{ marginTop: 15 }}>
          <PickupPogressMap
            start={start}
            end={end}
            ItemData={ItemData}
            DeliveryLable={isDeliveryPhaseOrder(ItemData)}
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

      {!!external_order_id && (
        <View style={[styles.labelContainer, { width: "100%", marginTop: 10 }]}>
          <Text style={styles.labelText}>
            {t("Easytrans")} - {external_order_id}
          </Text>
        </View>
      )}

      {!!additional_cost_label && (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>{additional_cost_label}</Text>
        </View>
      )}

    </Pressable>
  );
}

export default React.memo(PickUpBox);

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
  OrderId: {
    fontSize: 18,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  OrderIdTextBig: {
    fontSize: 20,
    fontFamily: FONTS.Medium,
    color: Colors.black,
    // textAlign:"center",
    // marginBottom:10,
    // borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingBottom: 10,
    // marginBottom: 5
  },
  matarialTab: {
    marginTop: 5,
    flexDirection: "row",
    gap: 5,
    alignSelf: "flex-end"
  },
  Exchange: {
    padding: 5,
    borderRadius: 4,
    backgroundColor: Colors.exchnage,
    alignSelf: "flex-end",
  },
  ExChangeIcon: {
    width: 20,
    height: 20,
  },
  DriverBG: {
    backgroundColor: "#595959",
    padding: 5,
    borderRadius: 4,
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
    flex: 1,
    paddingRight: 8,
  },
  TopTextWrapper: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    overflow: "hidden",
  },
  PlatformText: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    flexShrink: 1,
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
  scannerBtn: {
    width: 40,
    height: 40,
    marginLeft: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerIcon: {
    width: 22,
    height: 22,
  },
});