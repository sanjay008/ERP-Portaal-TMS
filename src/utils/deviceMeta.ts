import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type DeviceMeta = {
  app_version: string;
  os_type: string;
  phone_type: string | null;
  /** 1 = foreground location granted, 0 = not granted / unknown */
  is_location_permission: 0 | 1;
};

async function getLocationPermissionFlag(): Promise<0 | 1> {
  try {
    const Location = await import('expo-location');
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted' ? 1 : 0;
  } catch {
    return 0;
  }
}

/** App version, OS, device model, and location permission for API payloads. */
export async function getDeviceMeta(): Promise<DeviceMeta> {
  const app_version =
    Constants.nativeAppVersion ??
    Constants.expoConfig?.version ??
    '0.0.0';

  const phone_type =
    Device.modelName ??
    Device.modelId ??
    Device.brand ??
    null;

  const is_location_permission = await getLocationPermissionFlag();

  return {
    app_version: String(app_version),
    os_type: String(Platform.OS),
    phone_type: phone_type != null ? String(phone_type) : null,
    is_location_permission,
  };
}

/** Merge device meta into a JSON body. */
export async function withDeviceMeta<T extends Record<string, any>>(
  payload: T,
): Promise<T & DeviceMeta> {
  return {
    ...payload,
    ...(await getDeviceMeta()),
  };
}

/** Append device meta fields to multipart FormData. */
export async function appendDeviceMetaToFormData(
  formData: FormData,
): Promise<void> {
  const meta = await getDeviceMeta();
  formData.append('app_version', meta.app_version);
  formData.append('os_type', meta.os_type);
  formData.append(
    'is_location_permission',
    String(meta.is_location_permission),
  );
  if (meta.phone_type != null) {
    formData.append('phone_type', meta.phone_type);
  }
}
