import { GlobalContextData } from "@/src/context/GlobalContext";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Dimensions,
  Image,
  // SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { RFValue } from "react-native-responsive-fontsize";
import { SafeAreaView } from "react-native-safe-area-context";
import CountryPicker from "rn-country-picker";
import apiConstants from "../../api/apiConstants";
import { Images } from "../../assets/images";
import ButtonComponent from "../../components/buttonComponent.tsx";
import Input from "../../components/input";
import Loader from "../../components/loading";
import ApiService from "../../utils/Apiservice";
import { Colors } from "../../utils/colors";
import { getData, storeData } from "../../utils/storeData";
import { styles } from "./style";


const regex = /^[\w+.-]+@[\w.-]+\.[a-zA-Z]{2,}$/; ``

const Register = ({ navigation, route }) => {

  const { t } = useTranslation();
  const { typee } = route.params;
  const { width } = Dimensions.get("screen");
  const [commpny, setcommpny] = useState("");
  const [companylogo, setcompanylogo] = useState("");
  const [CompnyError, setCompnyError] = useState("");
  const [countryCode, setCountryCode] = useState("31");
  const [number, setNumber] = useState("");
  const [numbererror, setNumbererror] = useState("");
  const [logo, setLogo] = useState(null);
  const [complate, setComplate] = useState(false);
  const [loading, setLoding] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [showWhatsApp, setShowWhatsapp] = useState(true);
  const {
    GOOGLE_API_KEY, setGOOGLE_API_KEY,
    CompanyLogo, setCompanyLogo,
    Permission, setPermission,
    SelectLanguage, setSelectLanguage
  } = useContext(GlobalContextData);

  // const dispatch = useDispatch();

  useEffect(() => {
    selectiondata();
  }, []);
  const selectiondata = async () => {
    await storeData("SELECT", true);
    // dispatch(selectregister(true));
  };

  const selectedValue = (value) => {
    setCountryCode(value?.callingCode);
    // console.log(value?.callingCode, "jsudhcousdhfcnos=-=-=-=");
  };

  const handleTextChange = (txt) => {
    setNumber(txt);
    setNumbererror("");
  };

  const onRegisterCompany = async () => {
    setLoding(true);

    if (commpny?.trim() === "") {
      setCompnyError(t("Voer bedrijfsnaam in"));
      setLoding(false);
      return;
    } else {
      try {
        const data = await ApiService(apiConstants.companyLogin, {
          customData: {
            company_login: commpny?.trim(),
          },
        });
        if (data.status) {
          setLoding(false);
          storeData("COMPANYDATA", data.data)
          storeData("COMPANYLOGIN", commpny?.trim());
          const logoUrl = data.data.default_company.company_logo;
          // console.log("LOGO URL CHECKING:-", data?.data);

          const GOOGLE_API_KEY = data.data.default_company?.project_google_maps_api_key;
          storeData("COMPANYLOGO", logoUrl);
          setCompanyLogo(logoUrl)
         await storeData("google_maps_api_key",GOOGLE_API_KEY)
          storeData("GOOGLE_API_KEY", GOOGLE_API_KEY);
          setcompanylogo(logoUrl);
          setLogo(logoUrl);

          setTimeout(() => {
            setLoding(false);
            setComplate(true);
          }, 1000);
        } else {
          setLoding(false);
          setCompnyError(t("Voer een geldige bedrijfsnaam in"));
        }
      } catch (err) {
        // setCompnyError(t("Voer een geldige bedrijfsnaam in"));
        console.log("Error fetching connections:", err);
        setTimeout(() => {
          setLoding(false);
        }, 1000);
      }
    }
  };

  const onRegisterNumber = async () => {
    setLoding(true);
    if (number == "") {
      setNumbererror(t("Voer nummer in"));
      setLoding(false);
      return;
    } else {
      try {
        const company = await getData("COMPANYLOGIN");

        const data = await ApiService(apiConstants.register, {
          customData: {
            company_login: company,
            whatsapp_number: number,
            country_code: countryCode,
          },
        });
        if (data.status) {
          storeData("USERDATA", data);
          setTimeout(() => {
            setLoding(false);

            navigation.navigate("Otp", {
              register: "true",
              logo: logo,
              userId: data.data.id,
              verify_token: data.data.verify_token,
            });
          }, 1000);
        } else {
          setTimeout(() => {
            setLoding(false);
          }, 1000);
          Alert.alert("Oops!", data.message, [
            { text: "OK", onPress: () => console.log("OK Pressed") },
          ]);
        }
      } catch (err) {
        console.log("Error fetching connections:", err);
        setTimeout(() => {
          setLoding(false);
        }, 1000);
      }
    }
  };

  const onLogin = async () => {
    setLoding(true);
    try {
      const company = await getData("COMPANYLOGIN");
      const data = await ApiService(apiConstants.emailmobilelogin, {
        customData: {
          email: email,
          company_login: company,
          whatsapp_number: number,
          country_code: countryCode,
        },
      });
      if (data.status) {
        storeData("USERDATA", data);

        if (data.data.user.enable_2fa == 1) {
          setTimeout(() => {
            setLoding(false);
          }, 1000);
          navigation.navigate("Otp", {
            login: "true",
            logo: logo,
            verify_token: data.data.user.verify_token,
            userId: data.data.user.id,
          });
        } else if (data.data.user.enable_2fa == 0) {
          setTimeout(() => {
            setLoding(false);
          }, 1000);
          navigation.navigate("Password", {
            logo: logo,
            verify_token: data.data.user.verify_token,
            login_company: data.data.user.login_company,
            email: data.data.user.email,
            number: data.data.user.whatsapp_number,
          });
        } else {
          setTimeout(() => {
            setLoding(false);
          }, 1000);
          storeData("AUTH", true);
          navigation.replace("BottomTabs");
          // navigation.replace("BottamScreens");
        }
      } else {
        setTimeout(() => {
          setLoding(false);
        }, 1000);
        Alert.alert("Oops!", data.message, [
          { text: "OK", onPress: () => console.log("OK Pressed") },
        ]);
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
      {loading && <Loader color={Colors.pink} />}
      <KeyboardAwareScrollView
        bounces={false}
        enableOnAndroid
        extraScrollHeight={200}
        keyboardShouldPersistTaps="handled"
        style={styles.subContainer}
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
          <Text style={styles.wellcome}>{t("Welkom bij ERP Projects")}</Text>
          <Text style={styles.dis}>
            {t("Smart Solutions for Modern Businesses")}
          </Text>

          {complate == true && typee === "Register" && (
            <>
              <Text style={styles.title}>{t("WhatsApp nummer")}</Text>
              <View style={styles.country}>
                <View style={{ width: '35%', }}>
                  <CountryPicker
                    countryFlagStyle={{
                      height: 22,
                      width: 32,
                      marginRight: 8,
                      borderRadius: 4,
                    }}
                    disable={false}
                    animationType="slide"
                    language="en"
                    pickerContainerStyle={styles.pickerStyle}
                    pickerTitleStyle={styles.pickerTitleStyle}
                    dropDownIcon={Images.down}
                    selectedCountryTextStyle={styles.selectedCountryTextStyle}
                    dropDownIconStyle={{ tintColor: Colors.black }}
                    countryNameTextStyle={styles.countryNameTextStyle}
                    searchBarPlaceHolder={t("Selecteer land")}
                    hideCountryFlag={false}
                    hideCountryCode={false}
                    searchBarContainerStyle={styles.searchBarStyle}
                    searchInputStyle={{ color: Colors.black }}
                    countryCode={countryCode}
                    selectedValue={selectedValue}
                  />
                </View>
                <TextInput
                  value={number}
                  onChangeText={handleTextChange}
                  placeholderTextColor={Colors.textgray}
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholder={t("Enter phone number")}
                />
              </View>




              <Text style={styles.error}>{numbererror}</Text>
            </>
          )}

          <>
            {complate == false ? (
              <Input
                value={commpny}
                onChangeText={(txt) => {
                  setcommpny(txt), setCompnyError("");
                }}
                title={t("Bedrijfsnaam")}
                error={CompnyError}
                iconSource={Images.company}
                autoCapitalize="none"
                keyboardType="default"
                required
              />
            ) : (
              <>
                {typee === "Login" && showWhatsApp && !showEmail && (
                  <>
                    <Text style={styles.title}>{t("WhatsApp nummer")}</Text>
                    <View style={styles.country}>
                      <View style={{ width: '35%', }}>
                        <CountryPicker
                          countryFlagStyle={{
                            height: 20,
                            width: 28,
                            marginRight: 2,
                          }}
                          disable={false}
                          animationType={"slide"}
                          language="en"

                          pickerContainerStyle={[styles.pickerStyle]}
                          pickerTitleStyle={styles.pickerTitleStyle}
                          dropDownIcon={Images.down}
                          selectedCountryTextStyle={
                            styles.selectedCountryTextStyle
                          }
                          dropDownIconStyle={{ tintColor: Colors.black }}
                          countryNameTextStyle={styles.countryNameTextStyle}
                          searchBarPlaceHolder={t("Selecteer land")}
                          hideCountryFlag={false}
                          hideCountryCode={false}
                          searchBarContainerStyle={styles.searchBarStyle}
                          searchInputStyle={{ color: Colors.black }}
                          countryCode={countryCode}
                          selectedValue={selectedValue}
                        />
                      </View>
                      <TextInput
                        value={number}
                        onChangeText={handleTextChange}
                        placeholderTextColor={Colors.textgray}
                        keyboardType="number-pad"
                        style={styles.input}
                      />
                    </View>
                    <Text style={[styles.error, { textAlign: 'center' }]}>{numbererror}</Text>
                  </>
                )}

                {typee === "Login" && showEmail && !showWhatsApp && (
                  <Input
                    value={email}
                    onChangeText={(txt) => {
                      setEmail(txt);
                      setEmailError("");
                    }}
                    title={"E-mail"}
                    iconSource={Images.mail}
                    error={emailError}
                  />
                )}
              </>
            )}

            <ButtonComponent
              onPress={() => {
                if (complate == true) {
                  if (typee == "Login") {
                    onLogin();
                  } else {
                    onRegisterNumber();
                  }
                } else {
                  onRegisterCompany();
                }
              }}
              marginTop={RFValue(25)}
              title={typee == "Login" ? t("Inloggen") : t("Registreren")}
            />
          </>
        </View>

        {typee === "Login" &&
          complate == true &&
          showWhatsApp &&
          !showEmail && (
            <Text
              onPress={() => {
                setShowEmail(true);
                setShowWhatsapp(false);
              }}
              style={styles.loginwithemail}
            >
              {t("Login Met E-mail Adres")}
            </Text>
          )}
        {typee === "Login" && complate == true && showEmail && (
          <Text
            onPress={() => {
              setShowWhatsapp(true);
              setShowEmail(false);
            }}
            style={styles.loginwithphone}
          >
            {t("Login Met WhatsApp Nummer")}
          </Text>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default Register;
