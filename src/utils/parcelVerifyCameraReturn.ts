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
