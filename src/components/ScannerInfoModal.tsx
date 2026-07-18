import { useNavigation } from "@react-navigation/native";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Collapsible from "react-native-collapsible";
import DashedLine from "react-native-dashed-line";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import { isDeliveryOrder } from "../utils/orderStatus";
import { FONTS, SimpleFlex, width } from "../utils/storeData";
import ConformationModal from "./ConformationModal";
import { getDirectDropboxLink } from "./DropBoxUrlGet";
import ParcelBox from "./ParcelBox";
import PickUpBox from "./PickUpBox";

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
  stopData?: number | string | null;
  NewScanText?: string;
  onNewScanPress?: () => void;
  UnloadingText?: string;
  onUnloadingPress?: () => void;
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
  OrderData = null,
  stopData = null,
  NewScanText,
  onNewScanPress,
  UnloadingText,
  onUnloadingPress,
}: Props) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [isCollapsed, setisCollapsed] = useState<boolean>(true);

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
    OrderDeliveryMapingLableOption, setOrderDeliveryMapingLableOption,
    AllDeliveyLabel, setAllDeliveyLabel,
    SelectCurrentDeliveryLabel, setSelectCurrentDeliveryLabel,
    AllDamageListReason,
    selectDamageData, setselectDamageData,

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
  const getTextColor = (bgColor: string) => {
    if (!bgColor) return "#000";

    const color = bgColor.replace("#", "");

    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // Brightness formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 128 ? "#000" : "#FFF";
  };
  // --- EFFECT: log whenever modal visibility changes ---

  const handleOptionSelect = (item: any) => {
    setSelectCurrentDeliveryLabel(item)
    // setSelectDeliveryReson(item)
    // setShowReasonList(false);
    // setShowDeliveredAtList(false);

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

  const isUnloadingMode = !!onUnloadingPress;
  const showStopData =
    GloblyTypeSlide === "driver_loading" &&
    stopData !== null &&
    stopData !== undefined &&
    stopData !== "";

  // Unauthorized / invalid-scan popup only (red backdrop from verify fail).
  // Reuse PickUpBox here — do not change PickUpBox itself or other modal types.
  const pickupOrderData =
    OrderData?.order_data ??
    (personData && !Array.isArray(personData) && personData?.id
      ? personData
      : null);
  const showUnauthorizedPickUpBox =
    bgColor === Colors.red && !!pickupOrderData;

  const firstNonEmptyItems = (...lists: any[][]) => {
    for (const list of lists) {
      if (Array.isArray(list) && list.length > 0) return list;
    }
    return [];
  };

  const resolvedProductItems = firstNonEmptyItems(
    ProductItem,
    pickupOrderData?.items,
    personData?.items,
    OrderData?.order_data?.items,
    OrderData?.items,
  );

  const unauthorizedStatusId = Number(
    pickupOrderData?.tmsstatus?.id ??
      OrderData?.order_data?.tmsstatus?.id ??
      0,
  );
  // Delivery Date / Region rows only for delivery (drop) orders — not pickup.
  const showUnauthorizedDeliveryMeta =
    showUnauthorizedPickUpBox &&
    (isDeliveryOrder(pickupOrderData) ||
      pickupOrderData?.tms_order_type === "delivery" ||
      unauthorizedStatusId === 4);
  const unauthorizedDeliverDate =
    pickupOrderData?.deliver_date ||
    personData?.deliver_date ||
    OrderData?.order_data?.deliver_date ||
    "";
  const unauthorizedRegionName =
    pickupOrderData?.delivery_region_data?.name ||
    personData?.delivery_region_data?.name ||
    pickupOrderData?.region_data?.name ||
    OrderData?.order_data?.region_data?.name ||
    OrderData?.region_data?.name ||
    "";
  const unauthorizedPostcode =
    pickupOrderData?.deliver_postcode ||
    personData?.deliver_postcode ||
    OrderData?.order_data?.deliver_postcode ||
    "";
  const unauthorizedItemData = pickupOrderData
    ? {
        ...pickupOrderData,
        items:
          resolvedProductItems.length > 0
            ? resolvedProductItems
            : pickupOrderData?.items || [],
      }
    : null;

  return (
    <>
      <View style={styles.AbsoluteWrapper}>
        <TouchableOpacity
          style={[styles.Backdrop, isUnloadingMode && styles.UnloadingBackdrop]}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.container, style, bgColor && { backgroundColor: bgColor }]}>
          <View
            style={[
              styles.ContentView,
              showUnauthorizedPickUpBox && styles.ContentViewUnauthorized,
            ]}
          >
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.InfoContainer}>
                <Text style={[styles.Text, { fontSize: 18, color: OrderData?.region_data?.tmsstatus?.color || Colors.primary, textAlign: 'center' }]}>
                  {getTitle()}
                </Text>
              </View>


              {!showReasonList && !showDeliveredAtList && (
                showUnauthorizedPickUpBox ? (
                  <View style={styles.pickUpBoxWrap}>
                    <PickUpBox
                      AllisCollapsed={true}
                      downButton={true}
                      index={0}
                      LableStatus={unauthorizedItemData?.tmsstatus?.status_name}
                      OrderId={unauthorizedItemData?.id ?? OrderId}
                      ProductItem={resolvedProductItems}
                      driver_note={unauthorizedItemData?.driver_note || null}
                      LableBackground={unauthorizedItemData?.tmsstatus?.color}
                      start={unauthorizedItemData?.pickup_location}
                      end={unauthorizedItemData?.deliver_location}
                      ItemData={unauthorizedItemData}
                      additional_cost_label={unauthorizedItemData?.additional_cost_label}
                      customerData={unauthorizedItemData?.customer}
                      external_platform_data={unauthorizedItemData?.display_name}
                      external_order_id={unauthorizedItemData?.external_order_id}
                      statusData={unauthorizedItemData?.tmsstatus}
                      LacationProgress={true}
                      contact={false}
                    />

                    {showUnauthorizedDeliveryMeta && (
                      <View style={styles.unauthorizedMeta}>
                        <View style={[styles.Flex, { marginTop: 10 }]}>
                          <Text style={styles.DarkText}>{t("Delivery Date")}</Text>
                          <Text style={styles.Text}>
                            {unauthorizedDeliverDate || "-"}
                          </Text>
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
                            {[unauthorizedRegionName, unauthorizedPostcode]
                              .filter(Boolean)
                              .join(" ") || "-"}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                <View style={styles.OrderView}>
                  {showStopData && (
                    <Text style={styles.StopOrderText}>{stopData}</Text>
                  )}
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
                            personData?.display_name || ""
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

                      </>
                    )}

                </View>
                )
              )}
              {
                !showUnauthorizedPickUpBox &&
                [1, 2, 3].includes(OrderData?.order_data?.tmsstatus?.id) &&
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
                    <Text style={styles.Text}>{t("Date")}: {OrderData?.order_data?.tmsstatus?.id >= 3 ? OrderData?.order_data?.deliver_date : OrderData?.order_data?.pickup_date}</Text>
                  </View>
                  <View>
                    <Text style={[styles.Text,]}>{t("Region")}: {OrderData?.order_data?.region_data?.name}</Text>
                  </View>
                </View>
              }
              {
                delivery_btn == 1 &&
                <FlatList
                  data={AllDeliveyLabel}
                  scrollEnabled={false}
                  contentContainerStyle={styles.WhiteBox}
                  renderItem={({ item }: any) => {
                    const bgColor = item?.color || Colors.Boxgray;
                    const textColor = getTextColor(bgColor);
                    if (item?.id == 15) return
                    return (
                      <TouchableOpacity
                        onPress={() => {
                          handleOptionSelect(item)

                        }}
                        activeOpacity={0.85}
                        style={[
                          styles.LabelBtn,
                          {
                            backgroundColor: bgColor,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.Text, {
                            color: textColor,
                          },]}
                        >
                          {t(item?.title)}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              }

              {showReasonList && (
                <View style={styles.optionContainer}>
                  {OrderDeliveryMapingLableOption?.not_delivery?.map((item: any) => (
                    <TouchableOpacity key={item.id} style={styles.ReasonButton} onPress={() => handleOptionSelect(item)}>
                      <Text style={styles.ReasonText}>{t(item.title)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

              {!showReasonList && !showDeliveredAtList && (() => {
                const showCancel =
                  delivery_btn == 0 || (delivery_btn == 1 && !!onClose);
                const showApiButton = delivery_btn == 0 && !!RText;
                const showNewScan = !!onNewScanPress;
                const showUnloading = !!onUnloadingPress;

                const cancelLabel =
                  delivery_btn == 1 ? t("Cancel") : LText ? t(LText) : t("Cancel");
                const onCancelPress =
                  delivery_btn == 1
                    ? onClose
                    : () => {
                      if (LText === t("No delivery")) setShowReasonList(true);
                      else onClose?.();
                    };

                const topButtons: {
                  key: string;
                  label: string;
                  onPress?: () => void;
                }[] = [];

                if (showApiButton) {
                  topButtons.push({
                    key: "api",
                    label: t(RText!),
                    onPress: () => onPress?.(),
                  });
                }
                if (showUnloading) {
                  topButtons.push({
                    key: "unloading",
                    label: UnloadingText || t("Unloading"),
                    onPress: onUnloadingPress,
                  });
                }

                const hasBottomRow = showCancel || showNewScan;
                const bottomButtonCount =
                  (showCancel ? 1 : 0) + (showNewScan ? 1 : 0);
                const totalButtons = topButtons.length + bottomButtonCount;

                if (totalButtons === 0) return null;

                const renderPrimaryButton = (
                  btn: (typeof topButtons)[number],
                  centered = false,
                ) => (
                  <TouchableOpacity
                    key={btn.key}
                    style={[
                      styles.ButtonBase,
                      centered ? styles.ButtonSingle : styles.ButtonFullWidth,
                      btn.key === 'unloading' ? styles.UnloadingButton : styles.ButtonPrimary,
                    ]}
                    onPress={btn.onPress}
                  >
                    <Text style={[styles.Text, styles.PrimaryButtonText]}>
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                );

                if (totalButtons === 1) {
                  if (topButtons.length === 1) {
                    return (
                      <View style={styles.LastButtonContainer}>
                        <View style={styles.FooterCenter}>
                          {renderPrimaryButton(topButtons[0], true)}
                        </View>
                      </View>
                    );
                  }
                  if (!NewScanText && !showCancel) {
                    return null
                  }
                  return (
                    <View style={styles.LastButtonContainer}>
                      <View style={styles.FooterCenter}>
                        {showCancel ? (
                          <TouchableOpacity
                            style={[
                              styles.ButtonBase,
                              styles.ButtonSingle,
                              LButtonStyle,
                            ]}
                            onPress={onCancelPress}
                          >
                            <Text style={styles.Text}>{cancelLabel}</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.ButtonBase,
                              styles.ButtonSingle,
                              LButtonStyle,
                            ]}
                            onPress={onNewScanPress}
                          >
                            <Text style={styles.Text}>
                              {NewScanText || t("New scan")}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                }

                return (
                  <View style={styles.LastButtonContainer}>
                    {topButtons.map((btn) => renderPrimaryButton(btn))}

                    {hasBottomRow ? (
                      <View style={styles.FooterRow}>
                        {showCancel ? (
                          <TouchableOpacity
                            style={[
                              styles.ButtonBase,
                              styles.ButtonHalf,
                              LButtonStyle,
                            ]}
                            onPress={onCancelPress}
                          >
                            <Text style={styles.Text}>{cancelLabel}</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.ButtonHalfSpacer} />
                        )}

                        {showNewScan ? (
                          <TouchableOpacity
                            style={[
                              styles.ButtonBase,
                              styles.ButtonHalf,
                              LButtonStyle,
                            ]}
                            onPress={onNewScanPress}
                          >
                            <Text style={styles.Text}>
                              {NewScanText || t("New scan")}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.ButtonHalfSpacer} />
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })()}
          </View>
        </View>
      </View>

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


const styles = StyleSheet.create({
  AbsoluteWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    justifyContent: "center",
    alignItems: "center",
  },
  WhiteBox: {
    alignSelf: "center"
  },
  LabelBtn: {
    width: width * 0.8,
    marginVertical: 5,
    height: 50,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center"
  },
  DamageListContainer: {
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  DamageRow: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginBottom: 10,
  },
  Backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  UnloadingBackdrop: {
    backgroundColor: Colors.red,
  },
  UnloadingButton: {
    backgroundColor: Colors.red,
  },
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", margin: 0, padding: 15 },
  ContentView: {
    width: width * 0.9,
    maxHeight: Dimensions.get("window").height * 0.82,
    backgroundColor: Colors.white,
    borderRadius: 7,
    overflow: "hidden",
  },
  ContentViewUnauthorized: {
    maxHeight: Dimensions.get("window").height * 0.92,
    width: width * 0.94,
  },
  modalScroll: { flexGrow: 1, flexShrink: 1 },
  modalScrollContent: { flexGrow: 1, paddingBottom: 8 },
  InfoContainer: { padding: 15 },
  Text: { fontSize: 15, fontFamily: FONTS.SemiBold, color: Colors.black },
  StopOrderText: {
    fontSize: 28,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    textAlign: "center",
    marginBottom: 8,
  },
  TopContainer: { flexDirection: "row", gap: 15, alignItems: "center" },
  NumberBox: { width: 40, height: 40, backgroundColor: Colors.Boxgray, borderRadius: 4, justifyContent: "center", alignItems: "center" },
  OrderIdText: { fontSize: 13, color: Colors.orderdark, fontFamily: FONTS.Medium },
  Flex: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  OrderView: { backgroundColor: Colors.background, padding: 15 },
  pickUpBoxWrap: {
    paddingHorizontal: 10,
    paddingBottom: 5,
    backgroundColor: Colors.background,
  },
  unauthorizedMeta: {
    paddingHorizontal: 5,
    paddingTop: 4,
    paddingBottom: 10,
  },
  TotalProductConatiner: { marginVertical: 15 },
  ContentContainerStyle: { gap: 10 },
  DarkText: { fontSize: 13, color: Colors.darkText, fontFamily: FONTS.Medium },
  DasheLine: { marginVertical: 15 },
  LastButtonContainer: {
    padding: 15,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.Boxgray,
    backgroundColor: Colors.white,
  },
  FooterCenter: { alignItems: "center", width: "100%" },
  FooterRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  ButtonBase: {
    height: 45,
    backgroundColor: Colors.background,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  ButtonHalf: {
    flex: 1,
    minWidth: 0,
  },
  ButtonHalfSpacer: {
    flex: 1,
    minWidth: 0,
  },
  ButtonSingle: { width: "60%" },
  ButtonFullWidth: { width: "100%" },
  ButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  PrimaryButtonText: {
    color: Colors.white,
  },
  Button: { width: "48%", height: 45, backgroundColor: Colors.background, borderRadius: 4, justifyContent: "center", alignItems: "center" },
  optionContainer: { padding: 20, alignItems: "center" },
  ReasonButton: { backgroundColor: "#4169E1", borderRadius: 6, paddingVertical: 12, marginVertical: 6, width: "80%", alignItems: "center" },
  ReasonText: { fontSize: 15, fontFamily: FONTS.SemiBold, color: "#fff" },
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
//     fontFamily: FONTS.SemiBold,
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
//     fontFamily: FONTS.SemiBold,
//     color: Colors.black,
//   },
//   OrderIdText: {
//     fontSize: 13,
//     color: Colors.orderdark,
//     fontFamily: FONTS.Medium,
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
//     fontFamily: FONTS.Medium,
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
