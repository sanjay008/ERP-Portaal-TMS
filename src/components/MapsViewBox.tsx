import React, { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import {
  areLocationServicesEnabled,
  checkLocationPermission,
  getSafeCurrentPosition,
} from "../hooks/useUserGPS";
import { Colors } from "../utils/colors";
import { resolveOrderNavigationDestination } from "../utils/regionCoordinates";
import { FONTS, width } from "../utils/storeData";
import { useErrorHandle } from "./ErrorHandle";
import LoadingModal from "./LoadingModal";

type MapsData = {
  data?: string[] | any;
  onPress?: () => void;
  msg?: any | string;
  orderStatusId?: number | string | null;
  pickupRegionData?: unknown;
  deliveryRegionData?: unknown;
  orderData?: Record<string, unknown> | null;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type MapAppOption = {
  key: string;
  label: string;
  appUrl: string;
  fallbackUrl?: string;
};

const OPTION_ACCENTS: Record<string, { background: string; letter: string }> = {
  apple: { background: "#1C1C1E", letter: "A" },
  google: { background: "#4285F4", letter: "G" },
  waze: { background: "#05C3DD", letter: "W" },
};

export default function MapsViewBox({
  onPress,
  msg = null,
  orderStatusId = null,
  pickupRegionData = null,
  deliveryRegionData = null,
  orderData = null,
}: MapsData) {
  const { t } = useTranslation();
  const { setToast } = useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();
  const [IsLoading, setIsLoading] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [mapOptions, setMapOptions] = useState<MapAppOption[]>([]);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);

  const destination = useMemo(
    () =>
      resolveOrderNavigationDestination({
        orderData,
      }),
    [orderStatusId, pickupRegionData, deliveryRegionData, orderData],
  );

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const [permission, servicesEnabled] = await Promise.all([
          checkLocationPermission(),
          areLocationServicesEnabled(),
        ]);

        if (!permission.granted || !servicesEnabled) return;

        const current = await getSafeCurrentPosition();
        if (isMounted && current?.coords) {
          setCurrentCoords({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          });
        }
      } catch {}
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const buildGoogleMapsUrl = (
    startLat: number,
    startLng: number,
    destLat: number,
    destLng: number,
  ) =>
    `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destLat},${destLng}&travelmode=driving`;

  const buildIosMapOptions = (
    startLat: number,
    startLng: number,
    destLat: number,
    destLng: number,
  ): MapAppOption[] => {
    const appleUrl = `maps://?saddr=${startLat},${startLng}&daddr=${destLat},${destLng}&dirflg=d`;
    const googleUniversalUrl = buildGoogleMapsUrl(startLat, startLng, destLat, destLng);
    const wazeAppUrl = `waze://?ll=${destLat},${destLng}&navigate=yes`;
    const wazeWebUrl = `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`;

    return [
      {
        key: "apple",
        label: "Apple Maps",
        appUrl: appleUrl,
        fallbackUrl: appleUrl,
      },
      {
        key: "google",
        label: "Google Maps",
        appUrl: googleUniversalUrl,
      },
      {
        key: "waze",
        label: "Waze",
        appUrl: wazeAppUrl,
        fallbackUrl: wazeWebUrl,
      },
    ];
  };

  const openMapOption = async (option: MapAppOption) => {
    setIsPickerVisible(false);
    try {
      await Linking.openURL(option.appUrl);
    } catch {
      if (!option.fallbackUrl) return;
      try {
        await Linking.openURL(option.fallbackUrl);
      } catch (error: any) {
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: "error",
          visible: true,
        });
      }
    }
  };

  const openGoogleMapsDirect = async (
    startLat: number,
    startLng: number,
    destLat: number,
    destLng: number,
  ) => {
    const googleUniversalUrl = buildGoogleMapsUrl(startLat, startLng, destLat, destLng);
    try {
      await Linking.openURL(googleUniversalUrl);
    } catch (error: any) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    }
  };

  const redirectWithCoords = async (
    startLat: number,
    startLng: number,
    destLat: number,
    destLng: number,
  ) => {
    if (Platform.OS === "android") {
      await openGoogleMapsDirect(startLat, startLng, destLat, destLng);
      return;
    }
    const options = buildIosMapOptions(startLat, startLng, destLat, destLng);
    setMapOptions(options);
    setIsPickerVisible(true);
  };

  const MapAppRedirectFun = async () => {
    if (onPress) {
      onPress();
      return;
    }

    if (!destination) {
      setToast({
        top: 45,
        text: t(msg ?? "Destination location is unavailable"),
        type: "error",
        visible: true,
      });
      return;
    }

    const { latitude: destLat, longitude: destLng } = destination;

    if (currentCoords) {
      await redirectWithCoords(currentCoords.latitude, currentCoords.longitude, destLat, destLng);
      return;
    }

    try {
      setIsLoading(true);

      const [permission, servicesEnabled] = await Promise.all([
        checkLocationPermission(),
        areLocationServicesEnabled(),
      ]);

      if (!permission.granted) {
        setToast({
          top: 45,
          text: t("Location permission denied"),
          type: "error",
          visible: true,
        });
        return;
      }

      if (!servicesEnabled) {
        setToast({
          top: 45,
          text: t("Current location is unavailable. Make sure that location services are enabled"),
          type: "error",
          visible: true,
        });
        return;
      }

      const current = await getSafeCurrentPosition();
      if (!current?.coords) {
        setToast({
          top: 45,
          text: t("Current location is unavailable. Make sure that location services are enabled"),
          type: "error",
          visible: true,
        });
        return;
      }

      setCurrentCoords({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });

      await redirectWithCoords(current.coords.latitude, current.coords.longitude, destLat, destLng);
    } catch (error: any) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: "error",
        visible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={Images.MapsImage} style={styles.MapStyle} />
      <TouchableOpacity style={styles.Button} onPress={MapAppRedirectFun}>
        <Text style={styles.Text}>{t("Start")}</Text>
      </TouchableOpacity>
      <LoadingModal visible={IsLoading} message={t("Please wait…")} />

      <Modal
        visible={isPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.Overlay}
          activeOpacity={1}
          onPress={() => setIsPickerVisible(false)}
        >
          <View style={styles.SheetContainer}>
            <View style={styles.SheetHandle} />
            <Text style={styles.SheetTitle}>{t("Choose navigation app")}</Text>
            <Text style={styles.SheetSubtitle}>
              {t("Select an app to start turn-by-turn navigation")}
            </Text>
            {mapOptions.map((option) => {
              const accent = OPTION_ACCENTS[option.key] ?? {
                background: Colors.primary,
                letter: option.label.charAt(0),
              };
              return (
                <TouchableOpacity
                  key={option.key}
                  style={styles.OptionCard}
                  activeOpacity={0.7}
                  onPress={() => openMapOption(option)}
                >
                  <View
                    style={[
                      styles.IconBadge,
                      { backgroundColor: accent.background },
                    ]}
                  >
                    <Text style={styles.IconBadgeText}>{accent.letter}</Text>
                  </View>
                  <Text style={styles.OptionLabel}>{t(option.label)}</Text>
                  <Text style={styles.Chevron}>{"\u203A"}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.CancelButton}
              activeOpacity={0.7}
              onPress={() => setIsPickerVisible(false)}
            >
              <Text style={styles.CancelText}>{t("Cancel")}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 4,
    backgroundColor: Colors.white,
    padding: 15,
  },
  MapStyle: {
    width: "100%",
    height: width / 2,
  },
  Button: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: Colors.primary,
    borderRadius: 5,
    position: "absolute",
    right: 25,
    bottom: 25,
  },
  Text: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: FONTS.Medium,
  },
  Overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  SheetContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  SheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D1D6",
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  SheetTitle: {
    fontSize: 18,
    fontFamily: FONTS.Medium,
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 4,
  },
  SheetSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 20,
  },
  OptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F7F9",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  IconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  IconBadgeText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FONTS.Medium,
  },
  OptionLabel: {
    flex: 1,
    fontSize: 15,
    color: "#1C1C1E",
    fontFamily: FONTS.Medium,
  },
  Chevron: {
    fontSize: 20,
    color: "#C7C7CC",
  },
  CancelButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#F0F0F3",
    alignItems: "center",
  },
  CancelText: {
    fontSize: 15,
    fontFamily: FONTS.Medium,
    color: "#1C1C1E",
  },
});