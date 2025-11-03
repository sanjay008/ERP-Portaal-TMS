import { GlobalContextData } from "@/src/context/GlobalContext";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Dimensions,
    Image,
    SafeAreaView,
    StatusBar,
    Text,
    View
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { RFValue } from "react-native-responsive-fontsize";
import apiConstants from "../../api/apiConstants";
import { Images } from "../../assets/images";
import ButtonComponent from "../../components/buttonComponent.tsx";
import Input from "../../components/input";
import Loader from "../../components/loading";
import ApiService from "../../utils/Apiservice";
import { Colors } from "../../utils/colors";
import { storeData } from "../../utils/storeData";
import { styles } from "./style";

const Password = ({ route, navigation }) => {
      const {
        setUserData,
        GOOGLE_API_KEY,setGOOGLE_API_KEY,
        CompanyLogo,setCompanyLogo,
        Permission,setPermission,
        SelectLanguage,setSelectLanguage
      } = useContext(GlobalContextData);

    const { logo } = route?.params || {};
    const { login_company } = route.params || {};
    const { email } = route.params || {};
    const { userId } = route?.param || {};
    const { width } = Dimensions.get("screen");
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(true);
    const { t } = useTranslation();
    const passwordRegex = /^(?=.*[a-zA-Z]).*$/;

    const onVerify = () => {
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

            const data = await ApiService(apiConstants.Login, {
                customData: {
                    password: password,
                    company_login: login_company,
                    email: email,
                },
            });
            console.log(data);

            if (data.status) {


                setLoading(false);
                console.log("password successful");
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
                let Permission = datas?.data;
                //  setUserData(data?.user)
                setPermission(Permission);
                // Alert.alert("A")

                
                    navigation.reset({
                        index: 0,
                        routes: [{ name: "BottomTabs" }],
                    });
                    
                    return;
                
            } else {
                setLoading(false);
                Alert.alert("Oops!", data.message, [
                    { text: "OK", onPress: () => console.log("OK Pressed") },
                ]);
            }
        } catch (err) {
            console.log("Error fetching connections:", err);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar backgroundColor={Colors.white} barStyle={"dark-content"} />
            {loading && <Loader color={Colors.pink} />}
                 <KeyboardAwareScrollView
                    bounces={false}
                    enableOnAndroid
                    extraScrollHeight={200}
                    keyboardShouldPersistTaps="handled"
                    
                  >
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
                        setPassword(txt), setPasswordError("");
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
                />
            </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
};

export default Password;
