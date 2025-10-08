import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  // SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
// 

import { RFValue } from "react-native-responsive-fontsize";

import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { CommonActions } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import DatePicker from "react-native-date-picker";
import Modal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import SelectDropdown from "react-native-select-dropdown";
import ApiService from "../../utils/Apiservice";
// import { RegisterBackContext } from "../../utils/GoBackContext";
import { GlobalContextData } from "@/src/context/GlobalContext";
// import "react-native-get-random-values";
import apiConstants from "../../api/apiConstants";
import { Images } from "../../assets/images";
import ButtonComponent from "../../components/buttonComponent";
import Input from "../../components/input";
import Loader from "../../components/loading";
import { Colors } from "../../utils/colors";
import { getData, storeData } from "../../utils/storeData";

// const GOOGLE_API_KEY = "AIzaSyBVCjdibPBQN8s0Iy06ITwgMvrRZZRLcog";

const Staff = ({ navigation, route }) => {
    const {
            GOOGLE_API_KEY,setGOOGLE_API_KEY,
            CompanyLogo,setCompanyLogo,
            Permission,setPermission,
            SelectLanguage,setSelectLanguage
          } = useContext(GlobalContextData);
  const { width } = Dimensions.get("screen");
  const { logo } = route.params || "";
  const { userId } = route.params || "";
  const { type } = route.params || "";
  const { typeId } = route.params || "";
  const { verify_token } = route.params || "";
  const { category_id } = route.params || "";
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [fname, setFname] = useState("");
  const [fnameError, setFnameError] = useState("");
  const [mname, setMname] = useState("");
  const [mnameError, setMnameError] = useState("");
  const [lname, seLname] = useState("");
  const [lnameError, setLnameError] = useState("");
  const [saluteError, setSaluteError] = useState("");
  const [departmentError, setdepartmentError] = useState("");
  const [one, setOne] = useState("");
  const [three, setThree] = useState("");
  const [four, setFour] = useState("");
  const [loading, setLoding] = useState(false);
  const [fcomplate, setFcomplate] = useState(false);
  const [scomplate, setScomplate] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalOptionsVisible, setModalOptionsVisible] = useState(false);
  const [image, setImage] = useState(null);
  const [focus, setFocus] = useState(false);
  const [data, setData] = useState("");
  const googlePlacesRef = useRef(null);
  const [click, setClick] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const { t } = useTranslation();
  const [selectedItemdepartmnt, setSelectedItemdepartmnt] = useState({});
  const [selectedItem, setSelectedItem] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDecade, setSelectedDecade] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [finalDate, setFinalDate] = useState(null); // To hold the final selected date
  const [birthaddress, setBirthAddress] = useState("");
  const [addresserror, setaddressError] = useState("");
  const [dateerror, setDateError] = useState("");
  const [date, setDate] = useState(null);
  const [open, setOpen] = useState(false);


  const handleSelectItem = (selectedItem, index) => {
    setSelectedItem(selectedItem);
    setSaluteError("");
  };

  const FristNext = () => {
    if (
      Object.keys(selectedItem).length === 0 &&
      selectedItem.constructor === Object
    ) {
      console.log("--saluteError-----");
      setSaluteError(t("Selecteer alstublieft"));
    } else if (fname == "") {
      setFnameError(t("Voer uw voornaam in"));
    } else if (lname == "") {
      setLnameError(t("Voer achternaam in"));
    } else if (!date) {
      // Check if birth date is not selected
      setDateError(t("Selecteer geboortedatum"));
    } else if (birthaddress == "") {
      setaddressError(t("Voer geboorte adres in"));
    } else {
      setLoding(true);
      setTimeout(() => {
        setFcomplate(true);
        setLoding(false);
      }, 1000);
    }
  };

  const SecondNext = () => {
    logAddressText();

    const regex = /^[\w+.-]+@[\w.-]+\.[a-zA-Z]{2,}$/;
    if (email == "") {
      setEmailError(t("Voer uw e-mailadres in"));
      setLoding(false);
    } else if (!regex.test(email)) {
      setEmailError(t("Voer een geldig emailadres in"));
      setLoding(false);
    } else if (!address) {
      setAddressError(t("Voer het adres in"));
      setLoding(false);
    } else {
      //   setAddress(addressText);
      setLoding(true);
      setAddressError("");
      setTimeout(() => {
        setScomplate(true);
        setLoding(false);
      }, 1000);

      //   if (googlePlacesRef.current) {
      //     const addressText = googlePlacesRef.current?.getAddressText();
      //     if (addressText) {
      //       setAddress(addressText);
      //       setLoding(true);
      //       setAddressError("");
      //       setTimeout(() => {
      //         setScomplate(true);
      //         setLoding(false);
      //       }, 1000);
      //     } else {
      //       setAddressError(t("Voer het adres in"));
      //       setLoding(false);
      //     }
      //   } else {
      //     setAddressError(t("Voer het adres in"));
      //     setLoding(false);
      //   }
    }
  };

  const logAddressText = () => {
    if (googlePlacesRef.current) {
      const addressText = googlePlacesRef.current?.getAddressText();
      if (addressText) {
        console.log(addressText, "address");
        setAddress(addressText);
      } else {
        setAddressError(t("Voer het adres in"));
      }
    }
  };

  const handleTextChange = (text) => {
    console.log(text, "input value222222222");
    if (googlePlacesRef.current) {
      const addressText = googlePlacesRef.current?.getAddressText();
      console.log(addressText, "address text from getAddressText method");
      if (addressText) {
        setAddress(addressText);
      }
    }
  };

const openGallery = async () => {
  try {
    // Ask for permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Gallery access is required to select photos.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => ImagePicker.getMediaLibraryPermissionsAsync() },
        ]
      );
      return;
    }

    // Launch gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets);
      setdepartmentError("");
      setModalOptionsVisible(false);
    }
  } catch (error) {
    console.warn("Gallery error:", error);
  }
};


const OpenCamera = async () => {
  try {
    
    const { status } = await Camera.requestCameraPermissionsAsync();

    if (status === "granted") {
      console.log("Camera permission granted");
      executeCamera(); 
    } else if (status === "denied") {
     
      Alert.alert(
        "Permission Denied",
        "Camera access is required to use this feature. Please enable it from the app settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
    } else {
     
      Alert.alert(
        "Permission Required",
        "Camera access is permanently denied. Please enable it from app settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
    }
  } catch (error) {
    console.warn("Permission request error: ", error);
  }
};

const executeCamera = async () => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      aspect: [1, 1], 
      base64: false,
    });

    if (result.canceled) {
      console.log("User cancelled image picker");
      return;
    }

    const photo = result.assets[0];
    console.log("Response URI: ", photo.uri);

    
    setImage(result.assets);
    setdepartmentError("");
    setModalOptionsVisible(false);
  } catch (error) {
    console.error("Camera Error: ", error);
    Alert.alert("Error", "Failed to open camera. Please try again.");
  }
};

  const onRegister = async () => {
    if (!image) {
      setdepartmentError("Selecteer profile");
      console.log("profile");
    } else {
      setLoding(true);
      try {
        const data = await ApiService(apiConstants.createUserWithRelaties, {
          customData: {
            token: verify_token,
            user_id: userId,
            relaties_type: type,
            relaties_type_id: typeId,
            aanhef: selectedItem.title,
            voornaam: fname,
            voorvoegsel: mname,
            achternaam: lname,
            email: email,
            address: address,
            department: null,
            category_id: category_id,
            bedrijfsnaam: one ? one : null,
            woning_name: three ? three : null,
            voertuig_project: four ? focus : null,
            profile_image: image
              ? {
                uri: image[0].uri,
                name: "image",
                type: image[0].type,
              }
              : "",
            birth_place: birthaddress,
            birth_date: date,
          },
        });
        if (data.status) {
          storeData("USERDATA", data);
          console.log("userdata", data.user);
          storeData("LOGIN", true);
          storeData("AUTH", true);
          setTimeout(() => {
            setLoding(false);
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                // routes: [{ name: "BottamScreens" }],
                routes: [{ name: "Home" }],
              })
            );
            // setModalVisible(true);
          }, 1000);
        } else {
          console.log("false");
          setTimeout(() => {
            setLoding(false);
          }, 1000);
          console.log("----------cvfvf--", data);
          Alert.alert("Oops!", data.message, [
            { text: "OK", onPress: () => console.log("OK Pressed") },
          ]);
        }
      } catch (err) {
        console.log("Error fetching create:", err);
      }
    }
  };

  const Department_List = async () => {
    try {
      const company = await getData("COMPANYLOGIN");
      const data = await ApiService(apiConstants.departmentList, {
        customData: {
          company_login: company,
        },
      });
      if (data.status) {
        setData(data.data);
        // console.log(data.data, "dhvndfoibvhnd;i=======");
      } else {
        console.log("False connections");
      }
    } catch (err) {
      console.log("Error fetching connections department:", err);
    }
  };

  useEffect(() => {
    Department_List();
    getDataFun();
  }, []);
  const getDataFun = async () => {
    const GOOGLEMAPAPIKEY = await getData("google_maps_api_key");
    setGOOGLE_API_KEY(GOOGLEMAPAPIKEY);
  };

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredData(data);
    } else {
      const filtered = data.filter((item) =>
        item.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, data]);

  // const currentYear = new Date().getFullYear();
  // const decades = Array.from({ length: 12 }, (_, i) => currentYear - i * 10);
  const decades = Array.from({ length: 12 }, (_, i) => 1990 + i * 10);
  // console.log(decades,"dsjkhcfsdu");
  // Output: [1990, 2000, 2010, 2020, 2030, ...]

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const handleNextStep = () => {
    if (step === 1 && !selectedDecade) {
      Alert.alert("Error", "Please select a decade.");
      return;
    }
    if (step === 2 && !selectedYear) {
      Alert.alert("Error", "Please select a year.");
      return;
    }
    if (step === 3 && selectedMonth === null) {
      Alert.alert("Error", "Please select a month.");
      return;
    }
    if (step === 4 && !selectedDay) {
      Alert.alert("Error", "Please select a day.");
      return;
    }

    if (step === 4) {
      // setFinalDate(`${selectedMonth + 1}/${selectedDay}/${selectedYear}`);
      // const formattedDate = `${selectedYear}-${(selectedMonth + 1)
      //   .toString()
      //   .padStart(2, "0")}-${selectedDay.toString().padStart(2, "0")}`;
      setFinalDate(selectedDay.toString().padStart(2, "0"));
      setIsModalVisible(false); // Close modal after selecting the final date
      // console.log(formattedDate, "sihciosjv==---=");
    }

    setStep((prev) => prev + 1);
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const openModal = () => {
    setIsModalVisible(true);
    setStep(1);
    setSelectedDecade(null);
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
  };

  const formatDateToDDMMYYYY = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleDateChange = (selectedDate) => {
    const formattedDate = formatDateToDDMMYYYY(selectedDate);
    const formattedDateee = selectedDate.toISOString().split("T")[0];
    console.log("===== Formatted Date:", formattedDateee);
    setDate(formattedDateee);
    setOpen(false);
    setDateError("");
  };
  const fetchPermission = async () => {
    try {
      const getdata = await getData("USERDATA");
      if (
        !getdata ||
        !getdata.data ||
        !getdata.data.user ||
        !getdata.data.relaties
      ) {
        console.log("Missing required user data:", getdata);
        return;
      }

      const response = await ApiService(apiConstants.permission, {
        includeToken: true,
        customData: {
          relaties_id: getdata.data.relaties.id,
          user_id: getdata.data.user.id,
          role: getdata.data.user.role,
        },
      });

      if (response?.status && response?.data) {
        props.navigation.replace("BottamScreens1", {
          permission: response?.data,
        });
        setPermission(response?.data);
        // Alert.alert("Success")
        console.log(
          "response.data Permission==>",
          response.data.home_timeline?.read
        );
      }
    } catch (error) {
      console.log("Error fetching permission:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.white} barStyle={"dark-content"} />
      {loading && <Loader />}

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        enableOnAndroid
        extraScrollHeight={70}
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

          <Modal
            animationIn={"fadeIn"}
            transparent={true}
            visible={modalOptionsVisible}
            onRequestClose={() => {
              setModalOptionsVisible(false);
            }}
            onSwipeComplete={() => {
              setModalOptionsVisible(false);
            }}
            onBackdropPress={() => {
              setModalOptionsVisible(false);
            }}
            onBackButtonPress={() => {
              setModalOptionsVisible(false);
            }}
            swipeDirection="down"
            style={styles.modal}
          >
            <View style={styles.modalcontainer}>
              <View style={styles.modalheader}>
                <Text style={styles.headertext}>{t("Kies afbeelding")}</Text>
                <TouchableOpacity onPress={() => setModalOptionsVisible(false)}>
                  <Image style={styles.galleryicon} source={Images.close} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  setModalOptionsVisible(false);
                  OpenCamera();
                }}
              >
                <View style={styles.cameraimagebg}>
                  <Image
                    style={styles.galleryicon}
                    source={Images.camera}
                  ></Image>
                  <Text style={styles.gallerytext}>{t("Camera")}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  setModalOptionsVisible(true);
                  OpenGallary();
                }}
              >
                <View style={styles.galleryimagebg}>
                  <Image style={styles.galleryicon} source={Images.gallery} />

                  <Text style={styles.gallerytext}>{t("Galerij")}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Modal>
          {scomplate != true ? (
            <>
              {fcomplate != true ? (
                <>
                  {category_id == 1 ? (
                    <Input
                      value={one}
                      onChangeText={(txt) => {
                        setOne(txt);
                      }}
                      title={t("bedrijfsnaam")}
                      iconSource={Images.company}
                    />
                  ) : category_id == 3 ? (
                    <Input
                      value={three}
                      onChangeText={(txt) => {
                        setThree(txt);
                      }}
                      title={t("woning_name")}
                      iconSource={Images.company}
                    />
                  ) : category_id == 4 ? (
                    <Input
                      value={four}
                      onChangeText={(txt) => {
                        setFour(txt);
                      }}
                      title={t("voertuig_project")}
                      iconSource={Images.company}
                    />
                  ) : (
                    ""
                  )}

                  <Text style={[styles.title, { alignSelf: "flex-start" }]}>
                    {t("Aanhef")}*
                  </Text>
                  <SelectDropdown
                    data={[
                      { title: t("fam") },
                      { title: t("dhr") },
                      { title: t("mevr") },
                    ]}
                    onSelect={handleSelectItem}
                    renderButton={(item, isOpened) => {
                      return (
                        <View style={[styles.dropdownButtonStyle]}>
                          <Text style={[styles.dropdownButtonTxtStyle]}>
                            {selectedItem.title
                              ? selectedItem.title
                              : t("Selecteer Aanhef")}
                          </Text>
                          <Image
                            source={Images.down}
                            style={{
                              height: 20,
                              width: 20,
                              tintColor: Colors.black,
                            }}
                          />
                        </View>
                      );
                    }}
                    renderItem={(item, index, isSelected) => {
                      return (
                        <View
                          style={[
                            styles.dropdownItemStyle,
                            isSelected && { backgroundColor: Colors.white },
                          ]}
                        >
                          <Text style={styles.dropdownItemTxtStyle}>
                            {item.title}
                          </Text>
                        </View>
                      );
                    }}
                    showsVerticalScrollIndicator={false}
                    dropdownStyle={styles.dropdownMenuStyle}
                  />
                  <Text style={styles.error}>{saluteError}</Text>
                  <Input
                    value={fname}
                    style={{ width: '100%' }}
                    onChangeText={(txt) => {
                      setFname(txt), setFnameError("");
                    }}
                    title={
                      <Text>
                        {t("Voornaam")}
                        <Text> *</Text>
                      </Text>
                    }
                    error={fnameError}
                    iconSource={Images.name}
                  />
                  <Input
                    value={mname}
                    onChangeText={(txt) => {
                      setMname(txt), setMnameError("");
                    }}
                    title={t("Voorvoegsel")}
                    style={{ width: '100%' }}
                    iconSource={Images.name}
                  />
                  <Input
                    value={lname}
                    style={{ width: '100%' }}
                    onChangeText={(txt) => {
                      seLname(txt), setLnameError("");
                    }}
                    title={
                      <Text>
                        {t("Achternaam")}
                        <Text> *</Text>
                      </Text>
                    }
                    error={lnameError}
                    iconSource={Images.name}
                  />

                  <View
                    style={{ flex: 1 }}
                  // style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
                  >
                    <Text style={styles.selectedDateText}>geboortedatum *</Text>

                    <TouchableOpacity
                      style={[styles.dateInput, { justifyContent: "", }]}
                      onPress={() => setOpen(true)}
                    >
                      <Image
                        source={Images.date}
                        style={{
                          tintColor: Colors.textgray,
                          height: 24,
                          width: 24,
                        }}
                      />
                      <Text
                        style={{
                          color: date ? Colors.black : Colors.gray,
                          paddingLeft: 10,
                          fontFamily: 'regular',
                        }}
                      >
                        {date || t("Voer uw geboortedatum in")}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.error}>{dateerror}</Text>
                    <DatePicker
                      modal
                      mode="date"
                      date={date ? new Date(date) : new Date("1990")}
                      open={open}
                      locale="en-GB"
                      is24hourSource="locale"
                      androidVariant="nativeAndroid"
                      onConfirm={handleDateChange}
                      onCancel={() => {
                        setOpen(false);
                      }}
                      title={t("Voer geboortedatum in")}
                      confirmText="Select"
                      dividerColor={Colors.primary}
                      buttonColor={Colors.primary}
                    />
                  </View>

                  <Input
                    value={birthaddress}
                    onChangeText={(txt) => {
                      setBirthAddress(txt), setaddressError("");
                    }}
                    title={
                      <Text>
                        {t("geboorteplaats")}
                        <Text> *</Text>
                      </Text>
                    }
                    style={{ width: '100%' }}
                    error={addresserror}
                    iconSource={Images.location}
                  />

                  <ButtonComponent
                    onPress={() => {
                      setOpen(false), FristNext();
                    }}
                    // onPress={FristNext}
                    marginTop={RFValue(10)}
                    marginBottom={RFValue(10)}
                    title={t("Volgende")}
                  />
                </>
              ) : (
                <>
                  <Input
                    value={email}
                    onChangeText={(txt) => {
                      setEmail(txt), setEmailError("");
                    }}
                    title={t("E-mail")}
                    error={emailError}
                    iconSource={Images.mail}
                  />

                  {/* <Text
                    style={[
                      styles.title,
                      { marginTop: 10, alignSelf: "", marginVertical: "" },
                    ]}
                  >
                    {t("Adres")}
                  </Text> */}

                  <Input
                    value={address}
                    onChangeText={(txt) => {
                      setAddress(txt), setAddressError("");
                    }}
                    title={t("Adres")}
                    error={addressError}
                    iconSource={Images.location}
                  />

                  <ButtonComponent
                    onPress={SecondNext}
                    marginTop={RFValue(35)}
                    marginBottom={RFValue(10)}
                    title={t("Volgende")}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setModalOptionsVisible(true)}
                style={{ alignSelf: "center", marginVertical: 15, borderWidth: 1, borderRadius: 120 }}
              >
                <Image
                  source={image ? { uri: image[0].uri } : Images.addImage}
                  style={{ height: 100, width: 100, borderRadius: 7 }}
                />
              </TouchableOpacity>
              <Text style={styles.error}>{departmentError}</Text>

              <ButtonComponent
                onPress={onRegister}
                marginTop={RFValue(50)}
                marginBottom={RFValue(10)}
                title={t("Registreren")}
              />
            </>
          )}
        </View>

        {/* <Modal
          onBackdropPress={() => {
            setModalVisible(false);
          }}
          onBackButtonPress={() => {
            setModalVisible(false);
          }}
          style={styles.mview}
          visible={modalVisible}
        >
          <>
            <View style={styles.mcontainer}>
              <View style={styles.profilemodalheader} />
              <Image source={Images.user} style={styles.userimage} />
              <Text
                style={[
                  styles.wellcome,
                  {
                    alignSelf: "center",
                    marginBottom: 30,
                    marginTop: 80,
                    textAlign: "center",
                    width: "80%",
                  },
                ]}
              >
                {t("Do you want to complete the profile?")}
              </Text>
              <View style={{ alignItems: "center" }}>
                <ButtonComponent
                  onPress={() => {
                    setLoding(true), setModalVisible(false);
                    setTimeout(() => {
                      navigation.dispatch(
                        CommonActions.reset({
                          index: 1,
                          routes: [
                            {
                              name: "Profile",
                            },
                          ],
                        })
                      );
                      setLoding(false);
                      setRegisterBack(true);
                    }, 1000);
                  }}
                  marginTop={RFValue(10)}
                  marginBottom={RFValue(10)}
                  title={t("Go to Profile Page")}
                  width={"82%"}
                />
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false),
                      setLoding(true),
                      setTimeout(() => {
                        navigation.dispatch(
                          CommonActions.reset({
                            index: 0,
                            // routes: [{ name: "BottamScreens" }],
                            routes: [{ name: "BottamScreens1" }],
                          })
                        );
                        setLoding(false);
                      }, 1000);
                  }}
                  style={styles.remindmenexttext}
                >
                  <Text style={[styles.title, { marginTop: 0 }]}>
                    {t("Remind Me Next Time")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        </Modal> */}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default Staff;

const styles = StyleSheet.create({
  dateInput: {
    // width: widthPercentageToDP(90),
    // height: heightPercentageToDP(7),
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderColor: Colors.litegray,
    borderWidth: 1,
    paddingHorizontal: 15,
    alignItems: "center",
    marginTop: 5,
    flexDirection: "row",
    // marginHorizontal: 20,
    marginBottom: 10,
    justifyContent: "space-between",
    // marginHorizontal: 20,
    paddingVertical: 10
  },
  dateText: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: 'regular',
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
  },
  // title: {
  //   fontSize: 20,
  //   marginBottom: 10,
  //   textAlign: "center",
  // },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  decadeButton: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    margin: 5,
    borderRadius: 5,
  },
  yearButton: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    margin: 5,
    borderRadius: 5,
  },
  monthButton: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    margin: 5,
    borderRadius: 5,
  },
  selected: {
    backgroundColor: Colors.primary,
  },
  selectedDateText: {
    fontSize: RFValue(14),
    fontFamily: 'Medium',
    color: Colors.black,
    marginTop: RFValue(5),
    // marginHorizontal: 20,
  },
  button: {
    padding: 10,
    backgroundColor: Colors.primary,
    margin: 5,
    borderRadius: 5,
    alignItems: "center",
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  }, ///
  result: {
    fontSize: 18,
    textAlign: "center",
  },
  safe: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  wellcome: {
    fontSize: RFValue(17),
    fontFamily: "SemiBold",
    color: Colors.black,
    marginTop: 40,

  },
  dis: {
    fontSize: RFValue(14),
    fontFamily: 'regular',
    color: Colors.textgray,
    marginTop: 8,
    marginBottom: 15,
  },
  logo: {
    alignSelf: "center",
    marginTop: RFValue(40),
  },
  container: {
    paddingHorizontal: 24,
  },
  subContainer: {
    flex: 1,
  },
  dropdownButtonStyle: {
    height: RFValue(45),
    borderWidth: 1,
    borderColor: Colors.litegray,
    width: "100%",
    borderRadius: 7,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: RFValue(5),
  },
  dropdownButtonTxtStyle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'regular',
    color: Colors.black,
  },
  dropdownMenuStyle: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    fontFamily: 'regular',
    color: Colors.black,
  },
  dropdownItemStyle: {
    width: "100%",
    flexDirection: "row",
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  dropdownItemTxtStyle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'regular',
    color: Colors.black,
  },
  title: {
    fontSize: RFValue(16),
    fontFamily: 'regular',
    color: Colors.black,
    alignSelf: "center",
    marginVertical: RFValue(15),
  },
  error: {
    color: Colors.red,
    fontSize: RFValue(10),
    fontFamily: 'regular',
    marginTop: RFValue(1),
  },
  mview: {
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    margin: 0,
    backgroundColor: Colors.transparant,
  },
  mcontainer: {
    flex: 1,
    position: "absolute",
    borderRadius: 26,
    backgroundColor: "#F9FDFF",
    width: "100%",
    overflow: "hidden",
  },
  textInputContainer: {
    height: RFValue(45),
    borderWidth: 1,
    borderColor: Colors.litegray,
    borderRadius: 10,
    alignItems: "center",
    paddingHorizontal: 10,
    marginTop: RFValue(5),
    color: Colors.black,
    fontFamily: 'regular',
  },
  textInput: {
    fontSize: 15,
    color: Colors.black,
    fontFamily: 'regular',
    paddingLeft: 35,
    backgroundColor: "transparent",
  },
  predefinedPlacesDescription: {
    color: "#1faadb",
    color: Colors.black,
    fontFamily: 'regular',
  },
  address: {
    flex: 1,
    color: Colors.black,
    fontFamily: 'regular',
  },
  error: {
    color: Colors.red,
    fontSize: RFValue(10),
    fontFamily: 'regular',
    marginTop: RFValue(1),
  },

  option: {
    padding: 10,
    color: Colors.black,
  },
  searchInput: {
    height: RFValue(40),
    borderColor: Colors.litegray,
    borderWidth: 1,
    borderRadius: 5,
    margin: RFValue(10),
    paddingHorizontal: RFValue(10),
    fontSize: RFValue(14),
    fontFamily: 'regular',
  },
  galleryimagebg: {
    width: 342,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.litegray,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  galleryicon: {
    height: 24,
    width: 24,
  },
  gallerytext: {
    color: Colors.black,
    fontFamily: 'regular',
    paddingLeft: 5,
  },
  cameraimagebg: {
    width: 342,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.litegray,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  modal: {
    justifyContent: "flex-end",
    margin: 0,
    backgroundColor: Colors.transparant,
  },
  modalcontainer: {
    flex: 1,
    position: "absolute",
    bottom: 0,
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
    backgroundColor: Colors.white,
    width: "100%",
    paddingTop: 20,
    paddingBottom: 35,
  },
  modalheader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  headertext: {
    borderBottomWidth: 1,
    borderColor: Colors.black,
    color: Colors.black,
    fontSize: 17,
    paddingBottom: 15,
  },
  profilemodalheader: {
    height: 380,
    width: 380,
    backgroundColor: "#E0F0FF",
    borderRadius: 200,
    position: "absolute",
    top: -210,
    alignSelf: "center",
  },
  userimage: {
    height: 100,
    width: 100,
    alignSelf: "center",
    marginTop: 30,
  },
  remindmenexttext: {
    height: RFValue(41),
    width: "82%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: RFValue(10),
    marginBottom: RFValue(30),
    borderWidth: 1,
    borderColor: Colors.litegray,
  },
});
