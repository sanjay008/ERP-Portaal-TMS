export const REJECTION_SLIDE_TYPE = "rejection";

export type RejectionParcel = {
  itemId: number;
  orderId: number;
  name: string;
  damaged: boolean;
  rejected: boolean;
};

export type RejectionSession = {
  orderId: number | null;
  orderData: any;
  qrData: any;
  parcels: RejectionParcel[];
  photos: any[];
  comment: string;
  signature: string | null;
  signerName: string;
  damageReasons: any[];
};

const emptySession = (): RejectionSession => ({
  orderId: null,
  orderData: null,
  qrData: null,
  parcels: [],
  photos: [],
  comment: "",
  signature: null,
  signerName: "",
  damageReasons: [],
});

let session: RejectionSession = emptySession();

export function getRejectionSession(): RejectionSession {
  return session;
}

export function resetRejectionSession() {
  session = emptySession();
}

export function patchRejectionSession(
  patch: Partial<RejectionSession>,
): RejectionSession {
  session = { ...session, ...patch };
  return session;
}

export function addRejectionParcel(parcel: RejectionParcel) {
  const exists = session.parcels.some(
    (row) => String(row.itemId) === String(parcel.itemId),
  );
  if (exists) {
    session = {
      ...session,
      parcels: session.parcels.map((row) =>
        String(row.itemId) === String(parcel.itemId) ? parcel : row,
      ),
    };
    return;
  }
  session = { ...session, parcels: [...session.parcels, parcel] };
}

export function getRejectionParcelName(item: any, itemId: number): string {
  if (item?.tms_product_name?.trim()) return item.tms_product_name.trim();
  if (item?.product_name?.trim()) return item.product_name.trim();
  if (item?.delivery_label) return `Parcel ${item.delivery_label}`;
  return `Parcel #${itemId}`;
}
