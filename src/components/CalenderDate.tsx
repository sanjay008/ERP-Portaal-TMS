import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import Modal from "react-native-modal";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { formatDate } from "./DateFormate";
type Props = {
  date: string;
  setDate?: any;
};

export default function CalenderDate({ date, setDate }: Props) {
  const [IsVisible, setVisible] = useState<boolean>(false);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.DateShowContainer,
          { borderColor: date ? Colors.primary : Colors.Boxgray },
        ]}
      >
        <Image
          source={Images.date}
          style={styles.Icon}
          tintColor={date ? Colors.primary : Colors.darkText}
        />
        {date ? (
          <Text style={styles.Text}>{formatDate(date)}</Text>
        ) : (
          <Text style={styles.DarkText}>Select Date</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.Calender}
        onPress={() => setVisible(true)}
      >
        <Image source={Images.calender} style={{ width: 22, height: 22 }} />
      </TouchableOpacity>
      <Modal
        isVisible={IsVisible}
        animationIn={"zoomIn"}
        animationOut={"zoomOut"}
        backdropColor="transparent"
        onBackButtonPress={()=>setVisible(false)}
        onBackdropPress={()=>setVisible(false)}
      >
        <View style={styles.CalenderView}>
          <Calendar
            onDayPress={(day) => {
              setDate(day.dateString);
              setVisible(false);
            }}
            markedDates={{
              [date]: { selected: true, selectedColor: Colors.primary },
            }}
            theme={{
              selectedDayBackgroundColor: Colors.primary,
              todayTextColor: Colors.primary,
              arrowColor: Colors.primary,
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    
  },
  DateShowContainer: {
    width: "80%",
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 15,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor:Colors.white
  },
  Icon: {
    width: 25,
    height: 25,
  },
  DarkText: {
    fontSize: 14,
    color: Colors.darkText,
    fontFamily: "regular",
  },
  Text: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: "regular",
  },
  Calender: {
    width: 46,
    height: 46,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  CalenderView: {
    width:'100%',
    backgroundColor: Colors.white,
    borderRadius: 7,
    padding: 20,
    alignItems: "center",
    position:'absolute',
    top:'20%',
    elevation:4
  },
});
