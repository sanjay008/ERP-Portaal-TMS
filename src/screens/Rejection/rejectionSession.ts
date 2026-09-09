export const REJECTION_SLIDE_TYPE = "driver_rejection_tms";

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
  damageQuestion: string;
  photoSaved: boolean;
  commentSaved: boolean;
  signatureSaved: boolean;
  /**
   * Frozen at first scan — API remaining does not drop on damage updates
   * (unlike Delivery status change). moreCount = sessionTotalRemaining - parcels.length
   */
  sessionTotalRemaining: number | null;
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
  damageQuestion: "",
  photoSaved: false,
  commentSaved: false,
  signatureSaved: false,
  sessionTotalRemaining: null,
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

export function removeRejectionParcel(itemId: number) {
  session = {
    ...session,
    parcels: session.parcels.filter(
      (row) => String(row.itemId) !== String(itemId),
    ),
  };
  return session;
}

export function getRejectionParcelName(item: any, itemId: number): string {
  if (item?.tms_product_name?.trim()) return item.tms_product_name.trim();
  if (item?.product_name?.trim()) return item.product_name.trim();
  if (item?.delivery_label) return `Parcel ${item.delivery_label}`;
  return `Parcel #${itemId}`;
}
