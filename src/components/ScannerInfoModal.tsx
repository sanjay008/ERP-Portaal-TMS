import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Collapsible from "react-native-collapsible";
import DashedLine from "react-native-dashed-line";
import Modal from "react-native-modal";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { SimpleFlex } from "../utils/storeData";
import ParcelBox from "./ParcelBox";
type Props = {
  style?: object;
  InfoTitle?: string;
  data?: object;
  LButtonStyle?: object;
  RButtonStyle?: object;
  LText?: string;
  RText?: string;
};

export default function ScannerInfoModal({
  style,
  InfoTitle,
  data,
  LButtonStyle,
  RButtonStyle,
  LText,
  RText,
}: Props) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [isCollapsed, setisCollapsed] = useState<boolean>(true);
  const pickup: any = false;
  return (
    <Modal
      isVisible={true}
      animationIn={"bounceInUp"}
      animationOut={"bounceOutDown"}
      style={[styles.container, style]}
    >
      <View style={styles.ContentView}>
        <View style={styles.InfoContainer}>
          <Text style={styles.Text}>{InfoTitle || t("Order Delivery Info")}</Text>
        </View>

        
          <View style={styles.OrderView}>
            <View style={[styles.Flex]}>
              <View style={styles.TopContainer}>
                <View style={styles.NumberBox}>
                  <Text style={[styles.Text]}>{1}</Text>
                </View>

                <View>
                  <Text style={[[styles.Text], { fontSize: 15 }]}>
                    Tushar Variya
                  </Text>
                  <Text
                    style={[
                      styles.OrderIdText,
                      pickup && { color: Colors.black },
                    ]}
                  >
                    #000001
                  </Text>
                </View>
              </View>
              <View style={[SimpleFlex, { gap: 0 }]}>
                <Text style={styles.Text}>3</Text>
                <TouchableOpacity
                  style={{
                    transform: [{ rotate: isCollapsed ? "0deg" : "180deg" }],
                    paddingHorizontal: 5,
                  }}
                  onPress={() => setisCollapsed((pre) => !pre)}
                >
                  <Image
                    source={Images.down}
                    style={{ width: 18, height: 18 }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Collapsible collapsed={isCollapsed}>
              <View style={styles.TotalProductConatiner}>
                <FlatList
                  data={["", "", ""]}
                  style={{ width: "100%", gap: 10 }}
                  contentContainerStyle={styles.ContentContainerStyle}
                  scrollEnabled={false}
                  keyExtractor={(item, index) => `${index}`}
                  renderItem={({ item, index }) => {
                    return (
                      <ParcelBox
                        qty={index + 1}
                        index={index}
                        data={{ check: true }}
                      />
                    );
                  }}
                />
              </View>
            </Collapsible>

            <View style={[styles.Flex, { marginTop: 15 }]}>
              <Text style={styles.DarkText}>{t("Delivery Date")}</Text>
              <Text style={styles.Text}>{"October 14, 2025"}</Text>
            </View>

            <DashedLine
              dashLength={4}
              dashThickness={1}
              dashGap={2}
              dashColor={Colors.orderdark}
              style={styles.DasheLine}
            />

            <View style={styles.Flex}>
              <Text style={styles.DarkText}>{t("Region")}</Text>
              <Text style={styles.Text}>{"East Netherland"}</Text>
            </View>
          </View>
        

        <View style={[styles.Flex,styles.LastButtonContainer]}>
          <TouchableOpacity style={[styles.Button, LButtonStyle]}>
            <Text style={styles.Text}>{LText || t("NO")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.Button, RButtonStyle]}>
            <Text style={styles.Text}>{RText || t("Ok")}</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    
  },
  ContentView: {
    width: "100%",
    backgroundColor: Colors.white,
    borderRadius: 7,
    // overflow:'hidden'
  },
  InfoContainer: {
    padding: 15,
  },
  Text: {
    fontSize: 15,
    fontFamily: "SemiBold",
    color: Colors.black,
  },
  TopContainer: {
    flexDirection: "row",
    gap: 15,
    alignItems: "center",
  },
  NumberBox: {
    width: 40,
    height: 40,
    backgroundColor: Colors.Boxgray,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  Text1: {
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
  },
  OrderView: {
    backgroundColor: Colors.background,
    padding: 15,
  },
  TotalProductConatiner: {
    marginVertical: 15,
  },
  ContentContainerStyle: {
    gap: 10,
  },
  DarkText: {
    fontSize: 13,
    color: Colors.darkText,
    fontFamily: "Medium",
  },
  DasheLine: {
    marginVertical: 15,
  },
  LastButtonContainer:{
    padding:15
  },
  Button: {
    width: "48%",
    height: 45,
    backgroundColor: Colors.background,
    borderRadius: 4,
    justifyContent:'center',
    alignItems:'center'
  },
});
