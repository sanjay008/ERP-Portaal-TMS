/**
 * While Camera is open for parcel verify, block focused-screen effects from
 * overwriting DeliveyDataSave (Filter + Details both mount the hook).
 */

let parcelCameraCallbackLocked = false;

export function lockParcelCameraCallback(): void {
  parcelCameraCallbackLocked = true;
}

export function unlockParcelCameraCallback(): void {
  parcelCameraCallbackLocked = false;
}

export function isParcelCameraCallbackLocked(): boolean {
  return parcelCameraCallbackLocked;
}
