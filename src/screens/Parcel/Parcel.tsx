import CalenderDate from "@/src/components/CalenderDate";
import DropDownBox from "@/src/components/DropDownBox";
import PickUpBox from "@/src/components/PickUpBox";
import { Colors } from "@/src/utils/colors";
import { SimpleFlex } from "@/src/utils/storeData";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./styles";

export default function Parcel({ navigation }: any) {
  const [SelectDate, setSelectDate] = useState<string>("");
  const [Region, setSelectRegion] = useState<any | {}>("");
  const [ActiveTab, setActiveTab] = useState<number>(1);
  const { t } = useTranslation();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.ContentContainerStyle} nestedScrollEnabled={true} bounces={false}>
      <CalenderDate date={SelectDate} setDate={setSelectDate} />

      <DropDownBox
        data={[]}
        value={Region}
        setValue={setSelectRegion}
        labelFieldKey="name"
        valueFieldKey="id"
      />

      <View style={SimpleFlex}>
        <TouchableOpacity
          style={[
            styles.Button,
            {
              backgroundColor:
                ActiveTab === 1 ? Colors.primary : Colors.white,
            },
          ]}
          onPress={() => setActiveTab(1)}
        >
          <Text
            style={[
              styles.Text,
              { color: ActiveTab === 1 ? Colors.white : Colors.black },
            ]}
          >
            {t("In Warehouse")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.Button,
            {
              backgroundColor: ActiveTab === 2 ? Colors.primary : Colors.white,
            },
          ]}
          onPress={() => setActiveTab(2)}
        >
          <Text
            style={[
              styles.Text,
              { color: ActiveTab === 2 ? Colors.white : Colors.black },
            ]}
          >
            {t("Deliver")}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.FlatConatiner}
        scrollEnabled={false}
        contentContainerStyle={styles.ContainerStyle}
        data={["", ""]}
        renderItem={({}) => {
          return <PickUpBox LableStatus={"Ready"} LacationProgress={false} onPress={() => navigation.navigate("Details")} />;
        }}
      />
    </ScrollView>
  );
}
