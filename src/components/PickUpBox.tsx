import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";

export default function PickUpBox({ index, onPress }: any) {
  const pickup: boolean = false;
  return (
    <Pressable
      style={[styles.container, pickup && styles.BorderOrBg]}
      onPress={onPress}
    >
      <View style={[styles.Flex, { marginTop: 0 }]}>
        <View style={styles.TopContainer}>
          <View style={styles.NumberBox}>
            <Text style={[styles.Text]}>1</Text>
          </View>
          <View>
            <Text style={[[styles.Text], { fontSize: 15 }]}>Tushar Variya</Text>
            <Text
              style={[styles.OrderIdText, pickup && { color: Colors.black }]}
            >
              #000001
            </Text>
          </View>
        </View>
        {pickup && (
          <Image source={Images.Done} style={{ width: 34, height: 34 }} />
        )}
      </View>
      <View style={styles.Flex}>
        <Text
          style={[
            styles.OrderIdText,
            { fontSize: 14 },
            pickup && { color: Colors.black },
          ]}
        >
          Pickup
        </Text>
        <View style={styles.NumberBox}>
          <Text style={[styles.Text]}>3</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 15,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
  },
  BorderOrBg: {
    borderWidth: 1,
    borderColor: Colors.borderColor,
    backgroundColor: Colors.lightGreen,
  },
  TopContainer: {
    flexDirection: "row",
    gap: 15,
    alignItems: "center",
  },
  NumberBox: {
    width: 40,
    height: 40,
    backgroundColor: Colors.Boxgray,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  Text: {
    fontSize: 14,
    fontFamily: "SemiBold",
    color: Colors.black,
  },
  OrderIdText: {
    fontSize: 13,
    color: Colors.orderdark,
    fontFamily: "Medium",
  },
  Flex: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
  },
});
