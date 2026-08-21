import apiConstants from "@/src/api/apiConstants";
import CommentViewBox from "@/src/components/CommentViewBox";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import Loader from "@/src/components/loading";
import LoadingModal from "@/src/components/LoadingModal";
import PickUpBox from "@/src/components/PickUpBox";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { DropboxContext } from "@/src/context/UploadProider";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
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
    const { item, order_id, type } = route?.params || {};
    const { ErrorHandle } = useErrorHandle();
    const {
        UserData,
        setToast,
        SelectActiveRegionData,
        SelectActiveDate,
        selectRegionData,
    } = useContext(GlobalContextData);
    const { } = useContext(DropboxContext);
    const [ItemsData, setItemsData] = useState(item);
    const [IsLoading, setIsLoading] = useState<boolean>(false);
    const [DataLoading, setDataLoading] = useState<boolean>(false);
    const [AllDestinationRegionData, setAllDestinationRegionData] = useState<any[]>([]);
    const [LocationDataMessage, setLocationDataMessage] = useState(null);
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
                uri: img?.shared_link ? getDirectDropboxLink(img.shared_link) : img?.uri ?? "",
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
        console.log("REQDATA",{
                    token: UserData?.user?.verify_token,
                    role: UserData?.user?.role,
                    relaties_id: UserData?.relaties?.id,
                    user_id: UserData?.user?.id,
                    order_id: order_id ?? ItemsData?.id ?? ItemsData?.order_data?.id,
                    type: type,
                },);
        
        try {
            let res = await ApiService(apiConstants.get_order_data_by_id, {
                customData: {
                    token: UserData?.user?.verify_token,
                    role: UserData?.user?.role,
                    relaties_id: UserData?.relaties?.id,
                    user_id: UserData?.user?.id,
                    order_id: order_id ?? ItemsData?.id ?? ItemsData?.order_data?.id,
                    type: type,
                },
            });
            if (res?.status) {
                setEasyTransLink(res?.easytrans_link || null)
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

console.log("url",url);
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

                    <View style={styles.metaCard}>
                        {!!ItemsData?.created_info?.label && (
                            <Text style={styles.metaLine}>
                                <Text style={styles.metaLabel}>{t("Creation date / time")} : </Text>
                                <Text style={styles.createdInfoLabel}>
                                    {ItemsData.created_info.label}
                                </Text>
                            </Text>
                        )}

                        {ItemsData?.external_order_id!==null && (
                            <Text style={styles.metaLine}>
                                <Text style={styles.metaLabel}>{t("EasyTrans ordernr")} : </Text>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={handleOpenEasyTransOrder}
                                >
                                    <Text style={styles.metaLink}>
                                        {ItemsData?.external_order_id}
                                    </Text>
                                </TouchableOpacity>
                            </Text>
                        )}
                    </View>

                    {tmsComments.length > 0 && (
                        <View style={styles.commentsMainBox}>
                            <CommentViewBox data={tmsComments} />
                        </View>
                    )}

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
                            renderItem={({ item, index }) => {
                                const uri = item?.shared_link
                                    ? getDirectDropboxLink(item?.shared_link)
                                    : item?.uri;
                                const isVideo = isVideoUrl(uri);
                                return (
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
        gap: 15,
    },
    Image: {
        width: 100,
        height: 100,
        borderRadius: 7,
    },
    Text: {
        fontSize: 14,
        fontFamily: FONTS.SemiBold,
        color: Colors.black,
    },
    metaCard: {
        width: "100%",
        backgroundColor: Colors.white,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: Colors.Boxgray,
        padding: 15,
        gap: 10,
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
    metaValue: {
        fontSize: 14,
        fontFamily: FONTS.Regular,
        color: Colors.darkText,
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
    commentsMainBox: {
        width: "100%",
        backgroundColor: Colors.white,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: Colors.Boxgray,
        padding: 15,
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
        padding: 15
    }
});