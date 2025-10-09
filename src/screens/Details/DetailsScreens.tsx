import { Images } from "@/src/assets/images";
import AddCommentModal from "@/src/components/AddCommentModal";
import CommentViewBox from "@/src/components/CommentViewBox";
import DetailsHeader from "@/src/components/DetailsHeader";
import MapsViewBox from "@/src/components/MapsViewBox";
import OrderDetailsBox from "@/src/components/OrderDetailsBox";
import ParcelBox from "@/src/components/ParcelBox";
import TwoTypeButton from "@/src/components/TwoTypeButton";
import TwoTypeInput from "@/src/components/TwoTypeInput";
import { width } from "@/src/utils/storeData";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";
export default function DetailsScreens({ navigation }: any) {
  const [comment, setComment] = useState<boolean | any>(false);
  const [AllSelectImage, setAllSelectImage] = useState<string[]>([]);
 
  const openCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow camera access");
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        console.log("Captured photo URI:", result.assets[0].uri);
        setAllSelectImage((pre) => [...pre, result.assets[0].uri]);
      }
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <DetailsHeader title="Delivery" />

      <ScrollView
        style={[styles.ViewContainer, { paddingTop:15, gap: 15 }]}
        contentContainerStyle={[styles.ContainerStyle, { paddingBottom: 50 }]}
        bounces={false}
      >
        <OrderDetailsBox />

        <MapsViewBox />

        <FlatList
          data={["", ""]}
          style={styles.FlatStyle}
          scrollEnabled={false}
          contentContainerStyle={styles.ContainerStyle}
          renderItem={({ item, index }) => (
            <ParcelBox index={index} data={{ check: true }} />
          )}
        />

        <View style={styles.Flex}>
          <TwoTypeButton
            Icon={Images.Scan}
            title="Scan"
            onPress={() => navigation.navigate("Scanner")}
          />
          <TwoTypeButton
            Icon={Images.Photos}
            title="Photo"
            onPress={openCamera}
          />
        </View>

        <FlatList
          horizontal
          style={{width:width}}
          contentContainerStyle={{ gap: 10,paddingRight:15 }}
          data={AllSelectImage}
          renderItem={({ item, index }) => {
            return (
              <View style={styles.Image}>
                <Image
                  source={{ uri: item }}
                  style={ { borderRadius: 7,width:'100%',height:'100%' }}
                />
              </View>
            );
          }}
        />

        <Pressable onPress={() => setComment(true)}>
          <TwoTypeInput
            Icon={Images.comment}
            placeholder="Write Comment"
            edit={false}
          />
        </Pressable>

        <CommentViewBox data={[]} />
      </ScrollView>
      <AddCommentModal IsVisible={comment} setIsVisible={setComment} />
    </SafeAreaView>
  );
}
