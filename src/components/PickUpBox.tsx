import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Collapsible from "react-native-collapsible";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { SimpleFlex } from "../utils/storeData";
import ParcelBox from "./ParcelBox";
import PickupPogressMap from "./PickupPogressMap";
export default function PickUpBox({
  index = 0,
  onPress,
  contact,
  OrderId='00',
  LacationProgress = true,
  LableStatus = "Pickup",
  LableBackground = null,
  ProductItem = [],
  start,
  end,
  customerData = null,
  StatusIcon = null,
  statusData = null,
  IndexActive=true
}: any) {
  const { t } = useTranslation();
  const [isCollapsed, setisCollapsed] = useState<boolean>(true);
  const pickup: boolean = false;

 const getDirectDropboxLink = (sharedLink: string) => {
  if (!sharedLink) return "";
  
  let url = sharedLink
    .replace("www.dropbox.com", "dl.dropboxusercontent.com")
    .replace("dropbox.com", "dl.dropboxusercontent.com");
  
  url = url.replace(/[?&](dl|raw)=\d/, "");

  url += (url.includes("?") ? "&" : "?") + "raw=1";

  return url;
};



  return (
    <Pressable
      style={[styles.container, pickup && styles.BorderOrBg]}
      onPress={onPress}
    >
      <View style={[styles.Flex, { marginTop: 0 }]}>
        <View style={styles.TopContainer}>
          <View style={styles.NumberBox}>
            {
              IndexActive ?
              <Text style={[styles.Text]}>{index + 1}</Text>
              :
              <Text style={[styles.Text]}>{index}</Text>

            }
          </View>

          <View>
            <Text style={[[styles.Text], { fontSize: 15 }]} numberOfLines={2}>
              {customerData?.display_name?.slice(0, 20) || ""}
            </Text>
            <Text
              style={[styles.OrderIdText, pickup && { color: Colors.black }]}
            >
              {`#${OrderId}` || 0}
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
              textAlign:'center',
                fontSize: 14,
                color: Colors.black,
              },
            ]}
          >
            {LableStatus}
          </Text>
        </View>
      </View>

      <View style={[styles.Flex]}>
        <Text style={styles.OrderIdText}>{t("Total Parcel")}</Text>
        <View style={[SimpleFlex.Flex, { gap: 0 }]}>
          <Text style={styles.Text}>{ProductItem?.length}</Text>
          <TouchableOpacity
            style={{
              transform: [{ rotate: isCollapsed ? "0deg" : "180deg" }],
              paddingHorizontal: 5,
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
          <PickupPogressMap start={start} end={end} />
        </View>
      )}

      {contact && (
        <View style={styles.Flex}>
          <Text style={styles.Text}>{t("Contact")}</Text>
          <View style={SimpleFlex.Flex}>
            <TouchableOpacity>
              <Image source={Images.WhatsApp} style={styles.Icon} />
            </TouchableOpacity>

            <TouchableOpacity>
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
