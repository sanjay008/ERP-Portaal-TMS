import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DashedLine from "react-native-dashed-line";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Modal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import { FONTS, height } from "../utils/storeData";
type Props = {
  IsVisible: boolean;
  setIsVisible: (value: boolean) => void;
  fun?: (value: string) => void;
};

export default function AddCommentModal({ IsVisible, setIsVisible, fun }: Props) {
  const { t } = useTranslation();
  const [comment, setComment] = useState<string>("");
  const [Description, setDescrition] = useState<string>("");
  const [Commenterror, setCommentError] = useState<string>("")
  const { UserData, setUserData } = useContext(GlobalContextData);


  const CommentFun = async () => {
    setCommentError("");
    if (Description.trim() == "") {
      setCommentError(t("Enter a comment"))
      return
    }
    fun?.(Description);
    setDescrition("");
    setIsVisible(false)
  }
  return (
    <Modal
      isVisible={IsVisible}
      animationIn={"bounceInUp"}
      animationOut={"bounceOutDown"}
      style={{ margin: 0, }}
      onBackdropPress={() => { setIsVisible(false) }}
      onBackButtonPress={() => { setIsVisible(false) }}
      useNativeDriver
      avoidKeyboard
    >
      <KeyboardAwareScrollView
        style={{ flexGrow: 1 }}
        // extraHeight={100}
        contentContainerStyle={{ flex: 1 }}
        enableOnAndroid={true}
        extraScrollHeight={170}
        keyboardShouldPersistTaps="handled"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.CommentBox}>
            <View style={styles.Flex}>
              <Text style={styles.Text}>{t("Write Comment")}</Text>
              <TouchableOpacity style={styles.CloseButton} onPress={() => setIsVisible(false)}>
                <Image
                  source={Images.Close}
                  style={{ width: 18, height: 18 }}
                  tintColor={Colors.black}
                />
              </TouchableOpacity>
            </View>

            <DashedLine
              dashLength={4}
              dashThickness={2}
              dashGap={5}
              style={styles.Line}
              dashColor={Colors.otherBorder}
            />

            <View>
              <Text style={styles.Text}>{t("Name")}</Text>
              <View style={styles.InputBox}>
                <TextInput
                  style={styles.Input}
                  editable={false}
                  placeholderTextColor={Colors.darkText}
                  placeholder={t("Enter your name")}
                  returnKeyType="next"
                  textContentType="familyName"
                  value={UserData?.user?.username || ""}
                  onChangeText={setComment}
                />
                <Image source={Images.user} style={{ width: 18, height: 18 }} />
              </View>
            </View>

            <View>
              <Text style={styles.Text}>{t("Description")}</Text>
              <TextInput
                style={styles.TextArea}
                value={Description}
                onChangeText={setDescrition}
                placeholder={t("Type here...")}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              {
                Commenterror &&
                <Text style={styles.Error}>{Commenterror}</Text>
              }
            </View>

            <TouchableOpacity style={styles.Button} onPress={CommentFun}>
              <Text style={[styles.Text, { color: Colors.white }]}>
                {t("Submit")}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAwareScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: height,
    justifyContent: "flex-end",
    margin: 0,
  },
  CommentBox: {
    // width: width,
    padding: 15,
    // height:'80%',
    backgroundColor: Colors.background,
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10,
    paddingBottom: 20
  },
  Text: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  Line: {
    marginVertical: 10,
  },
  Input: {
    width: "80%",
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  Flex: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  InputBox: {
    width: "100%",
    backgroundColor: Colors.white,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS == "android" ? 5 : 10,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  CloseButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  TextArea: {
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: Colors.white,
    minHeight: 120,
    fontFamily: FONTS.Regular,
    color: Colors.black,
    marginTop: 10,
  },
  Button: {
    width: "100%",
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 15,
  },
  Error: {
    fontSize: 13,
    color: Colors.red,
    fontFamily: FONTS.Regular,
    marginTop: 10,
    marginLeft: 5
  }
});
