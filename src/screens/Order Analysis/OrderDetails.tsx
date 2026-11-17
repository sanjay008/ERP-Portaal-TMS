import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import CommentViewBox from "@/src/components/CommentViewBox";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import Loader from "@/src/components/loading";
import LoadingModal from "@/src/components/LoadingModal";
import OrderSectionAccordion from "@/src/components/OrderSectionAccordion";
import PickUpBox from "@/src/components/PickUpBox";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { DropboxContext } from "@/src/context/UploadProider";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { getContrastColor } from "@/src/utils/contrastColor";
import { FONTS, SimpleFlex } from "@/src/utils/storeData";
import { StatusBar } from "expo-status-bar";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FlatList,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIVATE_TMS_COMMENT_TYPE = "Private_TMSorder";
const NORMAL_TMS_COMMENT_TYPE = "TMSorder";

const stripHtmlTags = (value: unknown): string => {
    if (value == null) return "";
    return String(value).replace(/<[^>]*>/g, "").trim();
};

const stripTimeFromDate = (value: unknown): string => {
    if (value == null) return "";
    return String(value).replace(/\s+\d{1,2}:\d{2}(?::\d{2})?\s*$/, "").trim();
};

const mapTmsCommentForView = (comment: any, isPrivate = false) => ({
    id: comment?.id,
    log_type: "item_comment",
    created_at: comment?.created_at,
    isPrivate,
    ...(isPrivate ? { display_date: stripTimeFromDate(comment?.created_at) } : {}),
    comment_text: stripHtmlTags(comment?.comment),
    user: comment?.user,
    tmsdriverdata: {
        display_name:
            comment?.user?.username ||
            comment?.user?.display_name ||
            comment?.relaties?.display_name ||
            comment?.created_by_name ||
            "",
    },
});

export default function OrderDetails({ navigation, route }: any) {
    const { item, order_id, type, qr_data } = route?.params || {};
    const { ErrorHandle } = useErrorHandle();
    const {
        UserData,
        setToast,
    } = useContext(GlobalContextData);
    useContext(DropboxContext);
    const [ItemsData, setItemsData] = useState(item);
    const [IsLoading, setIsLoading] = useState<boolean>(false);
    const [DataLoading, setDataLoading] = useState<boolean>(false);
    const { t } = useTranslation();
    const [EasyTransLink, setEasyTransLink] = useState<null | string>(null);

    const getDirectDropboxLink = (sharedLink: string) => {
        if (!sharedLink) return "";
        let url = sharedLink
            .replace("www.dropbox.com", "dl.dropboxusercontent.com")
            .replace("dropbox.com", "dl.dropboxusercontent.com");
        url = url.replace(/[?&](dl|raw)=\d/, "");
        url += (url.includes("?") ? "&" : "?") + "raw=1";
        return url;
    };

    const isVideoUrl = (url?: string): boolean => {
        if (!url) return false;
        return /\.(mp4|mov|avi|mkv|webm|3gp)(\?.*)?$/i.test(url);
    };

    const getMergedImages = (itemsData: any) => {
        if (!itemsData?.tmslogdata_itemcomment) return [];
        const backendImages = itemsData.tmslogdata_itemcomment
            .filter((el: any) => Array.isArray(el?.tmsimgdata) && el.tmsimgdata.length > 0)
            .flatMap((el: any) => el.tmsimgdata)
            .map((img: any) => ({
                ...img,
                uri: img?.shared_link ? getDirectDropboxLink(img.shared_link) : img?.uri ?? "",
                isDamage:
                    Number(img?.is_damage) === 1 ||
                    String(img?.photo_type || img?.image_type || img?.folder || img?.shared_link || "")
                        .toLowerCase()
                        .includes("damage"),
            }))
            .filter((img: any) => img.uri !== "");
        return [...backendImages];
    };

    useEffect(() => {
        if (type) {
            GetIdByOrderFun();
        }
    }, [type, order_id]);

    const GetIdByOrderFun = async () => {
        setDataLoading(true);
        try {
            let res = await ApiService(apiConstants.get_order_data_by_id, {
                customData: {
                    token: UserData?.user?.verify_token,
                    role: UserData?.user?.role,
                    relaties_id: UserData?.relaties?.id,
                    user_id: UserData?.user?.id,
                    order_id: order_id ?? ItemsData?.id ?? ItemsData?.order_data?.id,
                    type: type,
                    qr_data: JSON.stringify(qr_data),
                },
            });
            if (res?.status) {
                setEasyTransLink(res?.easytrans_link || null);
                setItemsData(res?.data);
            } else {
                setToast({
                    top: 45,
                    text: t(res?.message),
                    type: "error",
                    visible: true,
                });
            }
        } catch (error) {
            setToast({
                top: 45,
                text: ErrorHandle(error).message,
                type: "error",
                visible: true,
            });
        } finally {
            setDataLoading(false);
        }
    };

    const handleOk = () => {
        navigation.goBack();
    };

    const handleMenu = () => {
        navigation.pop(2);
    };

    const tmsComments = useMemo(() => {
        const list = ItemsData?.tmscomment;
        if (!Array.isArray(list)) return [];

        return list
            .filter(
                (comment: any) =>
                    (comment?.comment_type === NORMAL_TMS_COMMENT_TYPE ||
                        comment?.comment_type === PRIVATE_TMS_COMMENT_TYPE) &&
                    comment?.is_deleted !== 1 &&
                    !!stripHtmlTags(comment?.comment),
            )
            .map((comment: any) =>
                mapTmsCommentForView(
                    comment,
                    comment?.comment_type === PRIVATE_TMS_COMMENT_TYPE,
                ),
            );
    }, [ItemsData?.tmscomment]);

    const handleOpenEasyTransOrder = async () => {
        const url = EasyTransLink;

        if (!url) {
            setToast({
                top: 45,
                text: t("something_went_wrong"),
                type: "error",
                visible: true,
            });
            return;
        }

        try {
            await Linking.openURL(url);
        } catch (error) {
            setToast({
                top: 45,
                text: ErrorHandle(error).message,
                type: "error",
                visible: true,
            });
        }
    };

    const statusName = ItemsData?.tmsstatus?.status_name || "";
    const statusBg = ItemsData?.tmsstatus?.color || Colors.green;
    const statusFg = getContrastColor(statusBg);
    const customerEmail =
        ItemsData?.customer?.email ||
        ItemsData?.customer?.email_address ||
        ItemsData?.email ||
        "";

    const handleSendEmail = async () => {
        const email = String(customerEmail || "").trim();
        if (!email) {
            setToast({
                top: 45,
                text: t("something_went_wrong"),
                type: "error",
                visible: true,
            });
            return;
        }
        try {
            await Linking.openURL(`mailto:${email}`);
        } catch (error) {
            setToast({
                top: 45,
                text: ErrorHandle(error).message,
                type: "error",
                visible: true,
            });
        }
    };

    const emptyText = (label: string) => (
        <Text style={styles.emptySectionText}>{label}</Text>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="white" />
            <DetailsHeader title={t("Details")} Backbutton={false} />
            {DataLoading ? (
                <View style={styles.LoaderContainer}>
                    <Loader />
                </View>
            ) : (
                <ScrollView
                    style={[styles.ViewContainer, { paddingTop: 15, backgroundColor: Colors.background }]}
                    contentContainerStyle={[styles.ContainerStyle, { paddingBottom: 50 }]}
                    bounces={false}
                    overScrollMode="never"
                >
                    <View style={styles.orderHeaderCard}>
                        <View style={styles.orderHeaderTop}>
                            <Text style={styles.orderIdText}>
                                {`${t("Order ID")}: ${ItemsData?.id ?? "-"}`}
                            </Text>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                style={styles.headerIconBtn}
                                onPress={GetIdByOrderFun}
                            >
                                <Image
                                    source={Images.refresh}
                                    style={styles.headerIcon}
                                    tintColor={Colors.white}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.orderHeaderActions}>
                            {!!statusName && (
                                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                                    <Text style={[styles.statusBadgeText, { color: statusFg }]}>
                                        {t(statusName)}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.headerActionsRight}>
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    style={styles.headerIconBtn}
                                    onPress={GetIdByOrderFun}
                                >
                                    <Image
                                        source={Images.refresh}
                                        style={styles.headerIcon}
                                        tintColor={Colors.white}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    style={styles.headerIconBtn}
                                    onPress={handleMenu}
                                >
                                    <Image
                                        source={Images.menu}
                                        style={styles.headerIcon}
                                        tintColor={Colors.white}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <PickUpBox
                        AllisCollapsed={true}
                        downButton={true}
                        data={ItemsData}
                        LableStatus={ItemsData?.tmsstatus?.status_name}
                        OrderId={ItemsData?.id}
                        ProductItem={ItemsData?.items}
                        driver_note={null}
                        LableBackground={ItemsData?.tmsstatus?.color}
                        start={ItemsData?.pickup_location}
                        end={ItemsData?.deliver_location}
                        ItemData={ItemsData}
                        additional_cost_label={ItemsData?.additional_cost_label}
                        customerData={ItemsData?.customer}
                        external_platform_data={ItemsData?.display_name}
                        external_order_id={null}
                        contact={true}
                    />

                    {ItemsData?.driver_note && (
                        <View style={styles.DriverBG}>
                            <Text style={[styles.Text, { color: "#FFEA00" }]}>{ItemsData?.driver_note || ""}</Text>
                        </View>
                    )}

                    <OrderSectionAccordion
                        title={t("Dates")}
                        icon={Images.calender}
                        iconBg="#E74C3C"
                    >
                        {!!ItemsData?.created_info?.label ? (
                            <Text style={styles.metaLine}>
                                <Text style={styles.metaLabel}>{t("Creation date / time")} : </Text>
                                <Text style={styles.createdInfoLabel}>
                                    {ItemsData.created_info.label}
                                </Text>
                            </Text>
                        ) : (
                            emptyText(t("No data available"))
                        )}

                        {ItemsData?.external_order_id !== null &&
                            ItemsData?.external_order_id !== undefined && (
                                <Text style={[styles.metaLine, { marginTop: 8 }]}>
                                    <Text style={styles.metaLabel}>{t("EasyTrans ordernr")} : </Text>
                                    <Text
                                        style={styles.metaLink}
                                        onPress={handleOpenEasyTransOrder}
                                    >
                                        {ItemsData?.external_order_id}
                                    </Text>
                                </Text>
                            )}
                    </OrderSectionAccordion>

                    <OrderSectionAccordion
                        title={t("Comments")}
                        icon={Images.comment}
                        iconBg="#E67E22"
                    >
                        {tmsComments.length > 0 ? (
                            <CommentViewBox data={tmsComments} />
                        ) : (
                            emptyText(t("No comments"))
                        )}
                    </OrderSectionAccordion>

                    <OrderSectionAccordion
                        title={t("Work Activity")}
                        icon={Images.AllOrder}
                        iconBg="#F1C40F"
                    >
                        {emptyText(t("No data available"))}
                    </OrderSectionAccordion>

                    <OrderSectionAccordion
                        title={t("Products")}
                        icon={Images.Parcel}
                        iconBg="#27AE60"
                    >
                        {Array.isArray(ItemsData?.items) && ItemsData.items.length > 0
                            ? emptyText(`${t("Total Parcel")}: ${ItemsData.items.length}`)
                            : emptyText(t("No data available"))}
                    </OrderSectionAccordion>

                    <OrderSectionAccordion
                        title={t("Grand Total")}
                        icon={Images.OrderIcon}
                        iconBg="#3498DB"
                    >
                        {ItemsData?.additional_cost_label ? (
                            <Text style={styles.createdInfoLabel}>
                                {ItemsData.additional_cost_label}
                            </Text>
                        ) : (
                            emptyText(t("No data available"))
                        )}
                    </OrderSectionAccordion>

                    <OrderSectionAccordion
                        title={t("PDF Text")}
                        icon={Images.pdflogo}
                        iconBg="#9B59B6"
                    >
                        {emptyText(t("No data available"))}
                    </OrderSectionAccordion>

                    <OrderSectionAccordion
                        title={t("Send Email")}
                        icon={Images.plen}
                        iconBg="#5B6ABF"
                    >
                        {customerEmail ? (
                            <TouchableOpacity activeOpacity={0.85} onPress={handleSendEmail}>
                                <Text style={styles.metaLink}>{customerEmail}</Text>
                            </TouchableOpacity>
                        ) : (
                            emptyText(t("No data available"))
                        )}
                    </OrderSectionAccordion>

                    {getMergedImages(ItemsData)?.length > 0 && (
                        <FlatList
                            horizontal
                            style={{ flexGrow: 1, margin: -15, marginVertical: 10 }}
                            initialNumToRender={10}
                            showsHorizontalScrollIndicator={false}
                            maxToRenderPerBatch={10}
                            windowSize={5}
                            removeClippedSubviews={true}
                            updateCellsBatchingPeriod={30}
                            getItemLayout={(data, index) => ({
                                length: 70,
                                offset: 70 * index,
                                index,
                            })}
                            contentContainerStyle={{ gap: 10, paddingRight: 50, paddingLeft: 15 }}
                            data={getMergedImages(ItemsData)}
                            renderItem={({ item }) => {
                                const uri = item?.shared_link
                                    ? getDirectDropboxLink(item?.shared_link)
                                    : item?.uri;
                                const isVideo = isVideoUrl(uri);
                                return (
                                    <View style={styles.photoItem}>
                                    <View style={styles.Image}>
                                        {uri ? (
                                            isVideo ? (
                                                <View style={{ width: "100%", height: "100%", borderRadius: 7, overflow: "hidden", backgroundColor: "#000" }}>
                                                    <Image
                                                        source={{ uri }}
                                                        style={{ width: "100%", height: "100%", borderRadius: 7 }}
                                                        resizeMode="cover"
                                                    />
                                                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 7 }} />
                                                    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" }}>
                                                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.85)", justifyContent: "center", alignItems: "center" }}>
                                                            <View style={{ width: 0, height: 0, borderTopWidth: 6, borderBottomWidth: 6, borderLeftWidth: 10, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#000", marginLeft: 2 }} />
                                                        </View>
                                                    </View>
                                                    <View style={{ position: "absolute", bottom: 4, left: 5, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                                                        <Text style={{ fontSize: 8, color: "#fff", fontFamily: FONTS.Medium }}>{t("Video")}</Text>
                                                    </View>
                                                </View>
                                            ) : (
                                                <Image
                                                    source={{ uri }}
                                                    style={{ borderRadius: 7, width: "100%", height: "100%" }}
                                                    resizeMode="cover"
                                                />
                                            )
                                        ) : (
                                            <View style={{ width: "100%", height: "100%", borderRadius: 7, backgroundColor: "#ddd", justifyContent: "center", alignItems: "center" }}>
                                                <Text style={{ fontSize: 10, color: "#666" }}>{t("No Image")}</Text>
                                            </View>
                                        )}
                                    </View>
                                    {item?.isDamage ? (
                                        <Text style={styles.damageLabel}>{t("Damage")}</Text>
                                    ) : null}
                                    </View>
                                );
                            }}
                            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                        />
                    )}
                </ScrollView>
            )}
            <View style={[SimpleFlex.SpaceBetween, styles.LastButton]}>
                <TouchableOpacity activeOpacity={0.85} style={styles.OkButton} onPress={handleMenu}>
                    <Text style={styles.OkButtonText}>{t("Close")}</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} style={styles.OkButton} onPress={handleOk}>
                    <Text style={styles.OkButtonText}>{t("New Scan")}</Text>
                </TouchableOpacity>
            </View>

            <LoadingModal visible={IsLoading} message={t("Please wait…")} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    ViewContainer: {
        paddingHorizontal: 15,
        flexGrow: 1,
    },
    DriverBG: {
        backgroundColor: "#595959",
        padding: 5,
        borderRadius: 4,
    },
    LoaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    ContainerStyle: {
        gap: 12,
    },
    orderHeaderCard: {
        backgroundColor: Colors.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.Boxgray,
        padding: 12,
        gap: 12,
    },
    orderHeaderTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    orderIdText: {
        flex: 1,
        fontSize: 16,
        fontFamily: FONTS.SemiBold,
        color: Colors.black,
    },
    orderHeaderActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    headerActionsRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statusBadge: {
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        maxWidth: "48%",
    },
    statusBadgeText: {
        fontSize: 13,
        fontFamily: FONTS.SemiBold,
    },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    headerIcon: {
        width: 18,
        height: 18,
    },
    emptySectionText: {
        fontSize: 13,
        fontFamily: FONTS.Regular,
        color: Colors.darkText,
        textAlign: "center",
        paddingVertical: 4,
    },
    Image: {
        width: 100,
        height: 100,
        borderRadius: 7,
    },
    photoItem: {
        width: 100,
        alignItems: "center",
    },
    damageLabel: {
        marginTop: 4,
        fontSize: 11,
        fontFamily: FONTS.SemiBold,
        color: "#E24B4A",
        textAlign: "center",
    },
    Text: {
        fontSize: 14,
        fontFamily: FONTS.SemiBold,
        color: Colors.black,
    },
    metaLine: {
        fontSize: 14,
        lineHeight: 21,
    },
    metaLabel: {
        fontSize: 14,
        fontFamily: FONTS.SemiBold,
        color: Colors.black,
    },
    createdInfoLabel: {
        fontSize: 14,
        fontFamily: FONTS.Regular,
        color: Colors.black,
        lineHeight: 21,
    },
    metaLink: {
        fontSize: 14,
        fontFamily: FONTS.Medium,
        color: Colors.primary,
        textDecorationLine: "underline",
    },
    OkButton: {
        width: "48%",
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    OkButtonText: {
        fontSize: 16,
        fontFamily: FONTS.SemiBold,
        color: Colors.white,
    },
    LastButton: {
        padding: 15,
    },
});
