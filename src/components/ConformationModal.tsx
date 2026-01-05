// import React from "react";
// import { useTranslation } from "react-i18next";
// import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import Modal from "react-native-modal";
// import { RFPercentage } from "react-native-responsive-fontsize";
// import { Images } from "../assets/images";
// import { Colors } from "../utils/colors";

// type Props = {
//   IsVisible: boolean;
//   onClose?: () => void;
//   Icon?: React.ReactNode;
//   Title?: string;
//   LeftButtonText?: string;
//   RightButtonText?: string;
//   RightBgColor?: string | any;
//   LeftBGColor?: string | any;
//   RightButtonIcon?: React.ReactNode | any;
//   Description?: string;
//   LTextColor?: string;
//   RTextColor?: string;
//   HeaderBgColor?:string
//   onPress?: () => void;
// };
// export default function ConformationModal({
//   IsVisible,
//   onClose,
//   Icon,
//   Title,
//   LeftButtonText,
//   RightButtonText,
//   RightBgColor,
//   LeftBGColor,
//   RightButtonIcon,
//   Description,
//   LTextColor,
//   RTextColor,
//   HeaderBgColor,
//   onPress,
// }: Props) {
//   const { t } = useTranslation();
  
//   return (
//     <View>
//     <Modal
    
//       isVisible={IsVisible}
//       animationIn={"bounceInUp"}
//       animationOut={"bounceOutDown"}
//       onBackdropPress={onClose}
//       onBackButtonPress={onClose}
//       style={{ margin: 0, justifyContent: "center", alignItems: "center",}}
//     >
//       <View style={styles.Container}>
//         <View style={[styles.Header,HeaderBgColor && {backgroundColor:HeaderBgColor}]}>
//           <Image source={Icon || Images.DeleteBtn} style={styles.Icon} />
//           <View style={{width:'90%'}}>
//             <Text style={[styles.Text,{ fontSize: ((Text ?? '').length > 20) ? 8 : 14 ,width:'90%'}]}>{Title || t("Title")}</Text>
//             {(Description || "").length > 0 && (
//               <Text style={[styles.Description, { fontSize: ((Description ?? '').length > 30) ? 12 : 14 }]}>
//                 {Description?.slice(0,80) || t("Desctiption")}
//               </Text>
//             )}
//           </View>
//         </View>
//         <View style={styles.ButtonContainer}>
//           <TouchableOpacity
//             style={[
//               styles.ButtonStyle,
//               { backgroundColor: LeftBGColor || Colors.Boxgray,width: RightButtonText!=="" && RightButtonText ? '48%' : '80%',},
//               !(RightButtonText!=="" && RightButtonText) && {marginHorizontal:'auto'}
//             ]}
//             onPress={onClose}
//           >
//             <Text
//               style={[styles.ButtonText, { color: LTextColor || Colors.black }]}
//             >
//               {LeftButtonText || t("Cancel")}
//             </Text>
//           </TouchableOpacity>
//             {
//               RightButtonText!=="" && RightButtonText &&
//                    <TouchableOpacity
//             style={[
//               styles.ButtonStyle,
//               { backgroundColor: RightBgColor || Colors.Boxgray },
//             ]}
//             onPress={() => {
//               if (onPress) {
//                 onPress();
//               }
//               onClose?.();
//             }}
//           >
//             {RightButtonIcon && (
//               <Image
//                 source={RightButtonIcon}
//                 style={{ width: 24, height: 24 }}
//               />
//             )}
//             <Text
//               style={[styles.ButtonText, { color: RTextColor || Colors.black }]}
//             >
//               {RightButtonText || t("Okay")}
//             </Text>
//           </TouchableOpacity>
//             }
//         </View>
//       </View>
//     </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   Container: {
//     width: "90%",
//     backgroundColor: Colors.white,
//     alignSelf: "center",
//     borderRadius: 7,
//     overflow: "hidden",
//     // paddingVertical: 15,
//   },
//   Icon: {
//     width: 48,
//     height: 48,
//   },
//   Header: {
//     backgroundColor: Colors.background,
//     borderBottomWidth: 1,
//     borderColor: Colors.modalBorder,
//     paddingHorizontal: 15,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 15,
//     paddingVertical: 10,
//   },
//   Text: {
//     fontFamily: FONTS.Medium,
//     fontSize: 15,
//     color: Colors.black,
//   },
//   ButtonContainer: {
//     width: "100%",
//     paddingHorizontal: 15,
//     paddingVertical: 15,
//     backgroundColor: Colors.white,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   ButtonStyle: {
//     width: "48%",
//     height: RFPercentage(6),
//     backgroundColor: Colors.BtnBg,
//     borderRadius: 5,
//     justifyContent: "center",
//     alignItems: "center",
//     gap: 10,
//     flexDirection:'row',
//   },
//   ButtonText: {
//     fontSize: 15,
//     fontFamily: FONTS.Medium,
//     color: Colors.black,
//     textAlign: "center",
//   },
//   Description: {
//     fontSize: 13,
//     fontFamily: FONTS.Regular,
//     color: Colors.darkText,
//     width:"90%",
//   },
// });
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { RFPercentage } from "react-native-responsive-fontsize";
import { Images } from "../assets/images";
import { Colors } from "../utils/colors";
import { FONTS } from "../utils/storeData";

const { height } = Dimensions.get("window");

type Props = {
  IsVisible: boolean;
  onClose?: () => void;
  Icon?: React.ReactNode;
  Title?: string;
  LeftButtonText?: string;
  RightButtonText?: string;
  RightBgColor?: string | any;
  LeftBGColor?: string | any;
  RightButtonIcon?: React.ReactNode | any;
  Description?: string;
  LTextColor?: string;
  RTextColor?: string;
  HeaderBgColor?: string;
  onPress?: () => void;
};

export default function ConformationModal({
  IsVisible,
  onClose,
  Icon,
  Title,
  LeftButtonText,
  RightButtonText,
  RightBgColor,
  LeftBGColor,
  RightButtonIcon,
  Description,
  LTextColor,
  RTextColor,
  HeaderBgColor,
  onPress,
}: Props) {
  const { t } = useTranslation();

  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(height);

  useEffect(() => {
    if (IsVisible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 18 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(height, { duration: 200 });
    }
  }, [IsVisible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!IsVisible) return null;

  return (
    <View style={styles.AbsoluteContainer}>
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[styles.Backdrop, backdropStyle]}
        />
      </Pressable>

      {/* Modal */}
      <View style={[styles.CenterWrapper,]}>
        <View style={styles.Container}>
          <View
            style={[
              styles.Header,
              HeaderBgColor && { backgroundColor: HeaderBgColor },
            ]}
          >
            <Image source={Icon || Images.DeleteBtn} style={styles.Icon} />
            <View style={{ width: "90%" }}>
              <Text
                style={[
                  styles.Text,
                  {
                    fontSize:
                      ((Title ?? "").length > 20 ? 8 : 14),
                    width: "90%",
                  },
                ]}
              >
                {Title || t("Title")}
              </Text>

              {(Description || "").length > 0 && (
                <Text
                  style={[
                    styles.Description,
                    {
                      fontSize:
                        ((Description ?? "").length > 30 ? 12 : 14),
                    },
                  ]}
                >
                  {Description?.slice(0, 80) || t("Desctiption")}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.ButtonContainer}>
            <TouchableOpacity
              style={[
                styles.ButtonStyle,
                {
                  backgroundColor: LeftBGColor || Colors.Boxgray,
                  width:
                    RightButtonText !== "" && RightButtonText
                      ? "48%"
                      : "80%",
                },
                !(RightButtonText !== "" && RightButtonText) && {
                  marginHorizontal: "auto",
                },
              ]}
              onPress={onClose}
            >
              <Text
                style={[
                  styles.ButtonText,
                  { color: LTextColor || Colors.black },
                ]}
              >
                {LeftButtonText || t("Cancel")}
              </Text>
            </TouchableOpacity>

            {RightButtonText !== "" && RightButtonText && (
              <TouchableOpacity
                style={[
                  styles.ButtonStyle,
                  { backgroundColor: RightBgColor || Colors.Boxgray },
                ]}
                onPress={() => {
                  if (onPress) onPress();
                  onClose?.();
                }}
              >
                {RightButtonIcon && (
                  <Image
                    source={RightButtonIcon}
                    style={{ width: 24, height: 24 }}
                  />
                )}
                <Text
                  style={[
                    styles.ButtonText,
                    { color: RTextColor || Colors.black },
                  ]}
                >
                  {RightButtonText || t("Okay")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
  const styles = StyleSheet.create({
  Container: {
    width: "90%",
    backgroundColor: Colors.white,
    alignSelf: "center",
    borderRadius: 7,
    overflow: "hidden",
    // paddingVertical: 15,
  },
  Icon: {
    width: 48,
    height: 48,
  },
  Header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderColor: Colors.modalBorder,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingVertical: 10,
  },
  Text: {
    fontFamily: FONTS.Medium,
    fontSize: 15,
    color: Colors.black,
  },
  ButtonContainer: {
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ButtonStyle: {
    width: "48%",
    height: RFPercentage(6),
    backgroundColor: Colors.BtnBg,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    flexDirection:'row',
  },
  ButtonText: {
    fontSize: 15,
    fontFamily: FONTS.Medium,
    color: Colors.black,
    textAlign: "center",
  },
  Description: {
    fontSize: 13,
    fontFamily: FONTS.Regular,
    color: Colors.darkText,
    width:"90%",
  },
   AbsoluteContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  Backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  CenterWrapper: {
    width: "100%",
    alignItems: "center",
  },

});