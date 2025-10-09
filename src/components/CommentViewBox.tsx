import React from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import DashedLine from "react-native-dashed-line";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { SimpleFlex } from "../utils/storeData";
export default function CommentViewBox({ data }: { data: object[] }) {
  return (
    <View style={styles.container}>
      <Text style={styles.Heading}>{`${data?.length} Comments`}</Text>

      <FlatList
        // data={data}
        data={["",""]}
        style={styles.Container}
        contentContainerStyle={styles.ContentStyle}
        scrollEnabled={false}
        renderItem={({item,index}) => (
          <View style={styles.CommentBox}>
            <View style={SimpleFlex}>
              <Image source={Images.Profile} style={styles.ImageProfile} />

              <View>
                <Text style={styles.Text}>Mathilde Langevin</Text>
                <Text style={styles.DarkText}>4 days ago</Text>
              </View>
            </View>

            <Text style={[styles.DarkText, { marginTop: 10 }]}>
              Look... I feel like I'm running out of ways to explain.
            </Text>
            <DashedLine
              dashLength={6}
              dashThickness={2}
              dashGap={5}
              style={styles.Dashed}
              dashColor={Colors.Boxgray}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  Heading: {
    fontSize: 13,
    fontFamily: "Medium",
    color: Colors.darkText,
  },
  CommentBox: {
    width: "100%",
    
  },
  ImageProfile: {
    width: 40,
    height: 40,
    borderRadius: 150,
  },
  Text: {
    fontSize: 14,
    fontFamily: "Medium",
    color: Colors.black,
  },
  DarkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "regular",
    color: Colors.darkText,
  },
  Dashed: {
    marginTop: 15,
    color: Colors.Boxgray,
  },
  Container:{
    marginTop:15
  },
  ContentStyle:{
    gap:15,

  },
});
