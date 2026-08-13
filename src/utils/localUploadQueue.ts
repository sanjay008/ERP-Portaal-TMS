import AsyncStorage from "@react-native-async-storage/async-storage";

export const LOCAL_UPLOAD_QUEUE_KEY = "LOCAL_UPLOAD_QUEUE";

export type LocalUploadQueueItem = {
  order_id: number | null;
  image_data: string[];
  item_id: number | null;
  commentId: number | null;
  batchId?: string;
  qr_data?: string | null;
};

const createBatchId = (): string =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const appendToLocalUploadQueue = (
  setLocalImagesUploadbeforeData: (value: any) => void,
  item: LocalUploadQueueItem
): boolean => {
  const image_data = [...(item.image_data || [])].filter(Boolean);
  const commentId = item.commentId != null ? item.commentId : null;
  const order_id = item.order_id != null ? item.order_id : null;

  if (image_data.length === 0 || order_id == null) {
    return false;
  }

  const payload: LocalUploadQueueItem = {
    order_id,
    image_data,
    item_id: item.item_id ?? null,
    commentId,
    batchId: item.batchId || createBatchId(),
    qr_data: item.qr_data ?? null,
  };

  setLocalImagesUploadbeforeData((prev: LocalUploadQueueItem[]) => {
    const next = [...(prev || []), payload];
    AsyncStorage.setItem(LOCAL_UPLOAD_QUEUE_KEY, JSON.stringify(next)).catch((e) => {
    });
    return next;
  });

  return true;
};
