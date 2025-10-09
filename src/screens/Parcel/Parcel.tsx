import CalenderDate from "@/src/components/CalenderDate";
import DropDownBox from "@/src/components/DropDownBox";
import PickUpBox from "@/src/components/PickUpBox";
import { Colors } from "@/src/utils/colors";
import { SimpleFlex } from "@/src/utils/storeData";
import React, { useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./styles";

export default function Parcel({ navigation }: any) {
  const [SelectDate, setSelectDate] = useState<string>("");
  const [Region, setSelectRegion] = useState<any | {}>("");
  const [ActiveTab, setActiveTab] = useState<number>(1);
  return (
    <View style={styles.container}>
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
                ActiveTab === 1 ? Colors.TabOrrange : Colors.white,
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
            Pick Up
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
            Deliver
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.FlatConatiner}
        scrollEnabled={false}
        contentContainerStyle={styles.ContainerStyle}
        data={["", ""]}
        renderItem={({}) => {
          return <PickUpBox onPress={() => navigation.navigate("Details")} />;
        }}
      />
    </View>
  );
}
