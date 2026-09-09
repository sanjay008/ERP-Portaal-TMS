import {
  getDamagedDamageOptions,
  getUndamagedDamageOption,
} from '@/src/utils/deliveryMultiParcel';
import { isUndamagedDamageOption } from '@/src/utils/parcelCommentRules';

export type AcceptanceParcelState = {
  id: number;
  tms_product_name?: string | null;
  delivery_label?: string | null;
  damaged: boolean;
  accepted: boolean;
  damage_id: number | null;
};

export function formatAcceptanceDateTime(
  date = new Date(),
  timeZone?: string,
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const tz = timeZone?.trim();
  if (tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(date);
      const get = (type: string) =>
        parts.find((part) => part.type === type)?.value ?? '';
      return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
    } catch {
      // fall through to local clock
    }
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getParcelDisplayName(item: {
  tms_product_name?: string | null;
  delivery_label?: string | null;
  id: number;
}): string {
  if (item.tms_product_name?.trim()) return item.tms_product_name.trim();
  if (item.delivery_label) return `Parcel ${item.delivery_label}`;
  return `Parcel #${item.id}`;
}

export function mapDamageIdToFlags(
  damageId: number | null,
  damageReasons: any[],
): { damaged: boolean; damage_id: number | null } {
  if (damageId == null || Number.isNaN(Number(damageId))) {
    const undamaged = getUndamagedDamageOption(damageReasons);
    return {
      damaged: false,
      damage_id: undamaged?.id != null ? Number(undamaged.id) : null,
    };
  }
  const reason = damageReasons.find((r) => Number(r?.id) === Number(damageId));
  const undamaged = isUndamagedDamageOption(reason) || Number(damageId) === 34;
  return {
    damaged: !undamaged,
    damage_id: Number(damageId),
  };
}

export function resolveDamageIdForFlags(
  damaged: boolean,
  damageReasons: any[],
  previousId?: number | null,
): number | null {
  if (!damaged) {
    const undamaged = getUndamagedDamageOption(damageReasons);
    return undamaged?.id != null ? Number(undamaged.id) : previousId ?? 34;
  }
  const damagedOpts = getDamagedDamageOptions(damageReasons);
  if (
    previousId != null &&
    damagedOpts.some((option) => Number(option?.id) === Number(previousId))
  ) {
    return Number(previousId);
  }
  return damagedOpts[0]?.id != null
    ? Number(damagedOpts[0].id)
    : previousId ?? null;
}

export function initAcceptanceParcels(
  productDamageList: any[],
  damageReasons: any[],
): AcceptanceParcelState[] {
  return (productDamageList || []).map((item: any) => {
    const existing =
      item?.is_damaged_delivery != null
        ? Number(item.is_damaged_delivery)
        : item?.is_damaged_pickup != null
          ? Number(item.is_damaged_pickup)
          : null;
    const flags = mapDamageIdToFlags(existing, damageReasons);
    return {
      id: Number(item.id),
      tms_product_name: item.tms_product_name,
      delivery_label: item.delivery_label,
      damaged: flags.damaged,
      accepted: true,
      damage_id: flags.damage_id,
    };
  });
}

export function isAcceptanceCommentRequired(
  parcels: AcceptanceParcelState[],
): boolean {
  return parcels.some((parcel) => parcel.damaged || !parcel.accepted);
}

export function parcelAcceptanceStatusLabel(
  parcel: AcceptanceParcelState,
): string {
  const damageLabel = parcel.damaged ? 'damaged' : 'undamaged';
  const acceptLabel = parcel.accepted ? 'accepted' : 'rejected';
  return `${damageLabel} - ${acceptLabel}`;
}

export function buildCustomerAcceptanceComment(params: {
  customerName: string;
  parcels: AcceptanceParcelState[];
  dateTime?: string;
  timeZone?: string;
}): string {
  const { customerName, parcels } = params;
  const when = params.dateTime || formatAcceptanceDateTime(new Date(), params.timeZone);
  const name = customerName?.trim() || 'Customer';
  const count = parcels.length;
  const packageWord = count === 1 ? 'package' : 'packages';
  const lines = parcels.map((parcel) => {
    const parcelName = getParcelDisplayName(parcel);
    return `${parcelName} ${parcelAcceptanceStatusLabel(parcel)}`;
  });

  return [
    when,
    '',
    'Customer acceptance',
    '',
    `${name} confirmed status of the following ${count} ${packageWord}:`,
    '',
    ...lines,
  ].join('\n');
}

export function buildAcceptanceDamagePayload(
  parcels: AcceptanceParcelState[],
): { item: number; is_damage: number }[] {
  return parcels
    .filter(
      (parcel) =>
        parcel.damage_id != null && Number.isFinite(Number(parcel.damage_id)),
    )
    .map((parcel) => ({
      item: parcel.id,
      is_damage: Number(parcel.damage_id),
    }));
}

export function buildParcelDamageAcceptPayload(
  parcels: AcceptanceParcelState[],
): { product_id: number; damage: 0 | 1; accept: 0 | 1 }[] {
  return (parcels || [])
    .filter((parcel) => Number.isFinite(Number(parcel?.id)) && Number(parcel.id) > 0)
    .map((parcel) => ({
      product_id: Number(parcel.id),
      damage: parcel.damaged ? 1 : 0,
      accept: parcel.accepted ? 1 : 0,
    }));
}

type TranslateFn = (key: string, ...args: any[]) => any;

export function buildGiveScannerToDriverModal({
  t,
  image,
  onGoToOverview,
}: {
  t: TranslateFn;
  image: any;
  onGoToOverview: () => void;
}) {
  return {
    visible: true,
    title: '',
    message: '',
    hint: t('GIVE SCANNER TO DRIVER'),
    image,
    color: '#000000',
    buttons: [
      {
        text: t('Go to overview'),
        type: 'primary' as const,
        onPress: onGoToOverview,
      },
    ],
  };
}

export function buildAcceptanceSummaryModal({
  t,
  message,
  color,
  onClose,
}: {
  t: TranslateFn;
  message: string;
  color: string;
  onClose: () => void;
}) {
  return {
    visible: true,
    title: t('All Parcels Scanned Successfully!'),
    message,
    hint: t('GIVE SCANNER TO DRIVER'),
    color,
    buttons: [
      {
        text: t('Close'),
        type: 'primary' as const,
        onPress: onClose,
      },
    ],
  };
}
