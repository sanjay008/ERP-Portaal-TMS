import { useNavigation } from "@react-navigation/native";
import React, { useContext, useState } from "react";
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
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import { SimpleFlex } from "../utils/storeData";
import ConformationModal from "./ConformationModal";
import { getDirectDropboxLink } from "./DropBoxUrlGet";
import ParcelBox from "./ParcelBox";

type Props = {
  style?: object;
  InfoTitle?: string;
  LButtonStyle?: object;
  RButtonStyle?: object;
  LText?: string;
  RText?: string;
  visible?: boolean;
  type?: number;
  onPress?: () => void;
  onClose?: () => void;
  personData?: object[] | any;
  OrderId?: number;
  ProductItem?: any[];
  delivery_btn?: number;
  bgColor?: string;
  OrderData?: null | any;
};

type AlertModalType = {
  visible: boolean;
  title: string;
  Description: string;
  LButtonText: string;
  RButtonText: string;
  Icon: any;
  RButtonStyle: object;
  RColor: string;
  LButtonStyle: object;
  LColor: string;
  onPress: () => void;
  RButtonIcon?: any;
  bgColor?: string | any;
};

export default function ScannerInfoModal({
  style,
  InfoTitle,
  LButtonStyle,
  RButtonStyle,
  LText,
  RText,
  visible,
  type = 0,
  onPress,
  onClose,
  personData = [],
  OrderId = 0,
  ProductItem = [],
  delivery_btn = 0,
  bgColor,
  OrderData = null
}: Props) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [isCollapsed, setisCollapsed] = useState<boolean>(true);
  console.log(OrderData);

  const [showReasonList, setShowReasonList] = useState<boolean>(false);
  const [showDeliveredAtList, setShowDeliveredAtList] = useState<boolean>(false);

  const [AlertModalOpen, setAlerModalOpen] = useState<AlertModalType>({
    visible: false,
    title: "",
    Description: "",
    LButtonText: "",
    RButtonText: "",
    Icon: null,
    RButtonStyle: {},
    RColor: Colors.white,
    LButtonStyle: {},
    LColor: Colors.black,
    onPress: () => { },
  });




  const [AllSelectImage, setAllSelectImage] = useState<any[]>([]);
  const {
    UserData,
    setUserData,
    Toast,
    setToast,
    DeliveyDataSave,
    setDeliveyDataSave,
    GloblyTypeSlide,
    setGloblyTypeSlide,
    SelectDeliveryReason, setSelectDeliveryReson,
    OrderDeliveryMapingLableOption, setOrderDeliveryMapingLableOption
  } = useContext(GlobalContextData);

  const deliveredAtOptions = [
    { id: 1, label: t("Customer") },
    { id: 2, label: t("Neighbours") },
    { id: 3, label: t("Other") },
  ];

  const reasonOptions = [
    { id: 4, label: t("Not at home") },
    { id: 5, label: t("Wrong address") },
    { id: 6, label: t("Rejected") },
  ];

  // --- EFFECT: log whenever modal visibility changes ---

  const handleOptionSelect = (item) => {
    console.log("Selected option:", item);
    setSelectDeliveryReson(item)
    setShowReasonList(false);
    setShowDeliveredAtList(false);

    setAlerModalOpen({
      visible: true,
      title: t("Camera"),
      Description: t("You have to take a picture for proof?"),
      LButtonText: t("Cancel"),
      RButtonText: t("Camera"),
      Icon: Images.UploadPhoto,
      RButtonStyle: Colors.primary,
      RColor: Colors.white,
      LButtonStyle: Colors.gray,
      LColor: Colors.black,
      onPress: () => {
        console.log("Camera modal button pressed");
        setDeliveyDataSave({
          Data: personData,
          selectReason: item,
          setData: setAllSelectImage,
        });
        navigation.navigate("Camera");
        setAlerModalOpen((prev) => ({ ...prev, visible: false }));
        // ✅ close parent AFTER navigating
        onClose?.();
      },
    });
  };


  const getTitle = () => {
    if (showReasonList) return t("Reason not Delivered");
    if (showDeliveredAtList) return t("Delivered at");
    return InfoTitle || t("Order Delivery Info");
  };

  if (!visible) return null;

  return (
    <>
      <Modal
        isVisible={visible}
        animationIn={"bounceInUp"}
        animationOut={"bounceOutDown"}
        style={[styles.container, style, bgColor && { backgroundColor: bgColor }]}
      // onModalHide={}
      >
        <View style={[styles.ContentView,]}>
          {/* --- Title --- */}
          <View style={styles.InfoContainer}>
            <Text style={[styles.Text, { fontSize: 18, color: OrderData?.region_data?.tmsstatus?.color || Colors.primary, textAlign: 'center' }]}>{getTitle()}</Text>
          </View>

          {/* --- Main Info Section --- */}
          {!showReasonList && !showDeliveredAtList && (
            <View style={styles.OrderView}>
              <View style={[styles.Flex]}>
                <View style={styles.TopContainer}>
                  <View
                    style={[
                      styles.NumberBox,
                      (type === 1 || type === 2) && { backgroundColor: Colors.green },
                    ]}
                  >
                    {type === 0 ? (
                      <Text style={styles.Text}>1</Text>
                    ) : (
                      <Image
                        source={Images.user}
                        style={{ width: 20, height: 20 }}
                        tintColor={Colors.white}
                      />
                    )}
                  </View>

                  <View>
                    <Text style={[styles.Text, { fontSize: 15 }]}>
                      {


                        personData?.pickup_person_data?.display_name || ""
                      }
                    </Text>
                    <Text style={[styles.OrderIdText, { color: Colors.orderdark }]}>
                      {`#${OrderId}`}
                    </Text>
                  </View>
                </View>



                {type === 0 && (
                  <View style={[SimpleFlex.Flex, { gap: 0 }]}>
                    <Text style={styles.Text}>{OrderData?.order_data?.items?.length}</Text>
                    <TouchableOpacity
                      style={{ transform: [{ rotate: isCollapsed ? "0deg" : "180deg" }], paddingHorizontal: 5 }}
                      onPress={() => setisCollapsed((pre) => !pre)}
                    >
                      <Image source={Images.down} style={{ width: 18, height: 18 }} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {(type === 0 ||
                type === 2) && (

                  <>
                    {/* Collapsible Section */}
                    {type === 0 && (
                      <Collapsible collapsed={isCollapsed}>
                        <View style={styles.TotalProductConatiner}>
                          <FlatList
                            data={ProductItem}
                            style={{ width: "100%", gap: 10 }}
                            contentContainerStyle={styles.ContentContainerStyle}
                            scrollEnabled={false}
                            keyExtractor={(item, index) => `${index}`}
                            renderItem={({ item, index }) => (
                              <ParcelBox
                                qty={item?.qty}
                                index={index}
                                data={item}
                                title={item?.tms_product_name}
                                Icon={getDirectDropboxLink(item?.tmsstatus?.shared_link)}
                              />
                            )}
                          />
                        </View>
                      </Collapsible>
                    )}

                    {/* Delivery Details (only when NOT Scheduled) */}
                    {OrderData?.order_data?.tmsstatus?.status_name !== "Scheduled" && (
                      <>

                        <View style={[styles.Flex, { marginTop: 15 }]}>
                          <Text style={styles.DarkText}>{t("Delivery Date")}</Text>
                          <Text style={styles.Text}>{personData?.deliver_date}</Text>
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
                          <Text style={styles.Text}>
                            {personData?.delivery_region_data?.name || ""} {personData?.deliver_postcode || ""}

                          </Text>
                        </View>
                      </>
                    )}
                  </>
                )}

            </View>
          )}
          {
            OrderData?.order_data?.tmsstatus?.status_name == "Scheduled" &&
            <View style={{ paddingHorizontal: 15, paddingVertical: 5, gap: 5 }}>
              <FlatList
                data={OrderData?.order_data?.items || []}
                style={{ width: "100%", gap: 10 }}
                contentContainerStyle={styles.ContentContainerStyle}
                scrollEnabled={false}
                keyExtractor={(item, index) => `${index}`}
                renderItem={({ item, index }) => (
                  <ParcelBox
                    qty={item?.qty}
                    index={index}
                    data={item}
                    title={item?.tms_product_name}
                    Icon={getDirectDropboxLink(item?.tmsstatus?.shared_link)}
                  />
                )}
              />
              <View>
                <Text style={styles.Text}>{t("Pickup Date")}: {OrderData?.order_data?.pickup_date}</Text>
              </View>
              <View>
                <Text style={[styles.Text,]}>{t("Pickup Region")}: {OrderData?.order_data?.region_data?.name}</Text>
              </View>
            </View>
            // pickup_date
          }
          {/* --- Reason Options --- */}
          {showReasonList && (
            <View style={styles.optionContainer}>
              {OrderDeliveryMapingLableOption?.not_delivery?.map((item: any) => (
                <TouchableOpacity key={item.id} style={styles.ReasonButton} onPress={() => handleOptionSelect(item)}>
                  <Text style={styles.ReasonText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* --- Delivered at Options --- */}
          {showDeliveredAtList && (
            <View style={styles.optionContainer}>
              {OrderDeliveryMapingLableOption?.delivery?.map((item: any) => (
                <TouchableOpacity key={item.id} style={styles.ReasonButton} onPress={() => handleOptionSelect(item)}>
                  <Text style={styles.ReasonText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* --- Footer Buttons --- */}
          {!showReasonList && !showDeliveredAtList && (
            <View style={[styles.Flex, styles.LastButtonContainer]}>
              <TouchableOpacity
                style={[styles.Button, LButtonStyle, { width: RText ? "48%" : "60%" }, !RText && { marginHorizontal: "auto" }]}
                onPress={() => { if (LText === t("No delivery")) setShowReasonList(true); else onClose?.(); }}
              >
                <Text style={styles.Text}>{LText || t("Cancel")}</Text>
              </TouchableOpacity>

              {RText && (
                <TouchableOpacity
                  style={[styles.Button, RButtonStyle]}
                  onPress={() => { if (delivery_btn === 1 && !showDeliveredAtList) setShowDeliveredAtList(true); else onPress?.(); }}
                >
                  <Text style={styles.Text}>{RText}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Modal>

      <ConformationModal
        IsVisible={AlertModalOpen.visible}
        onClose={() => setAlerModalOpen((prev) => ({ ...prev, visible: false }))}
        Title={AlertModalOpen.title}
        Icon={AlertModalOpen.Icon}
        LeftButtonText={AlertModalOpen.LButtonText}
        RightButtonText={AlertModalOpen.RButtonText}
        RightBgColor={AlertModalOpen.RButtonStyle}
        LeftBGColor={AlertModalOpen.LButtonStyle}
        RTextColor={AlertModalOpen.RColor}
        LTextColor={AlertModalOpen.LColor}
        onPress={AlertModalOpen.onPress}
        Description={AlertModalOpen.Description}
      />
    </>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", margin: 0, padding: 15 },
  ContentView: { width: "100%", backgroundColor: Colors.white, borderRadius: 7 },
  InfoContainer: { padding: 15 },
  Text: { fontSize: 15, fontFamily: "SemiBold", color: Colors.black },
  TopContainer: { flexDirection: "row", gap: 15, alignItems: "center" },
  NumberBox: { width: 40, height: 40, backgroundColor: Colors.Boxgray, borderRadius: 4, justifyContent: "center", alignItems: "center" },
  OrderIdText: { fontSize: 13, color: Colors.orderdark, fontFamily: "Medium" },
  Flex: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  OrderView: { backgroundColor: Colors.background, padding: 15 },
  TotalProductConatiner: { marginVertical: 15 },
  ContentContainerStyle: { gap: 10 },
  DarkText: { fontSize: 13, color: Colors.darkText, fontFamily: "Medium" },
  DasheLine: { marginVertical: 15 },
  LastButtonContainer: { padding: 15 },
  Button: { width: "48%", height: 45, backgroundColor: Colors.background, borderRadius: 4, justifyContent: "center", alignItems: "center" },
  optionContainer: { padding: 20, alignItems: "center" },
  ReasonButton: { backgroundColor: "#4169E1", borderRadius: 6, paddingVertical: 12, marginVertical: 6, width: "80%", alignItems: "center" },
  ReasonText: { fontSize: 15, fontFamily: "SemiBold", color: "#fff" },
});


// import { useNavigation } from "@react-navigation/native";
// import React, { useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   FlatList,
//   Image,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import Collapsible from "react-native-collapsible";
// import DashedLine from "react-native-dashed-line";
// import Modal from "react-native-modal";
// import { Images } from "../assets/images";
// import { Colors } from "../utils/colors";
// import { SimpleFlex } from "../utils/storeData";
// import { getDirectDropboxLink } from "./DropBoxUrlGet";
// import ParcelBox from "./ParcelBox";
// type Props = {
//   style?: object;
//   InfoTitle?: string;
//   LButtonStyle?: object;
//   RButtonStyle?: object;
//   LText?: string;
//   RText?: string;
//   visible?: boolean;
//   type?: number;
//   onPress?: () => void;
//   onClose?: () => void;
//   personData?: object[] | any;
//   OrderId?: number;
//   ProductItem?: any;
// };

// export default function ScannerInfoModal({
//   style,
//   InfoTitle,
//   LButtonStyle,
//   RButtonStyle,
//   LText,
//   RText,
//   visible,
//   type = 0,
//   onPress,
//   onClose,
//   personData = [],
//   OrderId = 0,
//   ProductItem = null,
// }: Props) {
//   const { t } = useTranslation();
//   const navigation = useNavigation<any>();
//   const [isCollapsed, setisCollapsed] = useState<boolean>(true);
//   const [showReasonList, setShowReasonList] = useState(false);

//   const pickup: any = false;

//   return (
//     <Modal
//       isVisible={visible}
//       animationIn={"bounceInUp"}
//       animationOut={"bounceOutDown"}
//       style={[styles.container, style]}
//     >
//       <View style={styles.ContentView}>
//         <View style={styles.InfoContainer}>
//           <Text style={styles.Text}>
//             {InfoTitle || t("Order Delivery Info")}
//           </Text>
//         </View>

//         <View style={styles.OrderView}>
//           <View style={[styles.Flex]}>
//             <View style={styles.TopContainer}>
//               <View
//                 style={[
//                   styles.NumberBox,
//                   (type == 1 || type == 2) && { backgroundColor: Colors.green },
//                 ]}
//               >
//                 {type == 0 ? (
//                   <Text style={[styles.Text]}>{1}</Text>
//                 ) : (
//                   <Image
//                     source={Images.user}
//                     style={{ width: 20, height: 20 }}
//                     tintColor={Colors.white}
//                   />
//                 )}
//               </View>

//               <View>
//                 <Text style={[[styles.Text], { fontSize: 15 }]}>
//                   {personData?.customer?.display_name || ""}
//                 </Text>
//                 <Text
//                   style={[
//                     styles.OrderIdText,
//                     pickup && { color: Colors.black },
//                   ]}
//                 >
//                   {`#${OrderId}`}
//                 </Text>
//               </View>
//             </View>

//             {type == 0 && (
//               <View style={[SimpleFlex.Flex, { gap: 0 }]}>
//                 <Text style={styles.Text}>3</Text>
//                 <TouchableOpacity
//                   style={{
//                     transform: [{ rotate: isCollapsed ? "0deg" : "180deg" }],
//                     paddingHorizontal: 5,
//                   }}
//                   onPress={() => setisCollapsed((pre) => !pre)}
//                 >
//                   <Image
//                     source={Images.down}
//                     style={{ width: 18, height: 18 }}
//                   />
//                 </TouchableOpacity>
//               </View>
//             )}
//           </View>
//           {(type == 0 || type == 2) && (
//             <>
//               {type == 0 && (
//                 <Collapsible collapsed={isCollapsed}>
//                   <View style={styles.TotalProductConatiner}>
//                     <FlatList
//                       data={ProductItem}
//                       style={{ width: "100%", gap: 10 }}
//                       contentContainerStyle={styles.ContentContainerStyle}
//                       scrollEnabled={false}
//                       keyExtractor={(item, index) => `${index}`}
//                       renderItem={({ item, index }) => {
//                         return (
//                           <ParcelBox
//                             qty={item?.qty}
//                             index={index}
//                             data={item}
//                             title={item?.tms_product_name}
//                             Icon={getDirectDropboxLink(
//                               item?.tmsstatus?.shared_link
//                             )}
//                           />
//                         );
//                       }}
//                     />
//                   </View>
//                 </Collapsible>
//               )}

//               <View style={[styles.Flex, { marginTop: 15 }]}>
//                 <Text style={styles.DarkText}>{t("Delivery Date")}</Text>
//                 <Text style={styles.Text}>{personData?.deliver_date}</Text>
//               </View>

//               <DashedLine
//                 dashLength={4}
//                 dashThickness={1}
//                 dashGap={2}
//                 dashColor={Colors.orderdark}
//                 style={styles.DasheLine}
//               />

//               <View style={styles.Flex}>
//                 <Text style={styles.DarkText}>{t("Region")}</Text>
//                 <Text style={styles.Text}>{`${
//                   personData?.delivery_region_data?.name || ""
//                 }-${personData?.deliver_postcode}`}</Text>
//               </View>
//             </>
//           )}
//         </View>

//         {(type == 1 || type == 2) && personData?.items?.length > 0 && (
//           <View style={{ padding: 10 }}>
//             <ParcelBox
//               title={personData?.items[0]?.tms_product_name || ""}
//               qty={personData?.items[0]?.qty || 0}
//               data={personData?.items[0]}
//               index={1}
//             />
//           </View>
//         )}

//         <View style={[styles.Flex, styles.LastButtonContainer]}>
//           <TouchableOpacity
//             style={[
//               styles.Button,
//               LButtonStyle,
//               { width: RText !== "" && RText ? "48%" : "60%" },
//               !(RText !== "" && RText) && { marginHorizontal: "auto" },
//             ]}
//             onPress={onClose}
//           >
//             <Text style={styles.Text}>{LText || t("Cancel")}</Text>
//           </TouchableOpacity>
//           {RText !== "" && RText && (
//             <TouchableOpacity
//               style={[styles.Button, RButtonStyle]}
//               onPress={onPress}
//             >
//               <Text style={styles.Text}>{RText || t("Ok")}</Text>
//             </TouchableOpacity>
//           )}
//         </View>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   ContentView: {
//     width: "100%",
//     backgroundColor: Colors.white,
//     borderRadius: 7,
//     // overflow:'hidden'
//   },
//   InfoContainer: {
//     padding: 15,
//   },
//   Text: {
//     fontSize: 15,
//     fontFamily: "SemiBold",
//     color: Colors.black,
//   },
//   TopContainer: {
//     flexDirection: "row",
//     gap: 15,
//     alignItems: "center",
//   },
//   NumberBox: {
//     width: 40,
//     height: 40,
//     backgroundColor: Colors.Boxgray,
//     borderRadius: 4,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   Text1: {
//     fontSize: 14,
//     fontFamily: "SemiBold",
//     color: Colors.black,
//   },
//   OrderIdText: {
//     fontSize: 13,
//     color: Colors.orderdark,
//     fontFamily: "Medium",
//   },
//   Flex: {
//     width: "100%",
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   OrderView: {
//     backgroundColor: Colors.background,
//     padding: 15,
//   },
//   TotalProductConatiner: {
//     marginVertical: 15,
//   },
//   ContentContainerStyle: {
//     gap: 10,
//   },
//   DarkText: {
//     fontSize: 13,
//     color: Colors.darkText,
//     fontFamily: "Medium",
//   },
//   DasheLine: {
//     marginVertical: 15,
//   },
//   LastButtonContainer: {
//     padding: 15,
//   },
//   Button: {
//     width: "48%",
//     height: 45,
//     backgroundColor: Colors.background,
//     borderRadius: 4,
//     justifyContent: "center",
//     alignItems: "center",
//   },
// });
