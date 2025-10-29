import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import CalenderDate from "@/src/components/CalenderDate";
import DropDownBox from "@/src/components/DropDownBox";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import Loader from "@/src/components/loading";
import PickUpBox from "@/src/components/PickUpBox";
import TwoTypeButton from "@/src/components/TwoTypeButton";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { getData, token } from "@/src/utils/storeData";
// import * as Updates from "expo-updates";
import { ApiFormatDate } from "@/src/components/ApiFormatDate";
import { useIsFocused } from "@react-navigation/native";
// import * as Updates from "expo-updates";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, ScrollView, Text, View } from "react-native";
import { styles } from "./style";

export default function LoadedScreens({ navigation }: any) {
  const { UserData, setUserData, Toast, setToast, AllRegion, setAllRegion } =
    useContext(GlobalContextData);
  const RefHandle = useRef(null);
  const [SelectDate, setSelectDate] = useState<string>("");
  const [selectRegionData, setSelectRegionData] = useState<any | null>(null);
  const { ErrorHandle } = useErrorHandle();
  const [AllPickUpData, setAllPickUpData] = useState<object[]>([]);
  const RenderingRef = useRef(true);
  const [IsLoading, setLoading] = useState(false);
  const { t } = useTranslation();
  const Focused = useIsFocused();
  // async function checkForUpdate() {
  //   if (!Constants.appOwnership || Constants.appOwnership === "expo") {
  //     console.log("Skipping OTA update check in development");
  //     return;
  //   }

  //   try {
  //     const update = await Updates.checkForUpdateAsync();
  //     if (update.isAvailable) {
  //       await Updates.fetchUpdateAsync();
  //       await Updates.reloadAsync();
  //     }
  //   } catch (e) {
  //     console.log("Error checking updates:", e);
  //   }
  // }

  const getUserData = async () => {
    try {
      let data = await getData("USERDATA");
      setUserData(data?.data);
    } catch (error) {
      console.log("get User Data Error:-", error);
    }
  };
  useEffect(() => {
    // checkForUpdate();
    if (!UserData) {
      getUserData();
    }
  }, []);

  useEffect(() => {
    if (RenderingRef.current) {
      RenderingRef.current = false;
      return;
    }

    if (SelectDate && UserData) {
      setAllPickUpData([]);
      setSelectRegionData("");
      GetAllPickUpDataFun();
    }
  }, [SelectDate, UserData]);

  const GetAllPickUpDataFun = async (user: any = null) => {
    // setSelectRegionData([]);
    // setAllPickUpData([]);
    setLoading(true);
    let userData = user ? user : UserData;
    try {
      let res = await ApiService(apiConstants.getOrderByDriver, {
        customData: {
          // token: userData?.user?.verify_token,
          token: token,
          role: userData?.user?.role,
          // relaties_id: userData?.relaties?.id,
          relaties_id: 1307,
          user_id: userData?.user?.id,
          date: ApiFormatDate(SelectDate),
          // date:"2025-10-23",
        },
      });

      if (Boolean(res.status)) {
        console.log("current Data", selectRegionData);

        setAllPickUpData(res?.data || []);

        if (!selectRegionData || selectRegionData === "") {
          setSelectRegionData(res?.data?.[0] || {});
        } else {
          const pre = res?.data?.find(
            (el: any) => el?.id === selectRegionData?.id
          );

          setSelectRegionData(pre || res?.data?.[0] || {});
        }
      }
    } catch (error) {
      console.log("Get All PickUpData Error:-", error);
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      scrollEnabled={AllPickUpData?.length > 0}
      nestedScrollEnabled={true}
      contentContainerStyle={styles.ContainerStyle}
    >
      <View style={styles.ItemGap} ref={RefHandle}>
        <CalenderDate date={SelectDate} setDate={setSelectDate} />
        <View style={styles.Flex}>
          <DropDownBox
            data={AllPickUpData}
            value={selectRegionData}
            setValue={setSelectRegionData}
            labelFieldKey="name"
            valueFieldKey="id"
            ContainerStyle={{ flex: 1 / 1.05 }}
            // disbled={true}
          />
          <TwoTypeButton
            onlyIcon={true}
            Icon={Images.Scan}
            style={{ width: 46, height: 46 }}
            onPress={() =>
              navigation.navigate("Scanner", { fun: GetAllPickUpDataFun })
            }
          />
        </View>

        {selectRegionData && AllPickUpData?.length > 0 ? (
          <FlatList
            data={selectRegionData?.pickup_orders || []}
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
            scrollEnabled={false}
            contentContainerStyle={{ gap: 15 }}
            keyExtractor={(item, index) => `${index}`}
            renderItem={({ item, index }) => {
              return (
                <PickUpBox
                  index={index}
                  LableStatus={item?.tmsstatus?.status_name}
                  OrderId={item?.id}
                  ProductItem={item?.items}
                  LableBackground={item?.tmsstatus?.color}
                  onPress={() => navigation.navigate("Details", { item: item })}
                  start={item?.pickup_location}
                  end={item?.deliver_location}
                  customerData={item?.customer}
                  statusData={item?.tmsstatus}
                />
              );
            }}
          />
        ) : IsLoading ? null : (
          <View style={styles.FooterContainer}>
            <Text style={[styles.Text, { color: Colors.darkText }]}>
              {t("No Order Found")}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
