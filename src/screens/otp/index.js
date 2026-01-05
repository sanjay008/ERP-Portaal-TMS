import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Dimensions,
    Image,
    StatusBar,
    Text,
    View
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { SafeAreaView } from "react-native-safe-area-context";
import apiConstants from "../../api/apiConstants";
import { Images } from "../../assets/images";
import ButtonComponent from "../../components/buttonComponent.tsx";
import Input from "../../components/input";
import Loader from "../../components/loading";
import ApiService from "../../utils/Apiservice";
import { Colors } from "../../utils/colors";
import { getData, storeData } from "../../utils/storeData";
import { styles } from "./style";


const Otp = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { width } = Dimensions.get("screen");
    const { register } = route?.params || {};
    const { login } = route?.params || {};
    const { userId } = route?.params || {};
    const { logo } = route?.params || {};
    const { verify_token } = route?.params || {};
    const [otp, setotp] = useState("");
    const [otpError, setotpError] = useState("");
    const [timerActive, setTimerActive] = useState(true);
    const [show, setShow] = useState(false);
    const [timer, setTimer] = useState(60);
    const [currentLongitude, setCurrentLongitude] = useState("");
    const [currentLatitude, setCurrentLatitude] = useState("");
    const [locationStatus, setLocationStatus] = useState("");
    const [loading, setLoding] = useState(false);
    const [resendtext, setResendtext] = useState("");

    const handleResendOtp = () => {
        setTimer(60);
        setTimerActive(true);
        setShow(true);
        ResendOtp();
        setTimeout(() => {
            setShow(false);
        }, 2500);
    };

    useEffect(() => {
        let intervalId;
        if (timerActive) {
            intervalId = setInterval(() => {
                setTimer((prevTimer) => {
                    if (prevTimer === 0) {
                        setTimerActive(false);
                        clearInterval(intervalId);
                    }
                    return prevTimer === 0 ? 0 : prevTimer - 1;
                });
            }, 1000);
        }
        return () => clearInterval(intervalId);
    }, [timerActive]);

    const onVerify = async () => {
        const auth = await getData("USERDATA");
        console.log("auth", auth);
        if (otp == "" || otp.length < 6) {
            setotpError("Voer OTP in");
        } else {
            try {
                const company = await getData("COMPANYLOGIN");
                const data = await ApiService(apiConstants.Verifyotp, {
                    customData: {
                        company_login: company,
                        user_id: userId,
                        otp: otp,
                        token: verify_token,
                        otp_type:
                            register == "true"
                                ? "user_register_requests"
                                : "mobile_login"
                                    ? login == "true"
                                        ? "mobile_login"
                                        : "user_register_requests"
                                    : "",
                    },
                });
                if (data.status) {

                    storeData("LOGIN", true);
                    setTimeout(() => {
                        setLoding(false);
                    }, 1000);

                    if (register == "true") {
                        navigation.navigate("Staff", {
                            logo: logo,
                            userId: userId,
                            type: "medewerker",
                            typeId: 3,
                            verify_token: verify_token,
                            category_id: 2,
                        });
                    } else {
                        storeData("AUTH", true);
                        console.log("otp data.....", data);
                        await storeData("USERDATA", data)
                        navigation.navigate("BottomTabs");
                    }
                } else {
                    console.log("false");
                    setTimeout(() => {
                        setLoding(false);
                    }, 1000);
                    Alert.alert("Oops!", data.message);
                }
            } catch (err) {
                console.log("Error fetching connections:", err);
                setTimeout(() => {
                    setLoding(false);
                }, 1000);
            }
        }
    };

    const ResendOtp = async () => {
        try {
            const company = await getData("COMPANYLOGIN");
            const data = await ApiService(apiConstants.resend_otp, {
                customData: {
                    company_login: company,
                    user_id: userId,
                    otp_type:
                        register == "true" ? "user_register_requests" : "mobile_login",
                },
            });
            if (data.status) {
                setResendtext(data.message);
                console.log("res.data.....otp", data);
                setTimeout(() => {
                    setLoding(false);
                }, 1000);
            } else {
                console.log("false");
                setTimeout(() => {
                    setLoding(false);
                }, 1000);
                Alert.alert(data.message);
            }
        } catch (err) {
            console.log("Error fetching connections:", err);
            setTimeout(() => {
                setLoding(false);
            }, 1000);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar backgroundColor={Colors.white} barStyle={"dark-content"} />
            {loading && <Loader />}
            <Image
                resizeMode="contain"
                source={logo ? { uri: logo } : Images.logo}
                style={[
                    styles.logo,
                    {
                        width: logo ? width * 0.7 : 260,
                        height: logo ? RFValue(50) : 25,
                    },
                ]}
            />
            <View style={styles.container}>
                <Text style={[styles.wellcome, { marginLeft: 10 }]}>{t("verifiëren")}</Text>
                <Text style={[styles.dis, { marginLeft: 10 }]}>{t("Voer OTP in")}</Text>
                <Input
                    value={otp}
                    placeholder="*"
                    placeholderTextColor={Colors.litegray}
                    textInputStyle={styles.input}
                    tintColor={Colors.primary}
                    onChangeText={(txt) => {
                        setotp(txt), setotpError("");
                    }}
                    keyboardType="numeric"
                    maxLength={6}
                />
                <Text style={styles.otperrortext}>{otpError}</Text>
                <ButtonComponent
                    onPress={onVerify}
                    marginTop={RFValue(30)}
                    title={t("verifiëren")}
                />
                {timerActive ? (
                    <Text style={styles.resend}>
                        {timer < 10 ? `00:0${timer}` : `00:${timer}`}
                    </Text>
                ) : (
                    <Text
                        onPress={handleResendOtp}
                        style={[styles.resend, { color: Colors.black }]}
                    >
                        {t("Opnieuw versturen")}
                    </Text>
                )}
                {show ? (
                    <Text
                        style={[
                            styles.resend,
                            {
                                color: Colors.black,
                                fontFamily: FONTS.Regular,
                                color: Colors.textgray,
                            },
                        ]}
                    >
                        {resendtext}
                    </Text>
                ) : (
                    ""
                )}
            </View>
        </SafeAreaView>
    );
};

export default Otp;
