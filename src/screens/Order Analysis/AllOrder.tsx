import apiConstants from '@/src/api/apiConstants';
import { Images } from '@/src/assets/images';
import CalenderDate from '@/src/components/CalenderDate';
import CustomHeader from '@/src/components/CustomHeader';
import DropDownBox from '@/src/components/DropDownBox';
import { useErrorHandle } from '@/src/components/ErrorHandle';
import Loader from '@/src/components/loading';
import PickUpBox from '@/src/components/PickUpBox';
import SearchInput from '@/src/components/SearchInput';
import TwoTypeButton from '@/src/components/TwoTypeButton';
import { GlobalContextData } from '@/src/context/GlobalContext';
import ApiService from '@/src/utils/Apiservice';
import { Colors } from '@/src/utils/colors';
import { FONTS, width } from '@/src/utils/storeData';
import { useIsFocused } from "@react-navigation/native";
import { Image } from 'expo-image';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AllOrder({ route, navigation }: { route: any; navigation: any }) {
    const { Type } = route?.params || {};
    const {
        UserData,
        setUserData,
        Toast,
        setToast,
        GloblyTypeSlide
    } = useContext(GlobalContextData);
    const [SelectDate, setSelectDate] = useState<string>("");
    const [IsLoading, setLoading] = useState<boolean>(false);
    const [AllFilterData, setAllFilterDataGet] = useState<object[]>([]);
    const [QRcodeSearch, setQRcodeSearch] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [isCollapsed, setisCollapsed] = useState<boolean>(true);
    const { ErrorHandle } = useErrorHandle();
    const [TemopryryDataStore, setTemopryryDataStore] = useState([]);
    const [selectRegionData, setSelectRegionData] = useState<any>(null);
    const [RegionOrderData, setRegionOrderData] = useState([]);
    const [TotalCountParcel, setTotalCountParcel] = useState<{ pickup: number, dropoff: number }>({ pickup: 0, dropoff: 0 });
    const Focused = useIsFocused();
    const { t } = useTranslation();
    const getFilterDataFun = useCallback(async () => {
        try {
            const payload = {
                token: UserData?.user?.verify_token,
                role: UserData?.user?.role,
                relaties_id: UserData?.relaties?.id,
                user_id: UserData?.user?.id,
                date: SelectDate,
                type: Type ?? GloblyTypeSlide
            };

            const response = await ApiService(apiConstants.getOrderByDriver, {
                customData: payload,
            });

            console.log('Get FilterWise Data Response:', response);
            if (response?.status) {
                setTemopryryDataStore(response?.data || []);
                const newData = Array.isArray(response?.data)
                    ? response.data
                    : [];

                setAllFilterDataGet(newData);

                if (newData.length === 0) {
                    setSelectRegionData(null);
                    setRegionOrderData([]);
                    return;
                }

                const matchedRegion = newData.find(
                    (item: any) => item?.id === selectRegionData?.id,
                );

                const selectedRegion =
                    matchedRegion || newData?.[0] || null;
                setTotalCountParcel({ pickup: selectedRegion?.pickup_orders?.length || 0, dropoff: selectedRegion?.deliver_orders?.length || 0 })
                setSelectRegionData(selectedRegion);

                if (selectedRegion?.id) {
                    await RegionDetailsDataFun(selectedRegion);
                } else {
                    setRegionOrderData([]);
                }
            } else {
                setAllFilterDataGet([]);
                setSelectRegionData(null);
                setRegionOrderData([]);

                if (response?.message && response?.message !== 'No Data Found.') {
                    setToast({
                        top: 45,
                        text: response?.message || 'Something went wrong',
                        type: 'error',
                        visible: true,
                    });
                }
            }
        } catch (error: any) {
            console.error('Get FilterWise Data Error:', error);

            setAllFilterDataGet([]);
            setSelectRegionData(null);
            setRegionOrderData([]);

            setToast({
                top: 45,
                text: ErrorHandle(error)?.message || 'Something went wrong',
                type: 'error',
                visible: true,
            });
        }
    }, [
        SelectDate,
        UserData,
        GloblyTypeSlide,
        Type,
        Type,
        selectRegionData?.id,
    ]);
    const RegionDetailsDataFun = async (
        selectRegion = selectRegionData,
    ) => {
        if (!selectRegion?.id) {
            setRegionOrderData([]);
            return null;
        }

        try {
            setLoading(true);

            const payload = {
                token: UserData?.user?.verify_token,
                role: UserData?.user?.role,
                relaties_id: UserData?.relaties?.id,
                user_id: UserData?.user?.id,
                date: SelectDate,
                type: Type ?? GloblyTypeSlide,
                region_id: selectRegion?.id,
            };

            const response = await ApiService(
                apiConstants.get_tms_orders_flat_by_region,
                {
                    customData: payload,
                },
            );

            console.log('RegionDetailsDataFun', response);

            if (response?.status) {
                setRegionOrderData(
                    Array.isArray(response?.data)
                        ? response.data
                        : [],
                );
            } else {
                setRegionOrderData([]);

                if (response?.message !== 'No Data Found.') {
                    setToast({
                        top: 45,
                        text: response?.message || 'Something went wrong',
                        type: 'error',
                        visible: true,
                    });
                }
            }

            return response;
        } catch (error: any) {
            console.log('RegionDetailsDataFun Error:-', error);

            setRegionOrderData([]);

            setToast({
                top: 45,
                text: ErrorHandle(error)?.message || 'Something went wrong',
                type: 'error',
                visible: true,
            });

            return null;
        } finally {
            setLoading(false);
        }
    };

    const FilterData = useMemo(() => {
        const q = search?.trim().toLowerCase();
        if (!q) return RegionOrderData ?? [];

        const cleaned = q.startsWith('#') ? q.slice(1) : q;
        const parts = cleaned.split(/\s+/);
        const idPart = parts[0];
        const namePart = parts.slice(1).join(' ').trim();

        return (RegionOrderData ?? []).filter((item: any) => {
            const itemId = item?.id?.toString().toLowerCase() ?? '';
            const itemName = item?.display_name?.toLowerCase() ?? '';
            const itemExtId = item?.external_order_id?.toString().toLowerCase() ?? '';
            const itemPickup = item?.pickup_location?.toString().toLowerCase() ?? '';
            const itemDeliver = item?.deliver_location?.toString().toLowerCase() ?? '';

            if (namePart) {
                return itemId.includes(idPart) && itemName.includes(namePart);
            }

            return (
                itemId.includes(cleaned) ||
                itemName.includes(cleaned) ||
                itemExtId.includes(cleaned) ||
                itemPickup.includes(cleaned) ||
                itemDeliver.includes(cleaned)
            );
        });
    }, [search, RegionOrderData]);

    useEffect(() => {
        if (selectRegionData?.id) {
            const matchedRegion = TemopryryDataStore.find(
                (item: any) => item?.id === selectRegionData?.id,
            );
            setTotalCountParcel({ pickup: matchedRegion?.pickup_orders?.length || 0, dropoff: matchedRegion?.deliver_orders?.length || 0 })
        } else {
            setTotalCountParcel({ pickup: 0, dropoff: 0 });
        }
    }, [selectRegionData, RegionOrderData]);

    useEffect(() => {
        if (UserData !== null && Focused && SelectDate) {
            getFilterDataFun();
        }
    }, [SelectDate, UserData, Focused, Type]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.wrapper}>
                <View style={styles.Header}>
                    <CustomHeader />
                </View>
                <ScrollView
                    style={{ flex: 1, marginTop: -20, paddingTop: 15 }}
                    contentContainerStyle={styles.ContainerStyle}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    refreshControl={
                        <RefreshControl
                            refreshing={IsLoading}
                            onRefresh={getFilterDataFun}
                        />
                    }
                >
                    <View style={styles.Flex}>
                        <View style={{ flex: 1 / 1.05 }}>
                            <CalenderDate date={SelectDate} setDate={setSelectDate} />
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.CollPadByButton,
                                { transform: [{ rotate: !isCollapsed ? "0deg" : "180deg" }] },
                            ]}
                            onPress={() => setisCollapsed(!isCollapsed)}
                        >
                            <Image
                                source={Images.down}
                                style={styles.DownIcon}
                                tintColor={Colors.white}
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.Flex}>

                        <DropDownBox
                            data={AllFilterData}
                            value={selectRegionData}
                            setValue={setSelectRegionData}
                            labelFieldKey="name"
                            fun={(item) => RegionDetailsDataFun(item)}
                            valueFieldKey="id"
                            ContainerStyle={{ flex: 1 / 1.05 }}

                        />
                        <TwoTypeButton
                            onlyIcon={true}
                            Icon={Images.Scan}
                            style={{ width: 46, height: 46 }}
                            onPress={() =>
                                navigation.navigate("ScanDetails", { setData: setQRcodeSearch })
                            }
                        />
                    </View>
                    <SearchInput
                        value={search}
                        setValue={setSearch}
                        suggestions={RegionOrderData}
                        placeholder={t("Search by Order No, EasyTrans No, Client Name or Address") + "..."}
                        onSelect={(item) => console.log(item)}
                    />

                    <View style={styles.CountContainer}>
                        <Text style={styles.CountContainerText}>
                            {`${t("Pick")} (${TotalCountParcel.pickup}) - ${t("Drop")} (${TotalCountParcel.dropoff})`}
                        </Text>
                    </View>

                    {selectRegionData && AllFilterData?.length > 0 ? (
                        <FlatList
                            data={FilterData}
                            ListEmptyComponent={() =>
                                IsLoading ? null : (
                                    <View style={styles.FooterContainer}>
                                        <Text style={[styles.Text, { color: Colors.darkText }]}>
                                            {t("No Order Found")}
                                        </Text>
                                    </View>
                                )
                            }
                            ListFooterComponent={() => {
                                return IsLoading ? (
                                    <View style={styles.FooterContainer}>
                                        <Loader />
                                    </View>
                                ) : null;
                            }}
                            scrollEnabled={false}
                            initialNumToRender={10}
                            maxToRenderPerBatch={10}
                            windowSize={5}
                            removeClippedSubviews={true}
                            updateCellsBatchingPeriod={30}
                            getItemLayout={(data, index) => ({
                                length: 70,
                                offset: 70 * index,
                                index,
                            })}
                            contentContainerStyle={{ gap: 15 }}
                            keyExtractor={(item, index) => `${index}`}
                            renderItem={({ item, index }) => {
                                return (
                                    <PickUpBox
                                        AllisCollapsed={isCollapsed}
                                        index={index}
                                        LableStatus={item?.tmsstatus?.status_name}
                                        OrderId={item?.id}
                                        ProductItem={item?.items}
                                        driver_note={item?.driver_note || ""}
                                        LableBackground={item?.tmsstatus?.color}
                                        additional_cost_label={item?.additional_cost_label}
                                        onPress={() => navigation.navigate("OrderDetails", {
                                            item: item,
                                            order_id: item?.id,
                                            type: Type ?? GloblyTypeSlide,
                                        })}
                                        start={item?.pickup_location}
                                        end={item?.deliver_location}
                                        customerData={item?.customer}
                                        external_platform_data={item?.display_name}
                                        external_order_id={item?.external_order_id}
                                        ItemData={item}
                                        statusData={item?.tmsstatus}
                                        backOrder={true}
                                    />
                                );
                            }}
                        />
                    ) : IsLoading ? (
                        <View style={styles.FooterContainer}>
                            <Loader />
                        </View>
                    ) : (
                        <View style={styles.FooterContainer}>
                            <Text style={[styles.Text, { color: Colors.darkText }]}>
                                {t("No Order Found")}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    Header: {
        margin: -15,
        marginBottom: 20
    },
    Flex: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    Text: {
        fontSize: 14,
        color: Colors.black,
        fontFamily: FONTS.Medium,
    },
    ItemGap: {
        gap: 10,
    },
    ContainerStyle: {
        paddingBottom: 50,
    },
    FooterContainer: {
        width: "100%",
        height: width,
        justifyContent: "center",
        alignItems: "center",
    },
    RefreshButton: {
        width: 46,
        height: 46,
        backgroundColor: Colors.primary,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: '10%',
        right: '5%',
        zIndex: 999,
    },
    wrapper: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: 15,
        marginBottom: -15
    },
    RefreshIcon: {
        width: '50%',
        height: '50%',
        tintColor: Colors.white
    },
    DownIcon: {
        width: 25,
        height: 25,
    },
    CollPadByButton: {
        width: 46,
        height: 46,
        borderRadius: 7,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center'
    },
    CountContainerText: {
        color: Colors.white,
        fontFamily: FONTS.Medium,
        fontSize: 14,
    },
    CountContainer: {
        marginVertical: 15,
        backgroundColor: Colors.red,
        padding: 10,
        borderRadius: 6,
    },
});