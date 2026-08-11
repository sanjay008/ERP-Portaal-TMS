/**
 * Module-level delivery label for Direct Flow / parcel verify.
 * Survives Filter focus clears, soft session nulls, dual hook instances
 * (Filter + Details), and Camera navigation. Cleared only after successful
 * comment / signature / go-to-list.
 */

let activeDeliveryLabel: any = null;
/** From tapped parcel / verify API — used only if user label pin is empty. */
let fallbackDeliveryLabelId: number | string | null = null;

export function setActiveVerifyDeliveryLabel(label: any): void {
  if (label == null) return;
  activeDeliveryLabel = label;
  if (label?.id != null && label?.id !== '') {
    fallbackDeliveryLabelId = label.id;
  }
  console.log('[DeliveryLabelStore] SET', {
    id: label?.id ?? null,
    signature_required: label?.signature_required,
    title: label?.title ?? label?.name ?? null,
  });
}

export function getActiveVerifyDeliveryLabel(): any | null {
  return activeDeliveryLabel;
}

export function setFallbackDeliveryLabelId(id: number | string | null | undefined): void {
  if (id == null || id === '') return;
  fallbackDeliveryLabelId = id;
  console.log('[DeliveryLabelStore] FALLBACK_ID', { id });
}

export function getFallbackDeliveryLabelId(): number | string | null {
  return fallbackDeliveryLabelId;
}

export function clearActiveVerifyDeliveryLabel(): void {
  console.log('[DeliveryLabelStore] CLEAR', {
    id: activeDeliveryLabel?.id ?? null,
    fallbackId: fallbackDeliveryLabelId,
  });
  activeDeliveryLabel = null;
  fallbackDeliveryLabelId = null;
}

export function resolveVerifyDeliveryLabel(opts?: {
  snapshot?: any;
  locked?: any;
  pending?: any;
  remembered?: any;
  session?: any;
  global?: any;
  saveReason?: any;
  itemDeliveryLabelId?: number | string | null;
  resolveFromId?: (id: any) => any | null;
}): any | null {
  const fromId = opts?.resolveFromId;
  const itemId =
    opts?.itemDeliveryLabelId ?? fallbackDeliveryLabelId ?? null;

  return (
    activeDeliveryLabel ??
    opts?.snapshot ??
    opts?.locked ??
    opts?.pending ??
    opts?.remembered ??
    opts?.session ??
    opts?.global ??
    opts?.saveReason ??
    (fromId != null ? fromId(itemId) : itemId != null ? { id: Number(itemId) } : null)
  );
}
