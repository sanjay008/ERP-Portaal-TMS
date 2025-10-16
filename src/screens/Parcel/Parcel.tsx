import apiConstants from "@/src/api/apiConstants";
import { Images } from "@/src/assets/images";
import { ApiFormatDate } from "@/src/components/ApiFormatDate";
import CalenderDate from "@/src/components/CalenderDate";
import DropDownBox from "@/src/components/DropDownBox";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import Loader from "@/src/components/loading";
import PickUpBox from "@/src/components/PickUpBox";
import TwoTypeButton from "@/src/components/TwoTypeButton";
import { GlobalContextData } from "@/src/context/GlobalContext";
import ApiService from "@/src/utils/Apiservice";
import { Colors } from "@/src/utils/colors";
import { SimpleFlex, token } from "@/src/utils/storeData";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "./styles";

export default function Parcel({ navigation }: any) {
  const [AllStatusData, setAllStatusData] = useState<object []>([]);
  const [AllData, setAllData] = useState<object []>([]);
  const [SelectDate, setSelectDate] = useState<string>("");
  const [Region, setSelectRegion] = useState<any | {}>("");
  const [ActiveTab, setActiveTab] = useState<object | any>(null);
  const { t } = useTranslation();
  const [IsLoading, setLoading] = useState<boolean>(false);
  const { UserData, setUserData, Toast, setToast } =
    useContext(GlobalContextData);

  const { ErrorHandle } = useErrorHandle();

  const GetAllPickUpDataFun = async (status:any = null) => {
    setLoading(true);
    try {
      let res = await ApiService(apiConstants.getOrderByDriver, {
        customData: {
          // token: userData?.user?.verify_token,
          token: token,
          role: UserData?.user?.role,
          // relaties_id: UserData?.relaties?.id,
          relaties_id: 1307,
          user_id: UserData?.user?.id,
          date: ApiFormatDate(SelectDate),
          status_id: status?.id,
          // date:"2025-10-23",
        },
      });
      // if (Boolean(res.status)) {
      //   setAllData(res?.data || []);
      //   setSelectRegion(res?.data[0] || []);
      //   // console.log("Final Data",res?.data[0]);
      // }
        if (Boolean(res.status)) {
        console.log("current Data", Region);

        setAllData(res?.data || []);

        if (!Region || Region === "") {
          setSelectRegion(res?.data?.[0] || {});
        } else {
          const pre = res?.data?.find(
            (el: any) => el?.id === Region?.id
          );
          setSelectRegion(pre || res?.data?.[0] || {});
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

  const GetStatusList = async () => {
    try {
      let res = await ApiService(apiConstants.status_list, {
        customData: {
          // token: userData?.user?.verify_token,
          token: token,
          role: UserData?.user?.role,
          // relaties_id: UserData?.relaties?.id,
          relaties_id: 1307,
          user_id: UserData?.user?.id,
        },
      });

      if (Boolean(res.status)) {
        setActiveTab(res?.data[0]);
        setAllStatusData(res?.data || []);
        if (SelectDate !== "") {
          GetAllPickUpDataFun(res?.data[0]);
        }
      }
    } catch (error) {
      console.log("Get Status List Data:-");
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    }
  };

  useEffect(() => {
    if (UserData && AllStatusData?.length == 0) {
      GetStatusList();
    }

    if (SelectDate !== "" && ActiveTab !== null) {
    setAllData([])
    setSelectRegion("")
      GetAllPickUpDataFun(ActiveTab);
    }
  }, [SelectDate]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.ContentContainerStyle}
      nestedScrollEnabled={true}
      bounces={false}
      scrollEnabled={Region?.deliver_orders?.length > 0}
    >
      <CalenderDate date={SelectDate} setDate={setSelectDate} />

      <View style={[styles.Flex,{marginTop:'2%'}]}>
        <DropDownBox
          data={AllData}
          value={Region}
          setValue={setSelectRegion}
          labelFieldKey="name"
          valueFieldKey="id"
          ContainerStyle={{    flex:1/1.05, }}
          // disbled={true}
        />
        <View style={{width:46,height:46}}>

        <TwoTypeButton
          onlyIcon={true}
          Icon={Images.Scan}
          style={{ width: '100%', height: '100%' }}
          onPress={() => navigation.navigate("Scanner",{fun:GetAllPickUpDataFun})}
          />
          </View>
      </View>

      <View style={[SimpleFlex.Flex,{flex:1,margin:-15,marginTop:10,}]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.ContentContainerStyleCatogryStatus]}
          data={AllStatusData || []}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={30}
          renderItem={({ item, index }: any) => (
            <TouchableOpacity
              style={[
                styles.Button,
                {
                  backgroundColor:
                    ActiveTab?.id === item?.id
                      ? ActiveTab?.color
                      : Colors.white,
                },
              ]}
              onPress={() => {
                GetAllPickUpDataFun(item);
                setActiveTab(item);
              }}
            >
              <Text
                style={[
                  styles.Text,
                  // { color: ActiveTab?.id === item?.id ? Colors.white : Colors.black },
                  { color: Colors.black },
                ]}
              >
                {item?.status_name || ""}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        style={styles.FlatConatiner}
        scrollEnabled={false}
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
        contentContainerStyle={styles.ContainerStyle}
        data={Region?.deliver_orders || []}
        renderItem={({item,index}) => {
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
    </ScrollView>
  );
}
