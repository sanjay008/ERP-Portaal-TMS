import React, { useCallback, useEffect, useState } from "react";
import { RFValue } from "react-native-responsive-fontsize";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as Device from "expo-device";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";

import {
    Alert,
    BackHandler,
    Image,
    Linking,
    SafeAreaView,
    StatusBar,
    Text,
    View,
} from "react-native";
import { Colors } from "../../utils/colors";
import { Images } from "../../assets/images";
import ButtonComponent from "../../components/buttonComponent";
import { styles } from "./style";



// export default OnBoarding;

const OnBoarding = ({ navigation }) => {
    const { t } = useTranslation();
    const [appVersion, setAppVersion] = useState("");

    const handleBackPress = useCallback(() => {
        Alert.alert("Hold on!", t("Are you sure you want to exit?"), [
            {
                text: "Cancel",
                onPress: () => null,
                style: "cancel",
            },
            { text: "YES", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
    }, []);

    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener(
                'hardwareBackPress',
                handleBackPress
            );

            return () => backHandler.remove(); // Correct way to remove listener
        }, [])
    );

    useEffect(() => {
        retrieveAppVersion();
    }, []);

const retrieveAppVersion = async () => {
  try {
    const version =
      Constants.expoConfig?.version ||
      Constants.manifest?.version || // fallback for older SDKs
      "Unknown";
    console.log("App version:", version);
    setAppVersion(version);
  } catch (error) {
    console.error("Error retrieving app version:", error);
  }
};

    const openURL = () => {
        Linking.openURL("https://www.erpportaal.nl/").catch((err) =>
            console.error("An error occurred", err)
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar backgroundColor={Colors.white} barStyle={"dark-content"} />
            <KeyboardAwareScrollView
                bounces={false}
                enableOnAndroid
                extraScrollHeight={70}
                keyboardShouldPersistTaps="handled"
                style={styles.subContainer}
            >
                <View style={{ justifyContent: "center", flex: 1 }}>
                    <Image source={Images.roundlogo} style={styles.logo} />

                    <View style={styles.container}>
                        <Text style={styles.wellcome}>{t("Welkom bij ERP Projects")}</Text>
                        <Text style={styles.dis}>
                            {t("Smart Solutions for Modern Businesses")}
                        </Text>
                        <Text style={styles.dis}>
                            {t("Release V")}
                            {appVersion}
                        </Text>
                        <Text
                            onPress={openURL}
                            style={[styles.dis, { marginTop: 5, color: Colors.primary }]}
                        >
                            www.erpportaal.nl
                        </Text>
                    </View>
                </View>
            </KeyboardAwareScrollView>
            <View
                style={{
                    position: "absolute",
                    bottom: 10,
                    width: "90%",
                    alignSelf: "center",
                }}
            >
                <ButtonComponent
                    onPress={() => navigation.navigate("Register", { typee: "Register" })}
                    marginTop={RFValue(50)}
                    title={t("Registreren")}
                />
                <ButtonComponent
                    onPress={() => navigation.navigate("Register", { typee: "Login" })}
                    marginTop={RFValue(10)}
                    title={t("Inloggen")}
                    // backgroundColor={Colors.white}
                    // borderWidth={1.5}
                    // borderColor={Colors.litegray}
                    // color={Colors.black}
                />
            </View>
        </SafeAreaView>
    );
};

export default OnBoarding;

