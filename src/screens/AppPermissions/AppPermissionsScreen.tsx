import DetailsHeader from "@/src/components/DetailsHeader";
import { openAppSettings } from "@/src/hooks/useCameraPermission";
import { Colors } from "@/src/utils/colors";
import { isBackgroundLocationApiAvailable } from "@/src/utils/backgroundLocationPermissions";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./styles";

type PermissionKey =
  | "camera"
  | "location"
  | "backgroundLocation"
  | "notifications"
  | "photos";

type PermissionItem = {
  key: PermissionKey;
  title: string;
  granted: boolean;
  canAskAgain: boolean;
};

const emptyState = (): Record<PermissionKey, Omit<PermissionItem, "title">> => ({
  camera: { key: "camera", granted: false, canAskAgain: true },
  location: { key: "location", granted: false, canAskAgain: true },
  backgroundLocation: {
    key: "backgroundLocation",
    granted: false,
    canAskAgain: true,
  },
  notifications: { key: "notifications", granted: false, canAskAgain: true },
  photos: { key: "photos", granted: false, canAskAgain: true },
});

const isGranted = (
  result: { granted?: boolean; status?: string } | null | undefined,
): boolean =>
  result?.granted === true ||
  result?.status === "granted" ||
  result?.status === Location.PermissionStatus.GRANTED;

export default function AppPermissionsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState(emptyState());
  const [showBackground, setShowBackground] = useState(false);
  const [busyKey, setBusyKey] = useState<PermissionKey | null>(null);
  const syncTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearSyncTimers = useCallback(() => {
    syncTimersRef.current.forEach(clearTimeout);
    syncTimersRef.current = [];
  }, []);

  const refresh = useCallback(async () => {
    const next = emptyState();

    try {
      const camera = await Camera.getCameraPermissionsAsync();
      next.camera = {
        key: "camera",
        granted: isGranted(camera),
        canAskAgain: camera.canAskAgain !== false,
      };
    } catch {
      next.camera = { key: "camera", granted: false, canAskAgain: false };
    }

    try {
      const location = await Location.getForegroundPermissionsAsync();
      next.location = {
        key: "location",
        granted: isGranted(location),
        canAskAgain: location.canAskAgain !== false,
      };
    } catch {
      next.location = { key: "location", granted: false, canAskAgain: false };
    }

    const bgAvailable = await isBackgroundLocationApiAvailable();
    setShowBackground(bgAvailable);
    if (bgAvailable) {
      try {
        const bg = await Location.getBackgroundPermissionsAsync();
        next.backgroundLocation = {
          key: "backgroundLocation",
          granted: isGranted(bg),
          canAskAgain: bg.canAskAgain !== false,
        };
      } catch {
        next.backgroundLocation = {
          key: "backgroundLocation",
          granted: false,
          canAskAgain: false,
        };
      }
    }

    try {
      const notifications = await Notifications.getPermissionsAsync();
      next.notifications = {
        key: "notifications",
        granted: isGranted(notifications),
        canAskAgain: notifications.canAskAgain !== false,
      };
    } catch {
      next.notifications = {
        key: "notifications",
        granted: false,
        canAskAgain: false,
      };
    }

    try {
      const photos = await ImagePicker.getMediaLibraryPermissionsAsync();
      next.photos = {
        key: "photos",
        granted: isGranted(photos),
        canAskAgain: photos.canAskAgain !== false,
      };
    } catch {
      next.photos = { key: "photos", granted: false, canAskAgain: false };
    }

    setState(next);
    return next;
  }, []);

  /** Settings se wapas aane pe OS kabhi late update karta hai — multi sync. */
  const syncHard = useCallback(() => {
    clearSyncTimers();
    void refresh();
    [350, 900, 1800, 3200].forEach((ms) => {
      const id = setTimeout(() => {
        void refresh();
      }, ms);
      syncTimersRef.current.push(id);
    });
  }, [clearSyncTimers, refresh]);

  useFocusEffect(
    useCallback(() => {
      syncHard();
      const sub = AppState.addEventListener("change", (status) => {
        if (status === "active") {
          syncHard();
        }
      });
      return () => {
        sub.remove();
        clearSyncTimers();
      };
    }, [clearSyncTimers, syncHard]),
  );

  const readGranted = useCallback(async (key: PermissionKey): Promise<boolean> => {
    try {
      if (key === "camera") {
        return isGranted(await Camera.getCameraPermissionsAsync());
      }
      if (key === "location") {
        return isGranted(await Location.getForegroundPermissionsAsync());
      }
      if (key === "backgroundLocation") {
        return isGranted(await Location.getBackgroundPermissionsAsync());
      }
      if (key === "notifications") {
        return isGranted(await Notifications.getPermissionsAsync());
      }
      if (key === "photos") {
        return isGranted(await ImagePicker.getMediaLibraryPermissionsAsync());
      }
    } catch {
      return false;
    }
    return false;
  }, []);

  const requestOsPermission = useCallback(async (key: PermissionKey) => {
    if (key === "camera") {
      await Camera.requestCameraPermissionsAsync();
      return;
    }
    if (key === "location") {
      await Location.requestForegroundPermissionsAsync();
      return;
    }
    if (key === "backgroundLocation") {
      // Background ke liye pehle foreground zaroori
      const fg = await Location.getForegroundPermissionsAsync();
      if (!isGranted(fg)) {
        await Location.requestForegroundPermissionsAsync();
      }
      const fgAfter = await Location.getForegroundPermissionsAsync();
      if (isGranted(fgAfter)) {
        await Location.requestBackgroundPermissionsAsync();
      }
      return;
    }
    if (key === "notifications") {
      await Notifications.requestPermissionsAsync();
      return;
    }
    if (key === "photos") {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
  }, []);

  /**
   * Strong ON: dialog → agar abhi bhi off → Settings force open.
   * Phone Settings se allow ke baad wapas aane pe syncHard ON dikhata hai.
   */
  const requestPermission = useCallback(
    async (key: PermissionKey) => {
      if (busyKey) {
        return;
      }

      if (await readGranted(key)) {
        await refresh();
        return;
      }

      setBusyKey(key);
      try {
        const before = state[key];
        if (!before.canAskAgain) {
          await openAppSettings();
          return;
        }

        await requestOsPermission(key);
        const next = await refresh();
        if (next[key]?.granted) {
          return;
        }

        // Dialog deny / blocked → Settings open taaki user ON kar sake
        await openAppSettings();
      } finally {
        setBusyKey(null);
        syncHard();
      }
    },
    [busyKey, readGranted, refresh, requestOsPermission, state, syncHard],
  );

  const onToggle = useCallback(
    (key: PermissionKey, value: boolean) => {
      // OFF allow nahi — sirf ON
      if (!value) {
        return;
      }
      if (state[key].granted) {
        return;
      }
      void requestPermission(key);
    },
    [requestPermission, state],
  );

  const rows: PermissionItem[] = [
    {
      key: "camera",
      title: t("Camera"),
      granted: state.camera.granted,
      canAskAgain: state.camera.canAskAgain,
    },
    {
      key: "location",
      title: t("Location"),
      granted: state.location.granted,
      canAskAgain: state.location.canAskAgain,
    },
    ...(showBackground
      ? [
          {
            key: "backgroundLocation" as const,
            title: t("Background Location"),
            granted: state.backgroundLocation.granted,
            canAskAgain: state.backgroundLocation.canAskAgain,
          },
        ]
      : []),
    {
      key: "notifications",
      title: t("Notifications"),
      granted: state.notifications.granted,
      canAskAgain: state.notifications.canAskAgain,
    },
    {
      key: "photos",
      title: t("Photos"),
      granted: state.photos.granted,
      canAskAgain: state.photos.canAskAgain,
    },
  ];

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <DetailsHeader title={t("Permissions")} />
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((item) => (
          <View key={item.key} style={styles.row}>
            <View style={styles.textWrap}>
              <Text style={styles.title}>{item.title}</Text>
              <Text
                style={[
                  styles.status,
                  item.granted ? styles.statusOn : styles.statusOff,
                ]}
              >
                {item.granted ? t("Allowed") : t("Not allowed")}
              </Text>
            </View>
            <Switch
              value={item.granted}
              onValueChange={(value) => onToggle(item.key, value)}
              disabled={item.granted || busyKey === item.key}
              trackColor={{
                false: Colors.Boxgray,
                true: Colors.primary,
              }}
              thumbColor={Colors.white}
              ios_backgroundColor={Colors.Boxgray}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
