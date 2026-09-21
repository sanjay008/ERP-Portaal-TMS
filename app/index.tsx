import BottomTabs from "@/src/bottomTabs/BottomTabs";
import AdminBaseUrlGate from "@/src/components/AdminBaseUrlGate";
import LayoutHeader from "@/src/components/_LayoutHeader";
import ChauffeurLocationBootstrap from "@/src/components/ChauffeurLocationBootstrap";
import CustomCamera from "@/src/components/CustomCamera";
import DriverGPSTraking from "@/src/components/DriverGPSTraking";
import DropboxUploadRunner from "@/src/components/DropboxUploadRunner";
import GlobalContext from "@/src/context/GlobalContext";
import Chat from "@/src/screens/Chat/Chat";
import DeliveryScreens from "@/src/screens/Delivery/DeliveryScreens";
import DetailsScreens from "@/src/screens/Details/DetailsScreens";
import CompanyFormScreen from "@/src/screens/DriverCompany/CompanyFormScreen";
import DriverCompanyScreen from "@/src/screens/DriverCompany/DriverCompanyScreen";
import DriverProfileScreen from "@/src/screens/DriverProfile/DriverProfileScreen";
import FilterScreen from "@/src/screens/FilterDataScreen/FilterScreen";
import HomeScreens from "@/src/screens/Home/HomeScreens";
import LanguageScreens from "@/src/screens/Language/LanguageScreens";
import LoadedScreens from "@/src/screens/Loaded/LoadedScreens";
import MapsScreens from "@/src/screens/Maps/MapsScreens";
import MasterDriver from "@/src/screens/MasterDriver/MasterDriver";
import NoInternet from "@/src/screens/NoInternet/NoInternet";
import AllOrder from "@/src/screens/Order Analysis/AllOrder";
import OrderDetails from "@/src/screens/Order Analysis/OrderDetails";
import ScanDetails from "@/src/screens/Order Analysis/ScanDetails";
import ScanManager from "@/src/screens/Order Analysis/ScanManager";
import WarehouseOrderEdit from "@/src/screens/Order Analysis/WarehouseOrderEdit";
import Parcel from "@/src/screens/Parcel/Parcel";
import Profile from "@/src/screens/Profile/Profile";
import RejectionReview from "@/src/screens/Rejection/RejectionReview";
import RejectionScanner from "@/src/screens/Rejection/RejectionScanner";
import DriverPhotosScanner from "@/src/screens/Scanner/DriverPhotosScanner";
import ScannerScreens from "@/src/screens/Scanner/ScannerScreens";
import SelectLanguage from "@/src/screens/selectionLan/Selectionlan";
import SplashScreens from "@/src/screens/SplashScreens/SplashScreens";
import i18n from "@/src/screens/Translation/i18n";
import DocumentUploadScreen from "@/src/screens/UploadDocuments/DocumentUploadScreen";
import UploadDocumentsScreen from "@/src/screens/UploadDocuments/UploadDocumentsScreen";
import WebViewScreeens from "@/src/screens/WebView/WebViewScreeens";
import { Colors } from "@/src/utils/colors";
import NetInfo from "@react-native-community/netinfo";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { StatusBar, View } from "react-native";
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import { MenuProvider } from "react-native-popup-menu";
import OnBoarding from "../src/screens/onbording";
import Otp from "../src/screens/otp";
import Password from "../src/screens/password";
import Register from "../src/screens/register";
import Staff from "../src/screens/staff";

const ADMIN_TAP_BLOCKED_ROUTES = new Set([
  "Scanner",
  "RejectionScanner",
  "DriverPhotosScanner",
  "Camera",
  "ScanManager",
]);

const Stack = createNativeStackNavigator();
const OfflineStack = createNativeStackNavigator();

function getActiveRouteName(state: any): string {
  if (!state?.routes?.length) {
    return "";
  }
  const route = state.routes[state.index ?? 0];
  if (route?.state) {
    return getActiveRouteName(route.state);
  }
  return route?.name ?? "";
}

function withLayoutHeader(Component: React.ComponentType<any>) {
  function Wrapped(props: any) {
    return (
      <LayoutHeader>
        <Component {...props} />
      </LayoutHeader>
    );
  }
  Wrapped.displayName = `WithLayoutHeader(${Component.displayName || Component.name || "Component"})`;
  return Wrapped;
}

const DetailsWithHeader = withLayoutHeader(DetailsScreens);
const AllOrderWithHeader = withLayoutHeader(AllOrder);
const OrderDetailsWithHeader = withLayoutHeader(OrderDetails);
const ScanDetailsWithHeader = withLayoutHeader(ScanDetails);
const BottomTabsWithHeader = withLayoutHeader(BottomTabs);
const ScannerWithHeader = withLayoutHeader(ScannerScreens);
const RejectionScannerWithHeader = withLayoutHeader(RejectionScanner);
const RejectionReviewWithHeader = withLayoutHeader(RejectionReview);
const DriverPhotosScannerWithHeader = withLayoutHeader(DriverPhotosScanner);
const SelectWithHeader = withLayoutHeader(SelectLanguage);
const MasterDriverWithHeader = withLayoutHeader(MasterDriver);
const LoadingWithHeader = withLayoutHeader(LoadedScreens);
const ScanManagerWithHeader = withLayoutHeader(ScanManager);
const WarehouseOrderEditWithHeader = withLayoutHeader(WarehouseOrderEdit);
const ParcelWithHeader = withLayoutHeader(Parcel);
const ChatWithHeader = withLayoutHeader(Chat);
const ProfileWithHeader = withLayoutHeader(Profile);
const MapsScreensWithHeader = withLayoutHeader(MapsScreens);
const LanguageWithHeader = withLayoutHeader(LanguageScreens);
const DriverCompanyWithHeader = withLayoutHeader(DriverCompanyScreen);
const DriverCompanyFormWithHeader = withLayoutHeader(CompanyFormScreen);
const UploadDocumentsWithHeader = withLayoutHeader(UploadDocumentsScreen);
const DriverProfileWithHeader = withLayoutHeader(DriverProfileScreen);
const DocumentUploadWithHeader = withLayoutHeader(DocumentUploadScreen);
const DeliveryWithHeader = withLayoutHeader(DeliveryScreens);
const WebViewWithHeader = withLayoutHeader(WebViewScreeens);
const HomeWithHeader = withLayoutHeader(HomeScreens);
const FilterScreenWithHeader = withLayoutHeader(FilterScreen);
const CameraWithHeader = withLayoutHeader(CustomCamera);

export default function index() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [currentRoute, setCurrentRoute] = useState<string>("");

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsConnected(state.isConnected);
    });
    navigationBackground();
    return () => unsubscribe();
  }, []);

  const navigationBackground = async () => {
    try {
      const response = await changeNavigationBarColor(Colors.white);
      console.log(response);
    } catch (e) {
      console.log(e); 
    }
  };

  const adminTapBlocked = ADMIN_TAP_BLOCKED_ROUTES.has(currentRoute);
    
  return (
    <>
      <I18nextProvider i18n={i18n}>
        <MenuProvider>
          <StatusBar barStyle='dark-content'/>
          <GlobalContext>
            <DropboxUploadRunner />
            <ChauffeurLocationBootstrap />
            <DriverGPSTraking />
            <AdminBaseUrlGate blocked={adminTapBlocked}>
            <View style={{ flex: 1 }}>
            {isConnected ? (
              <Stack.Navigator
                id="MainStack"
                initialRouteName={"SplashScreens"}
                screenOptions={{
                  headerShown: false,
                  animation: "simple_push",
                }}
                screenListeners={{
                  state: (e) => {
                    setCurrentRoute(getActiveRouteName(e.data.state));
                  },
                }}
              >
                <Stack.Screen name="SplashScreens" component={SplashScreens} />
                <Stack.Screen name="OnBoarding" component={OnBoarding} />
                <Stack.Screen name="Otp" component={Otp} />
                <Stack.Screen name="Password" component={Password} />
                <Stack.Screen name="Register" component={Register} />
                <Stack.Screen name="Staff" component={Staff} />
                <Stack.Screen
                  name="Details"
                  component={DetailsWithHeader}
                  options={{ statusBarAnimation: "slide" }}
                />
                <Stack.Screen
                  name="AllOrder"
                  component={AllOrderWithHeader}
                  options={{ statusBarAnimation: "slide" }}
                />
                <Stack.Screen
                  name="OrderDetails"
                  component={OrderDetailsWithHeader}
                  options={{ statusBarAnimation: "slide" }}
                />
                <Stack.Screen
                  name="ScanDetails"
                  component={ScanDetailsWithHeader}
                  options={{ statusBarAnimation: "slide" }}
                />
                <Stack.Screen
                  name="BottomTabs"
                  component={BottomTabsWithHeader}
                />
                <Stack.Screen
                  name="Scanner"
                  options={{ statusBarAnimation: "slide",gestureEnabled: false, }}
                  component={ScannerWithHeader}
                />
                <Stack.Screen
                  name="RejectionScanner"
                  options={{ statusBarAnimation: "slide", gestureEnabled: false }}
                  component={RejectionScannerWithHeader}
                />
                <Stack.Screen
                  name="RejectionReview"
                  options={{ statusBarAnimation: "slide", gestureEnabled: false }}
                  component={RejectionReviewWithHeader}
                />
                <Stack.Screen
                  name="DriverPhotosScanner"
                  options={{ statusBarAnimation: "slide", gestureEnabled: false }}
                  component={DriverPhotosScannerWithHeader}
                />
                <Stack.Screen
                  name="Select"
                  component={SelectWithHeader}
                />
                <Stack.Screen
                  name="MasterDriver"
                  component={MasterDriverWithHeader}
                />
                <Stack.Screen
                  name="Loading"
                  component={LoadingWithHeader}
                />
                <Stack.Screen
                  name="ScanManager"
                  component={ScanManagerWithHeader}
                />
                <Stack.Screen
                  name="WarehouseOrderEdit"
                  component={WarehouseOrderEditWithHeader}
                />
                <Stack.Screen
                  name="Parcel"
                  component={ParcelWithHeader}
                />
                <Stack.Screen name="Chat" component={ChatWithHeader} />
                <Stack.Screen
                  name="Profile"
                  component={ProfileWithHeader}
                />
                <Stack.Screen
                  name="MapsScreens"
                  component={MapsScreensWithHeader}
                />
                <Stack.Screen
                  name="Language"
                  component={LanguageWithHeader}
                />
                <Stack.Screen
                  name="DriverCompany"
                  component={DriverCompanyWithHeader}
                />
                <Stack.Screen
                  name="DriverCompanyForm"
                  component={DriverCompanyFormWithHeader}
                />
                <Stack.Screen
                  name="UploadDocuments"
                  component={UploadDocumentsWithHeader}
                />
                <Stack.Screen
                  name="DriverProfile"
                  component={DriverProfileWithHeader}
                />
                <Stack.Screen
                  name="DocumentUpload"
                  component={DocumentUploadWithHeader}
                />
                <Stack.Screen
                  name="Delivery"
                  component={DeliveryWithHeader}
                />
                <Stack.Screen
                  name="WebViewScreeens"
                  component={WebViewWithHeader}
                />
                <Stack.Screen
                  name="Home"
                  component={HomeWithHeader}
                />
                <Stack.Screen
                  name="MapScreens"
                  options={{
                    animation: "slide_from_right",
                  }}
                  component={MapsScreensWithHeader}
                />
                <Stack.Screen
                  name="FilterScreen"
                  component={FilterScreenWithHeader}
                />
                <Stack.Screen
                  name="Camera"
                  component={CameraWithHeader}
                />
              </Stack.Navigator>
            ) : (
              <OfflineStack.Navigator
                id="NoInternetStack"
                initialRouteName={"NoInternet"}
                screenOptions={{
                  headerShown: false,
                  animation: "simple_push",
                }}
              >
                <OfflineStack.Screen name="NoInternet" component={NoInternet} />
              </OfflineStack.Navigator>
            )}
            </View>
            </AdminBaseUrlGate>
          </GlobalContext>
        </MenuProvider>
      </I18nextProvider>
    </>
  );
}
