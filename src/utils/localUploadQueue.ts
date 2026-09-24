import AsyncStorage from "@react-native-async-storage/async-storage";

export const LOCAL_UPLOAD_QUEUE_KEY = "LOCAL_UPLOAD_QUEUE";

export type LocalUploadQueueItem = {
  order_id: number | null;
  image_data: string[];
  item_id: number | null;
  commentId: number | null;
  batchId?: string;
  qr_data?: string | null;
  folder?: string;
  tracking_started_at?: number;
  picture_count?: number;
  source?: string;
  parcel_count?: number | null;
};

/** Locked when Camera opens — Done must use only these IDs (never live screen state). */
export type CameraProofBinding = {
  order_id: number;
  item_id: number | null;
  parcel_count: number | null;
  locked_at: number;
};

const createBatchId = (): string =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const pad2 = (n: number) => String(n).padStart(2, "0");

export const formatDropboxDateFolder = (
  date?: Date | string | number | null,
): string => {
  const d =
    date == null || date === ""
      ? new Date()
      : date instanceof Date
        ? date
        : new Date(date);
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  return `${safe.getFullYear()}-${pad2(safe.getMonth() + 1)}-${pad2(safe.getDate())}`;
};

export const buildDropboxOrderFolder = (
  orderId: string | number,
  date?: Date | string | number | null,
): string => {
  const safeOrderId =
    String(orderId).trim().replace(/[\\/]+/g, "_") || "unknown";
  return `${formatDropboxDateFolder(date)}/${safeOrderId}`;
};

/** Positive finite id only — rejects null / NaN / 0 / junk. */
export const toPositiveId = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

export const normalizeImageUris = (data: unknown): string[] => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && typeof (item as any).uri === "string") {
        return (item as any).uri as string;
      }
      return "";
    })
    .filter(Boolean);
};

export const countOrderParcels = (orderLike: any): number | null => {
  const items =
    orderLike?.order_items ??
    orderLike?.order_data?.order_items ??
    orderLike?.items ??
    null;
  return Array.isArray(items) ? items.length : null;
};

/**
 * Build a frozen binding from the best known order/item at Camera-open time.
 * Prefer explicit selectPlace.order_id over generic itemsData.id.
 */
export const buildCameraProofBinding = (ctx: {
  order_id?: unknown;
  item_id?: unknown;
  parcel_count?: number | null;
  selectPlace?: any;
  orderData?: any;
  itemsData?: any;
}): CameraProofBinding | null => {
  const order_id =
    toPositiveId(ctx.order_id) ??
    toPositiveId(ctx.selectPlace?.order_id) ??
    toPositiveId(ctx.orderData?.id) ??
    toPositiveId(ctx.orderData?.order_data?.id) ??
    toPositiveId(ctx.itemsData?.id) ??
    toPositiveId(ctx.itemsData?.order_data?.id) ??
    toPositiveId(ctx.selectPlace?.id);

  if (order_id == null) {
    return null;
  }

  const item_id =
    toPositiveId(ctx.item_id) ??
    toPositiveId(ctx.selectPlace?.item_id) ??
    null;

  const parcel_count =
    ctx.parcel_count ??
    countOrderParcels(ctx.orderData) ??
    countOrderParcels(ctx.itemsData) ??
    null;

  return {
    order_id,
    item_id,
    parcel_count,
    locked_at: Date.now(),
  };
};

/**
 * Folder must always match order_id — never trust a mismatched path.
 */
export const resolveBoundDropboxFolder = (
  orderId: number,
  folder?: string | null,
): string => {
  const expected = buildDropboxOrderFolder(orderId);
  const raw = folder != null ? String(folder).trim() : "";
  if (!raw) return expected;
  const normalized = raw.replace(/^\/+|\/+$/g, "");
  const expectedNorm = expected.replace(/^\/+|\/+$/g, "");
  if (normalized === expectedNorm || normalized.endsWith(`/${orderId}`)) {
    return normalized;
  }
  return expected;
};

export const appendToLocalUploadQueue = (
  setLocalImagesUploadbeforeData: (value: any) => void,
  item: LocalUploadQueueItem,
): boolean => {
  const image_data = normalizeImageUris(item.image_data);
  const order_id = toPositiveId(item.order_id);
  const item_id = toPositiveId(item.item_id);
  const commentId =
    item.commentId != null ? toPositiveId(item.commentId) : null;

  if (image_data.length === 0 || order_id == null) {
    if (__DEV__) {
      console.warn("[UploadQueue] refuse enqueue — missing order_id or images", {
        order_id: item.order_id,
        imageCount: image_data.length,
        source: item.source,
      });
    }
    return false;
  }

  const folder = resolveBoundDropboxFolder(order_id, item.folder);

  const payload: LocalUploadQueueItem = {
    order_id,
    image_data,
    item_id,
    commentId,
    batchId: item.batchId || createBatchId(),
    qr_data: item.qr_data ?? null,
    folder,
    tracking_started_at: item.tracking_started_at ?? Date.now(),
    picture_count: item.picture_count ?? image_data.length,
    source: item.source ?? "queue",
    parcel_count: item.parcel_count ?? null,
  };

  setLocalImagesUploadbeforeData((prev: LocalUploadQueueItem[]) => {
    const next = [...(prev || []), payload];
    AsyncStorage.setItem(LOCAL_UPLOAD_QUEUE_KEY, JSON.stringify(next)).catch(
      () => {},
    );
    return next;
  });

  return true;
};

/** Queue proof using a frozen Camera binding only (anti cross-order). */
export const appendBoundProofToQueue = (
  setLocalImagesUploadbeforeData: (value: any) => void,
  binding: CameraProofBinding | null | undefined,
  imageData: unknown,
  extra?: {
    commentId?: number | null;
    source?: string;
    qr_data?: string | null;
  },
): boolean => {
  if (!binding?.order_id) {
    if (__DEV__) {
      console.warn("[UploadQueue] refuse enqueue — no camera proof binding", {
        source: extra?.source,
      });
    }
    return false;
  }

  const image_data = normalizeImageUris(imageData);
  if (image_data.length === 0) {
    return false;
  }

  return appendToLocalUploadQueue(setLocalImagesUploadbeforeData, {
    order_id: binding.order_id,
    item_id: binding.item_id,
    image_data,
    commentId: extra?.commentId ?? null,
    parcel_count: binding.parcel_count,
    tracking_started_at: binding.locked_at,
    picture_count: image_data.length,
    source: extra?.source ?? "camera_done",
    qr_data: extra?.qr_data ?? null,
    folder: buildDropboxOrderFolder(binding.order_id),
  });
};
