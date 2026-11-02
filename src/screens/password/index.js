import { GlobalContextData } from "@/src/context/GlobalContext";
import { registerForPushNotificationsAsync } from "@/src/notification/notificationService";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
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
import ApiService from "../../utils/Apiservice";
import { Colors } from "../../utils/colors";
import { storeData } from "../../utils/storeData";
import { styles } from "./style";

const Password = ({ route, navigation }) => {
    const { setPermission } = useContext(GlobalContextData);

    const { logo } = route?.params || {};
    const { login_company } = route.params || {};
    const { email } = route.params || {};
    const { width } = Dimensions.get("screen");
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(true);
    const { t } = useTranslation();
    const passwordRegex = /^(?=.*[a-zA-Z]).*$/;

    const onVerify = () => {
        if (loading) return;
        if (!password) {
            setPasswordError(t("Please enter your password"));
        } else if (!passwordRegex.test(password)) {
            setPasswordError(t("Password must include at least letter "));
        } else {
            setPasswordError("");
            onLogin();
        }
    };

    const onLogin = async () => {
        setLoading(true);
        try {
            const token = await registerForPushNotificationsAsync();
            const data = await ApiService(apiConstants.Login, {
                customData: {
                    password: password,
                    company_login: login_company,
                    email: email,
                    expo_token: token
                },
            });

            if (data.status) {
                await storeData("USERDATA", data);
                await storeData("AUTH", true);

                let Client = data?.data?.user;
                const datas = await ApiService(apiConstants.permission, {
                    customData: {
                        token: Client?.verify_token,
                        role: Client?.role,
                        relaties_id: data?.data?.relaties?.id,
                        user_id: Client?.id
                    },
                });
                setPermission(datas?.data);

                navigation.reset({
                    index: 0,
                    routes: [{ name: "BottomTabs" }],
                });
                return;
            }

            setLoading(false);
            Alert.alert(t("Oops!"), t(data.message), [
                { text: t("OK"), onPress: () => console.log("OK Pressed") },
            ]);
        } catch (err) {
            console.log("Error fetching connections:", err);
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar backgroundColor={Colors.white} barStyle={"dark-content"} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={0}
            >
                <View style={{ flex: 1 }}>
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
                        <Text style={styles.welcome}>{t("Password Verification")}</Text>
                        <Text style={styles.description}>{t("Enter your password")}</Text>

                        <Input
                            value={password}
                            onChangeText={(txt) => {
                                setPassword(txt);
                                setPasswordError("");
                            }}
                            iconSource={Images.lock}
                            secureTextEntry={show ? true : false}
                            rightIcon={show ? Images.eyeoff : Images.eye}
                            onPress={() => setShow(!show)}
                            color={Colors.black}
                            error={passwordError}
                        />

                        <ButtonComponent
                            onPress={onVerify}
                            marginTop={RFValue(30)}
                            title={t("Verify")}
                            loading={loading}
                            disabled={loading}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default Password;
