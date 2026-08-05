import { isUndamagedDamageOption } from '@/src/utils/parcelCommentRules';

export type ParcelDamageSelectionMap = Record<string, number>;

export function getUndamagedDamageOption(damageReasons: any[]): any | null {
  if (!Array.isArray(damageReasons) || damageReasons.length === 0) return null;
  return (
    damageReasons.find((el) => isUndamagedDamageOption(el)) ??
    damageReasons.find((el) => Number(el?.id) === 34) ??
    null
  );
}

export function getDamagedDamageOptions(damageReasons: any[]): any[] {
  if (!Array.isArray(damageReasons)) return [];
  return damageReasons.filter((el) => !isUndamagedDamageOption(el));
}

/** Default each parcel to undamaged when available. */
export function initParcelDamageSelections(
  parcels: any[],
  damageReasons: any[],
  prev?: ParcelDamageSelectionMap | null,
): ParcelDamageSelectionMap {
  const undamaged = getUndamagedDamageOption(damageReasons);
  const next: ParcelDamageSelectionMap = { ...(prev ?? {}) };

  (parcels ?? []).forEach((parcel) => {
    const key = String(parcel?.id);
    if (next[key] != null) return;
    const existing =
      parcel?.is_damaged_delivery != null
        ? Number(parcel.is_damaged_delivery)
        : null;
    if (existing != null && !Number.isNaN(existing)) {
      next[key] = existing;
      return;
    }
    if (undamaged?.id != null) {
      next[key] = Number(undamaged.id);
    }
  });

  return next;
}

export function buildIsDamagePayload(
  selections: ParcelDamageSelectionMap,
): { item_id: number; damage_id: number }[] {
  return Object.entries(selections ?? {})
    .map(([item_id, damage_id]) => ({
      item_id: Number(item_id),
      damage_id: Number(damage_id),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.item_id) &&
        Number.isFinite(row.damage_id) &&
        row.damage_id != null,
    );
}

export function moreParcelsTitle(moreCount: number, t: (k: string) => string) {
  if (moreCount === 1) {
    return t('1 more parcel');
  }
  return `${moreCount} ${t('more parcel')}`;
}
