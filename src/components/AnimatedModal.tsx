import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useParcelVerifySession } from "../context/ParcelVerifySessionContext";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";
import PickUpBox from "./PickUpBox";

const { width, height } = Dimensions.get("window");

type Props = {
    visible: boolean;
    setVisible: (val: boolean) => void;
    AllDeliveyLabel?: any[];
    setSelectCurrentDeliveryLabel?: (item: any) => void;
    AllDamageListReason?: any[];
    setselectDamageData?: (item: any) => void;
    selectDamageData?: any;
    fun?: (selectedLabel?: any) => void;
    onCancel?: () => void;
    GloblyTypeSlide?: string | null;
    ItemsData: any;
};

export default function AnimatedModal({
    visible,
    setVisible,
    AllDeliveyLabel,
    setSelectCurrentDeliveryLabel,
    AllDamageListReason,
    setselectDamageData,
    selectDamageData,
    fun,
    GloblyTypeSlide,
    onCancel,
    ItemsData,
}: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { setSessionDeliveryLabel } = useParcelVerifySession();
    const translateY = useRef(new Animated.Value(height)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const [modalMounted, setModalMounted] = React.useState(false);

    const getTextColor = (bgColor: string) => {
        if (!bgColor) return "#000";
        const color = bgColor.replace("#", "");
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? "#000" : "#FFF";
    };

    useEffect(() => {
        if (visible) {
            setModalMounted(true);
            Animated.parallel([
                Animated.timing(overlayOpacity, {
                    toValue: 1,
                    duration: 280,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 280,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 360,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(overlayOpacity, {
                    toValue: 0,
                    duration: 260,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 240,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: height,
                    duration: 300,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start(() => setModalMounted(false));
        }
    }, [visible]);

    const handleClose = () => {
        setVisible(false);
        onCancel?.();
    };

    const completeSelection = (selectedLabel?: any) => {
        fun?.(selectedLabel);
        setVisible(false);
    };

    const hasDamageList = AllDamageListReason && AllDamageListReason.length > 0;
    const hasDeliveryLabel = AllDeliveyLabel && AllDeliveyLabel.filter((i) => i?.id !== 15).length > 0;

    const handleDeliveryLabelSelect = (item: any) => {
        // Context is source of truth — always replace with latest tap.
        console.log('[AnimatedModal] select delivery label → context', {
            id: item?.id,
            title: item?.title,
        });
        setSessionDeliveryLabel(item);
        setSelectCurrentDeliveryLabel?.(item);
        if (!hasDamageList) {
            completeSelection(item);
            return;
        }
        if (selectDamageData) {
            completeSelection(item);
        }
    };

    const handleDamageSelect = (item: any) => {
        if (setselectDamageData) {
            setselectDamageData(item);
        }
    };

    useEffect(() => {
        if (!visible) return;
        if (hasDamageList && !hasDeliveryLabel && selectDamageData) {
            completeSelection();
        }
    }, [selectDamageData]);

    return (
        <Modal
            visible={modalMounted}
            transparent
            statusBarTranslucent
            animationType="none"
            onRequestClose={handleClose}
        >
            <StatusBar
                barStyle={!visible ? "light-content" : "dark-content"}
                translucent
                backgroundColor={visible ? "rgba(0,0,0,0.5)" : "transparent"}
            />

            <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="box-none">
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.screen, { opacity, transform: [{ translateY }] }]}>
                <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollContent}
                    >
                        {GloblyTypeSlide === "outbound_scan" && (
                            <View style={styles.orderBlock}>
                                <Text style={styles.orderLabel}>{t("Order")}</Text>
                                <PickUpBox
                                    AllisCollapsed={false}
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
                                    external_order_id={ItemsData?.external_order_id}
                                    contact={true}
                                />
                            </View>
                        )}

                        {hasDeliveryLabel && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{t("Delivery Label")}</Text>
                                <FlatList
                                    data={AllDeliveyLabel}
                                    keyExtractor={(item) => item.id.toString()}
                                    scrollEnabled={false}
                                    renderItem={({ item }) => {
                                        if (item?.id === 15) return null;
                                        const bgColor = item?.color || Colors.Boxgray;
                                        const textColor = getTextColor(bgColor);
                                        return (
                                            <TouchableOpacity
                                                onPress={() => handleDeliveryLabelSelect(item)}
                                                activeOpacity={0.82}
                                                style={[styles.labelBtn, { backgroundColor: bgColor }]}
                                            >
                                                <Text style={[styles.labelText, { color: Colors.white }]}>
                                                    {t(item?.title)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    screen: {
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        backgroundColor: Colors.white,
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
    },
    scrollContent: {
        paddingBottom: 16,
    },
    orderBlock: {
        marginBottom: 20,
    },
    orderLabel: {
        fontSize: 16,
        fontFamily: FONTS.SemiBold,
        color: Colors.darkText,
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: FONTS.SemiBold,
        color: Colors.darkText,
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    damageRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 2,
        marginBottom: 8,
    },
    damageText: {
        fontSize: 14,
        fontFamily: FONTS.Medium,
        flexShrink: 1,
    },
    labelBtn: {
        width: "100%",
        height: 52,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    labelText: {
        fontSize: 15,
        fontFamily: FONTS.SemiBold,
    },
});