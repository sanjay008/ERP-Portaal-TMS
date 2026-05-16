import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import CalenderDate from "@/src/components/CalenderDate";
import CustomHeader from "@/src/components/CustomHeader";
import DropDownBox from "@/src/components/DropDownBox";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import PickUpBox from "@/src/components/PickUpBox";
import TwoTypeButton from "@/src/components/TwoTypeButton";
import Loader from "@/src/components/loading";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";

export default function FilterScreen({ navigation, route }: any) {
  const { item, Type } = route?.params || {};
  const [SlideType, setSlideType] = useState(item || Type);
  const Focused = useIsFocused();
  const {
    UserData,
    setUserData,
    Toast,
    setToast,
    AllRegion,
    setAllRegion,
    SelectCurrentDate,
    GloblyTypeSlide,
    setSelectCurrentDate,
  } = useContext(GlobalContextData);
  const [SelectDate, setSelectDate] = useState<string>("");
  const [IsLoading, setLoading] = useState<boolean>(false);
  const [AllFilterData, setAllFilterDataGet] = useState<object[]>([]);
  const { t } = useTranslation();
  const [selectRegionData, setSelectRegionData] = useState<any | null>(null);
  const [isCollapsed, setisCollapsed] = useState<boolean>(true);
  const { ErrorHandle } = useErrorHandle();
  const [ScanBTNAvailble, setScanBTNAvailble] = useState<boolean>(
    !(GloblyTypeSlide == "Pickup / Dropoff")
  );
  const [RegionOrderData, setRegionOrderData] = useState([]);

  const getFilterDataFun = useCallback(async () => {
    try {
      const payload = {
        token: UserData?.user?.verify_token,
        role: UserData?.user?.role,
        relaties_id: UserData?.relaties?.id,
        user_id: UserData?.user?.id,
        date: SelectDate,
        type: GloblyTypeSlide ?? item?.type ?? Type,
      };

      const response = await ApiService(apiConstants.getOrderByDriver, {
        customData: payload,
      });

      if (response?.status) {
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
    item?.type,
    Type,
    selectRegionData?.id,
  ]);


  useEffect(() => {
    if (UserData !== null && Focused && SelectDate) {
      getFilterDataFun();
      if (SelectDate) {
        setSelectCurrentDate(SelectDate);
      }
    }
    const currentType = Type || item?.type;
    setSlideType(currentType);
    const shouldAllowNavigation = currentType === "pickup_dropoff";
    setScanBTNAvailble(!shouldAllowNavigation);
  }, [SelectDate, UserData, Focused, Type, item]);

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
      type: GloblyTypeSlide ?? item?.type ?? Type,
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
              // ContainerStyle={{ flex: ScanBTNAvailble ? 1 / 1.05 : 1 }}
              ContainerStyle={{ flex: 1 / 1.05 }}
            />
            {/* {ScanBTNAvailble && (
              <TwoTypeButton
                onlyIcon={true}
                Icon={Images.Scan}
                style={{ width: 46, height: 46 }}
                onPress={() =>
                  navigation.navigate("Scanner", {
                    fun: getFilterDataFun,
                    type: SlideType,
                  })
                }
              />
            )} */}
            <TwoTypeButton
              onlyIcon={true}
              Icon={Images.Scan}
              style={{ width: 46, height: 46 }}
              onPress={() =>
                navigation.navigate("Scanner", {
                  fun: getFilterDataFun,
                  type: !ScanBTNAvailble ? "allow_all_order" : SlideType,
                })
              }
            />
          </View>

          {selectRegionData && AllFilterData?.length > 0 ? (
            <FlatList
              // data={[
              //   ...(selectRegionData?.pickup_orders ?? []),
              //   ...(selectRegionData?.deliver_orders ?? []),
              // ]}
              data={RegionOrderData}
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
                    LableBackground={item?.tmsstatus?.color}
                    onPress={() => {
                      if (ScanBTNAvailble) {
                        console.log("Navigation blocked");
                        return;
                      }
                      navigation.navigate("Details", { item, type: SlideType });
                    }}
                    start={item?.pickup_location}
                    end={item?.deliver_location}
                    customerData={item?.customer}
                    external_platform_data={item?.display_name}

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
      {/* <TouchableOpacity style={styles.RefreshButton} onPress={getFilterDataFun}>
        <Image source={Images.refresh} style={styles.RefreshIcon} />
      </TouchableOpacity> */}
    </SafeAreaView>
  );
}
