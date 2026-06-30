import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as BackgroundTask from "expo-background-task";
import * as FileSystem from "expo-file-system/legacy";
import * as TaskManager from "expo-task-manager";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import apiConstants from "../api/apiConstants";
import { GlobalContextData } from "../context/GlobalContext";
import { DropboxContext } from "../context/UploadProider";

const TASK_NAME = "DROPBOX_BACKGROUND_UPLOAD";
const STORAGE_QUEUE_KEY = "LOCAL_UPLOAD_QUEUE";
const STORAGE_ERROR_KEY = "FAILED_UPLOAD_QUEUE";
const STORAGE_API_QUEUE_KEY = "DROPBOX_API_QUEUE";
const STORAGE_API_ERROR_KEY = "FAILED_API_QUEUE";
const API_RETRY_DELAY_MS = 2 * 60 * 1000;

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppsx: "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  ogv: "video/ogg",
};

const ALLOWED_MIME_TYPES = new Set(Object.values(EXTENSION_TO_MIME));

export interface FileUploadResult {
  file_path: string;
  dropbox_id: string;
  file_extension: string;
  file: string;
  shared_link: string | null;
}

export interface LocalUploadItem {
  order_id: number | null;
  image_data: string[];
  item_id: number | null;
  commentId: number | null;
  folder?: string;
  batchId?: string;
}

export interface DropboxQueueItem {
  order_id: number | null;
  image_data: FileUploadResult[];
  item_id: number | null;
  commentId: number | null;
  batchId?: string;
}

const createBatchId = (): string =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const sanitizeFileUri = (uri: string): string => {
  if (!uri) return "unknown";
  const parts = uri.split("/");
  return parts[parts.length - 1]?.replace(/\+/g, "_") || "unknown";
};

const parseDropboxUploadError = (
  body: string | null | undefined,
  status: number,
): string => {
  if (!body) {
    return `Dropbox upload failed (HTTP ${status})`;
  }

  try {
    const parsed = JSON.parse(body);
    const summary = parsed?.error_summary || parsed?.error?.error_summary;
    const tag = parsed?.error?.[".tag"];
    if (summary) return `${summary} (HTTP ${status})`;
    if (typeof tag === "string") return `${tag} (HTTP ${status})`;
    if (parsed?.message) return `${parsed.message} (HTTP ${status})`;
  } catch {
    // body is not JSON
  }

  const trimmed = body.trim().slice(0, 200);
  return trimmed
    ? `${trimmed} (HTTP ${status})`
    : `Dropbox upload failed (HTTP ${status})`;
};

const parseDropboxErrorBody = (body: string | null | undefined): unknown => {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body.slice(0, 500);
  }
};

const logDropboxUploadError = (
  context: string,
  details: Record<string, unknown>,
): void => {
  console.error(`[DropboxUpload] ${context}`, details);
};

type TranslateFn = (key: string) => string;

const UPLOAD_TOAST = {
  storageFull:
    "Photo could not be uploaded. Company storage is full. Please contact your administrator.",
  tokenExpired:
    "Photo upload failed. Storage connection expired. Please try again.",
  noPermission:
    "Photo upload failed. App does not have permission to upload. Contact support.",
  tooManyRequests:
    "Too many upload requests. Please wait a moment and try again.",
  fileConflict:
    "A file with the same name already exists. Please try again.",
  unsupportedFile: "This file type is not supported for upload.",
  serviceUnavailable:
    "Photo upload failed. Storage service is temporarily unavailable. Please try again later.",
  networkError:
    "Photo upload failed. Please check your internet connection and try again.",
  tokenRefreshFailed:
    "Photo upload failed. Storage connection could not be refreshed. Please try again.",
  generic: "Photo upload failed. Please try again.",
} as const;

const extractDropboxErrorSummary = (
  body: string | null | undefined,
): string => {
  try {
    const parsed = JSON.parse(body || "{}");
    return String(
      parsed?.error_summary || parsed?.error?.error_summary || "",
    ).toLowerCase();
  } catch {
    return "";
  }
};

const getUserFriendlyUploadError = (
  body: string | null | undefined,
  status: number,
  t: TranslateFn,
): string => {
  const summary = extractDropboxErrorSummary(body);

  if (summary.includes("insufficient_space")) {
    return t(UPLOAD_TOAST.storageFull);
  }
  if (
    summary.includes("invalid_access_token") ||
    summary.includes("expired_access_token") ||
    summary.includes("invalid_grant")
  ) {
    return t(UPLOAD_TOAST.tokenExpired);
  }
  if (summary.includes("insufficient_scope")) {
    return t(UPLOAD_TOAST.noPermission);
  }
  if (
    summary.includes("too_many_requests") ||
    summary.includes("too_many_write_operations")
  ) {
    return t(UPLOAD_TOAST.tooManyRequests);
  }
  if (summary.includes("path/conflict")) {
    return t(UPLOAD_TOAST.fileConflict);
  }
  if (status === 401 || status === 403) {
    return t(UPLOAD_TOAST.tokenExpired);
  }
  if (status >= 500) {
    return t(UPLOAD_TOAST.serviceUnavailable);
  }
  if (!body || status === 0) {
    return t(UPLOAD_TOAST.networkError);
  }

  return t(UPLOAD_TOAST.generic);
};

const getUserFriendlyExceptionError = (e: any, t: TranslateFn): string => {
  const message = String(e?.message || "").toLowerCase();
  const code = String(e?.code || "").toLowerCase();

  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("internet") ||
    message.includes("failed to fetch") ||
    code.includes("network") ||
    code === "econnaborted"
  ) {
    return t(UPLOAD_TOAST.networkError);
  }
  if (message.includes("refresh token")) {
    return t(UPLOAD_TOAST.tokenRefreshFailed);
  }

  return t(UPLOAD_TOAST.generic);
};

interface UseDropboxUploadReturn {
  loading: boolean;
  refreshAccessToken: () => Promise<string>;
}

export default function useDropboxUpload(t): UseDropboxUploadReturn {

  const { UserData, setToast } = useContext(GlobalContextData);

  const dropboxContext = useContext(DropboxContext);

  const {
    setAccessToken,
    AccessToken,
    RefreshToken,
    ClientId,
    ClientSecret,
    LocalImagesUploadbeforeData,
    setLocalImagesUploadbeforeData,
    DropBoxUploadImageDataQues,
    setDropBoxUploadImageDataQues,
  } = dropboxContext || {};

  const [loading, setLoading] = useState<boolean>(false);
  const [restored, setRestored] = useState<boolean>(false);

  const accessTokenRef = useRef<string>(AccessToken || "");
  const isProcessingRef = useRef<boolean>(false);
  const isApiProcessingRef = useRef<boolean>(false);
  const apiErrorCountRef = useRef<number>(0);
  const apiStoppedRef = useRef<boolean>(false);
  const apiRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingLocalKeysRef = useRef<Set<string>>(new Set());
  const processingApiKeysRef = useRef<Set<string>>(new Set());

  const latestQueueRef = useRef<LocalUploadItem[]>([]);
  const latestApiQueueRef = useRef<DropboxQueueItem[]>([]);
  const processQueueFnRef = useRef<((queue: LocalUploadItem[]) => Promise<void>) | null>(null);
  const processApiQueueFnRef = useRef<((queue: DropboxQueueItem[]) => Promise<void>) | null>(null);

  const showToast = useCallback((message: string) => {
    setToast?.({
      top: 45,
      text: message || t("something_went_wrong"),
      type: "error",
      visible: true,
    });
  }, [setToast, t]);

  useEffect(() => {
    accessTokenRef.current = AccessToken || "";
  }, [AccessToken]);

  useEffect(() => {
    latestQueueRef.current = LocalImagesUploadbeforeData || [];
  }, [LocalImagesUploadbeforeData]);

  useEffect(() => {
    latestApiQueueRef.current = DropBoxUploadImageDataQues || [];
  }, [DropBoxUploadImageDataQues]);
  const refreshAccessToken = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch("https://api.dropbox.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: RefreshToken,
          client_id: ClientId,
          client_secret: ClientSecret,
        }).toString(),
      });

      const data = await response.json();

      if (!response.ok || !data?.access_token) {
        console.error("Dropbox Token Refresh Failed", {
          status: response.status,
          statusText: response.statusText,
          response: data,
        });

        throw new Error("Refresh token failed");
      }

      accessTokenRef.current = data.access_token;
      setAccessToken(data.access_token);

      return data.access_token;
    } catch (e: any) {
      console.error("Image Upload Failed - Refresh Access Token Error", {
        message: e?.message,
        stack: e?.stack,
        error: e,
      });

      showToast(t(UPLOAD_TOAST.tokenRefreshFailed));
      throw e;
    }
  }, [RefreshToken, ClientId, ClientSecret, setAccessToken, showToast, t]);

  const uploadSingleFile = useCallback(
    async (uri: string, folder: string = "photos", retry: number = 0): Promise<FileUploadResult | null> => {
      try {
        if (!uri) return null;

        const rawName = uri.split("/").pop() || `file-${Date.now()}`;
        const originalFileName = rawName.replace(/\+/g, "_");
        const extension = originalFileName.split(".").pop()?.toLowerCase() || "";
        const mimeType = EXTENSION_TO_MIME[extension] || "";

        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
          logDropboxUploadError("uploadSingleFile rejected", {
            step: "mime_validation",
            retry,
            fileName: originalFileName,
            extension: extension || "unknown",
            mimeType: mimeType || "unknown",
            uri: sanitizeFileUri(uri),
          });
          showToast(t(UPLOAD_TOAST.unsupportedFile));
          return null;
        }

        let token = accessTokenRef.current;
        const dropboxPath = `/${folder}/${originalFileName}`;

        let uploadRes = await FileSystem.uploadAsync(
          "https://content.dropboxapi.com/2/files/upload",
          uri,
          {
            httpMethod: "POST",
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers: {
              Authorization: `Bearer ${token?.trim()}`,
              "Dropbox-API-Arg": JSON.stringify({
                path: dropboxPath,
                mode: "add",
                autorename: true,
                mute: false,
              }),
              "Content-Type": "application/octet-stream",
            },
          }
        );

        if (uploadRes.status === 401) {
          logDropboxUploadError("uploadSingleFile token expired", {
            step: "dropbox_files_upload",
            retry,
            httpStatus: uploadRes.status,
            fileName: originalFileName,
            dropboxPath,
            dropboxError: parseDropboxErrorBody(uploadRes.body),
          });

          token = await refreshAccessToken();

          uploadRes = await FileSystem.uploadAsync(
            "https://content.dropboxapi.com/2/files/upload",
            uri,
            {
              httpMethod: "POST",
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
              headers: {
                Authorization: `Bearer ${token?.trim()}`,
                "Dropbox-API-Arg": JSON.stringify({
                  path: dropboxPath,
                  mode: "add",
                  autorename: true,
                  mute: false,
                }),
                "Content-Type": "application/octet-stream",
              },
            }
          );
        }

        if (uploadRes.status !== 200) {
          const errorMessage = parseDropboxUploadError(
            uploadRes.body,
            uploadRes.status,
          );
          const userMessage = getUserFriendlyUploadError(
            uploadRes.body,
            uploadRes.status,
            t,
          );

          logDropboxUploadError("uploadSingleFile failed", {
            step: "dropbox_files_upload",
            retry,
            httpStatus: uploadRes.status,
            fileName: originalFileName,
            dropboxPath,
            mimeType,
            uri: sanitizeFileUri(uri),
            hasAccessToken: Boolean(token?.trim()),
            errorMessage,
            userMessage,
            dropboxError: parseDropboxErrorBody(uploadRes.body),
          });

          if (retry < 3) {
            await new Promise<void>((resolve) => setTimeout(resolve, 2000));
            return uploadSingleFile(uri, folder, retry + 1);
          }

          showToast(userMessage);
          return null;
        }

        const uploadData = JSON.parse(uploadRes.body);
        let sharedLink: string | null = null;

        const linkResponse = await fetch(
          "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: uploadData.path_display,
              settings: {
                requested_visibility: "public",
                audience: "public",
                access: "viewer",
              },
            }),
          }
        );

        if (linkResponse.ok) {
          const linkData = await linkResponse.json();
          sharedLink = linkData?.url || null;
        }

        const fileJson: FileUploadResult = {
          file_path: uploadData.path_display,
          dropbox_id: uploadData.id,
          file_extension: extension,
          file: originalFileName,
          shared_link: sharedLink,
        };
        return fileJson;

      } catch (e: any) {
        const errorMessage =
          e?.message || e?.response?.data?.message || "Unknown upload error";
        const userMessage = getUserFriendlyExceptionError(e, t);

        logDropboxUploadError("uploadSingleFile exception", {
          step: "dropbox_files_upload",
          retry,
          uri: sanitizeFileUri(uri),
          folder,
          message: errorMessage,
          userMessage,
          code: e?.code ?? null,
          name: e?.name ?? null,
        });

        if (retry < 3) {
          await new Promise<void>((resolve) => setTimeout(resolve, 2000));
          return uploadSingleFile(uri, folder, retry + 1);
        }

        showToast(userMessage);
        return null;
      }
    },
    [refreshAccessToken, showToast, t]
  );

  const saveQueueToStorage = useCallback(async (queue: LocalUploadItem[]): Promise<void> => {
    try {
      if (queue.length > 0) {
        await AsyncStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queue));
      } else {
        await AsyncStorage.removeItem(STORAGE_QUEUE_KEY);
      }
    } catch (e) {
    }
  }, []);

  const saveApiQueueToStorage = useCallback(async (queue: DropboxQueueItem[]): Promise<void> => {
    try {
      if (queue.length > 0) {
        await AsyncStorage.setItem(STORAGE_API_QUEUE_KEY, JSON.stringify(queue));
      } else {
        await AsyncStorage.removeItem(STORAGE_API_QUEUE_KEY);
      }
    } catch (e) {
    }
  }, []);

  const saveErrorToStorage = useCallback(async (item: LocalUploadItem): Promise<void> => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_ERROR_KEY);
      const errors: LocalUploadItem[] = existing ? JSON.parse(existing) : [];
      errors.push(item);
      await AsyncStorage.setItem(STORAGE_ERROR_KEY, JSON.stringify(errors));
    } catch (e) {
    }
  }, []);

  const saveApiErrorToStorage = useCallback(async (item: DropboxQueueItem, message: string): Promise<void> => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_API_ERROR_KEY);
      const errors: { item: DropboxQueueItem; message: string; time: string }[] = existing
        ? JSON.parse(existing)
        : [];
      errors.push({ item, message, time: new Date().toISOString() });
      await AsyncStorage.setItem(STORAGE_API_ERROR_KEY, JSON.stringify(errors));
    } catch (e) {
    }
  }, []);

  const isStoreImageApiSuccess = (data: any): boolean =>
    data?.status_code == 200 || data?.status === true || data?.status === 1;

  const storeImageToDatabase = useCallback(
    async (item: DropboxQueueItem): Promise<{ success: boolean; message?: string }> => {
      if (!UserData?.user?.verify_token) {
        return { success: false, message: "User data not available" };
      }

      if (!item.image_data?.length) {
        return { success: false, message: "No images to store" };
      }

      try {
        const formData = new FormData();

        formData.append("token", UserData.user.verify_token);
        formData.append("role", UserData.user.role);
        formData.append("relaties_id", String(UserData.relaties?.id ?? ""));
        formData.append("user_id", String(UserData.user.id ?? ""));
        formData.append("order_id", String(item.order_id ?? ""));
        formData.append("order_log_id", String(item.commentId ?? ""));

        if (item.item_id !== null && item.item_id !== undefined) {
          formData.append("item_id", String(item.item_id));
        }

        item.image_data.forEach((image, index) => {
          formData.append(`images[${index}][file_path]`, image?.file_path || "");
          formData.append(`images[${index}][file]`, image?.file || "");
          formData.append(`images[${index}][file_extension]`, image?.file_extension || "");
          formData.append(`images[${index}][dropbox_id]`, image?.dropbox_id || "");
          formData.append(`images[${index}][shared_link]`, image?.shared_link ?? "");
        });

        const response = await axios.post(apiConstants.store_tms_comment_img_new, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          transformRequest: (data) => data,
        });

        const data = response?.data;
        if (!isStoreImageApiSuccess(data)) {
          throw new Error(data?.message || t("something_went_wrong"));
        }

        return { success: true };
      } catch (e: any) {
        const message =
          e?.response?.data?.message || e?.message || "Unknown API error";
        showToast(message);
        return { success: false, message };
      }
    },
    [UserData, t, showToast]
  );

  const getQueueItemKey = (item: DropboxQueueItem | LocalUploadItem): string => {
    if (item.batchId) return item.batchId;
    const images = item.image_data || [];
    const fingerprint = images
      .map((img) =>
        typeof img === "string" ? img : `${img?.dropbox_id || ""}_${img?.file_path || ""}`
      )
      .join("|");
    return `legacy_${item.order_id}_${item.commentId}_${item.item_id ?? "none"}_${fingerprint}`;
  };

  const isSameQueueItem = (a: DropboxQueueItem, b: DropboxQueueItem): boolean =>
    getQueueItemKey(a) === getQueueItemKey(b);

  const isSameLocalItem = (a: LocalUploadItem, b: LocalUploadItem): boolean =>
    getQueueItemKey(a) === getQueueItemKey(b);

  const withBatchId = <T extends LocalUploadItem | DropboxQueueItem>(item: T): T => ({
    ...item,
    batchId: item.batchId || createBatchId(),
  });

  const syncLocalQueue = useCallback(
    (queue: LocalUploadItem[]) => {
      latestQueueRef.current = queue;
      setLocalImagesUploadbeforeData?.(queue);
      saveQueueToStorage(queue);
    },
    [setLocalImagesUploadbeforeData, saveQueueToStorage]
  );

  const syncApiQueue = useCallback(
    (queue: DropboxQueueItem[]) => {
      const deduped = queue.filter(
        (item, index, arr) =>
          arr.findIndex((q) => getQueueItemKey(q) === getQueueItemKey(item)) === index
      );
      latestApiQueueRef.current = deduped;
      setDropBoxUploadImageDataQues?.(deduped);
      saveApiQueueToStorage(deduped);
    },
    [setDropBoxUploadImageDataQues, saveApiQueueToStorage]
  );

  const processApiQueue = useCallback(
    async (queue: DropboxQueueItem[]): Promise<void> => {
      if (!setDropBoxUploadImageDataQues) return;
      if (isApiProcessingRef.current || queue.length === 0) return;

      if (apiStoppedRef.current) {
        return;
      }

      if (!UserData?.user?.verify_token) {
        return;
      }

      isApiProcessingRef.current = true;

      try {
        const pendingQueue = latestApiQueueRef.current;

        if (pendingQueue.length === 0) {
          syncApiQueue([]);
          return;
        }

        const item = pendingQueue[0];
        const itemKey = getQueueItemKey(item);

        if (processingApiKeysRef.current.has(itemKey)) {
          return;
        }

        processingApiKeysRef.current.add(itemKey);

        const result = await storeImageToDatabase(item);
        processingApiKeysRef.current.delete(itemKey);

        if (result.success) {
          apiErrorCountRef.current = 0;
          syncApiQueue(latestApiQueueRef.current.filter((q) => !isSameQueueItem(q, item)));
        } else {
          apiErrorCountRef.current += 1;
          const errorMessage = result.message || t("something_went_wrong");
          await saveApiErrorToStorage(item, errorMessage);

          if (apiErrorCountRef.current >= 2) {
            apiStoppedRef.current = true;
            return;
          }

          if (apiRetryTimerRef.current) {
            clearTimeout(apiRetryTimerRef.current);
          }

          apiRetryTimerRef.current = setTimeout(() => {
            apiRetryTimerRef.current = null;
            apiErrorCountRef.current = 0;
            isApiProcessingRef.current = false;
            const remaining = latestApiQueueRef.current;
            if (remaining.length > 0 && !apiStoppedRef.current) {
              processApiQueueFnRef.current?.(remaining);
            }
          }, API_RETRY_DELAY_MS);
        }

      } catch (e) {
      } finally {
        isApiProcessingRef.current = false;

        const remaining = latestApiQueueRef.current;

        if (
          remaining.length > 0 &&
          !apiStoppedRef.current &&
          apiErrorCountRef.current === 0 &&
          !apiRetryTimerRef.current &&
          UserData?.user?.verify_token
        ) {
          setTimeout(() => {
            processApiQueueFnRef.current?.(latestApiQueueRef.current);
          }, 300);
        }
      }
    },
    [
      UserData,
      storeImageToDatabase,
      saveApiErrorToStorage,
      syncApiQueue,
      t,
    ]
  );

  useEffect(() => {
    processApiQueueFnRef.current = processApiQueue;
  }, [processApiQueue]);

  const processQueueItem = useCallback(
    async (item: LocalUploadItem): Promise<boolean> => {
      if (!setDropBoxUploadImageDataQues || !setLocalImagesUploadbeforeData) return false;

      if (!item.order_id || !item.image_data?.length) {
        return true;
      }

      const batchItem = withBatchId(item);
      const itemKey = getQueueItemKey(batchItem);

      if (processingLocalKeysRef.current.has(itemKey)) {
        return true;
      }

      processingLocalKeysRef.current.add(itemKey);
      syncLocalQueue(latestQueueRef.current.filter((q) => !isSameLocalItem(q, batchItem)));

      try {
        const uris = item.image_data.filter(Boolean);
        if (uris.length === 0) {
          processingLocalKeysRef.current.delete(itemKey);
          return true;
        }

        const folder = item.folder || "photos";
        const results = await Promise.all(uris.map((uri) => uploadSingleFile(uri, folder)));
        const uploaded = results.filter((r): r is FileUploadResult => r !== null);

        if (uploaded.length === 0) {
          logDropboxUploadError("processQueueItem all files failed", {
            step: "process_queue_item",
            orderId: batchItem?.order_id ?? null,
            itemId: batchItem?.item_id ?? null,
            commentId: batchItem?.commentId ?? null,
            attemptedCount: uris.length,
            folder,
          });
          processingLocalKeysRef.current.delete(itemKey);
          syncLocalQueue([...latestQueueRef.current, batchItem]);
          return false;
        }

        const doneItem: DropboxQueueItem = withBatchId({
          order_id: batchItem.order_id,
          image_data: uploaded,
          item_id: batchItem.item_id,
          commentId: batchItem.commentId,
          batchId: batchItem.batchId,
        });

        const doneKey = getQueueItemKey(doneItem);
        const apiQueue = latestApiQueueRef.current;
        const alreadyInApiQueue = apiQueue.some((q) => getQueueItemKey(q) === doneKey);

        if (!alreadyInApiQueue) {
          apiStoppedRef.current = false;
          apiErrorCountRef.current = 0;
          syncApiQueue([...apiQueue, doneItem]);
        }
        processingLocalKeysRef.current.delete(itemKey);

        return true;

      } catch (e: any) {
        const errorMessage =
          e?.message || e?.response?.data?.message || "Unknown queue upload error";
        const userMessage = getUserFriendlyExceptionError(e, t);

        logDropboxUploadError("processQueueItem exception", {
          step: "process_queue_item",
          orderId: item?.order_id ?? null,
          itemId: item?.item_id ?? null,
          commentId: item?.commentId ?? null,
          imageCount: item?.image_data?.length ?? 0,
          message: errorMessage,
          userMessage,
          code: e?.code ?? null,
          name: e?.name ?? null,
        });

        processingLocalKeysRef.current.delete(itemKey);
        syncLocalQueue([...latestQueueRef.current, batchItem]);
        showToast(userMessage);
        return false;
      }
    },
    [uploadSingleFile, setDropBoxUploadImageDataQues, setLocalImagesUploadbeforeData, syncLocalQueue, syncApiQueue, showToast, t]
  );

  const processQueue = useCallback(
    async (queue: LocalUploadItem[]): Promise<void> => {
      if (!setLocalImagesUploadbeforeData) return;
      if (isProcessingRef.current || queue.length === 0) return;
      if (!AccessToken && !RefreshToken) return;

      isProcessingRef.current = true;
      setLoading(true);

      try {
        const errorItems: LocalUploadItem[] = [];
        const snapshot = latestQueueRef.current
          .filter((item) => !processingLocalKeysRef.current.has(getQueueItemKey(item)))
          .filter(
            (item, index, arr) =>
              arr.findIndex((q) => getQueueItemKey(q) === getQueueItemKey(item)) === index
          );

        for (const item of snapshot) {
          const success = await processQueueItem(item);
          if (!success) errorItems.push(item);
        }

        if (errorItems.length > 0) {
          for (const errItem of errorItems) {
            await saveErrorToStorage(errItem);
          }
        }

      } catch (e) {
      } finally {
        isProcessingRef.current = false;
        setLoading(false);
      }
    },
    [AccessToken, RefreshToken, processQueueItem, saveErrorToStorage, setLocalImagesUploadbeforeData]
  );

  useEffect(() => {
    processQueueFnRef.current = processQueue;
  }, [processQueue]);

  const retryErrorQueue = useCallback(async (): Promise<void> => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_ERROR_KEY);
      if (!existing) return;

      const errors: LocalUploadItem[] = JSON.parse(existing);
      if (errors.length === 0) return;
      await AsyncStorage.removeItem(STORAGE_ERROR_KEY);

      const stillFailed: LocalUploadItem[] = [];

      for (const item of errors) {
        const success = await processQueueItem(item);
        if (!success) stillFailed.push(item);
      }

      if (stillFailed.length > 0) {
        await AsyncStorage.setItem(STORAGE_ERROR_KEY, JSON.stringify(stillFailed));
      }

    } catch (e) {
    }
  }, [processQueueItem]);

  useEffect(() => {
    if (!setLocalImagesUploadbeforeData || !setDropBoxUploadImageDataQues) return;

    const restoreAndStart = async () => {
      try {
        await AsyncStorage.removeItem("COMPLETED_API_KEYS");

        const storedQueue = await AsyncStorage.getItem(STORAGE_QUEUE_KEY);
        const storedApiQueue = await AsyncStorage.getItem(STORAGE_API_QUEUE_KEY);
        const storedErrors = await AsyncStorage.getItem(STORAGE_ERROR_KEY);
        const storedApiErrors = await AsyncStorage.getItem(STORAGE_API_ERROR_KEY);

        if (storedErrors) {
          const errors: LocalUploadItem[] = JSON.parse(storedErrors);
          if (errors.length > 0) {
          }
        }

        if (storedApiErrors) {
          const apiErrors = JSON.parse(storedApiErrors);
          if (apiErrors.length > 0) {
          }
        }

        if (storedApiQueue) {
          const apiQueue: DropboxQueueItem[] = JSON.parse(storedApiQueue);
          if (apiQueue.length > 0) {
            setDropBoxUploadImageDataQues((prev: DropboxQueueItem[]) => {
              const merged = [...(prev || [])];
              apiQueue.forEach((item) => {
                if (!merged.some((q) => isSameQueueItem(q, item))) {
                  merged.push(item);
                }
              });
              return merged;
            });
          }
        }

        if (storedQueue) {
          const queue: LocalUploadItem[] = JSON.parse(storedQueue);
          if (queue.length > 0) {
            setLocalImagesUploadbeforeData((prev: LocalUploadItem[]) => {
              const merged = [...(prev || [])];
              queue.forEach((item) => {
                if (!merged.some((q) => isSameLocalItem(q, item))) {
                  merged.push(item);
                }
              });
              return merged;
            });
          }
        }

      } catch (e) {
      } finally {
        setRestored(true);
      }
    };

    restoreAndStart();
  }, [setLocalImagesUploadbeforeData, setDropBoxUploadImageDataQues]);

  useEffect(() => {
    if (!restored) return;

    if (LocalImagesUploadbeforeData?.length > 0 && !isProcessingRef.current) {
      processQueue(LocalImagesUploadbeforeData);
    } else if (LocalImagesUploadbeforeData?.length === 0 && !isProcessingRef.current) {
      retryErrorQueue();
    }
  }, [LocalImagesUploadbeforeData, processQueue, retryErrorQueue, restored, AccessToken, RefreshToken]);

  useEffect(() => {
    if (!restored) return;

    if (DropBoxUploadImageDataQues?.length > 0 && !isApiProcessingRef.current && !apiStoppedRef.current) {
      processApiQueue(DropBoxUploadImageDataQues);
    }
  }, [DropBoxUploadImageDataQues, processApiQueue, restored, UserData]);

  useEffect(() => {
    const registerBackgroundTask = async (): Promise<void> => {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
      if (isRegistered) return;

      TaskManager.defineTask(TASK_NAME, async () => {
        try {
          const storedQueue = await AsyncStorage.getItem(STORAGE_QUEUE_KEY);

          if (storedQueue) {
            const queue: LocalUploadItem[] = JSON.parse(storedQueue);

            if (queue.length > 0) {
              for (const item of queue) {
                const uris = item.image_data.filter(Boolean);
                const folder = item.folder || "photos";
                await Promise.all(uris.map((uri) => uploadSingleFile(uri, folder)));
              }
            }
          }

          return BackgroundTask.BackgroundTaskResult.Success;
        } catch {
          return BackgroundTask.BackgroundTaskResult.Failed;
        }
      });

      await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 * 60 });
    };

    registerBackgroundTask();
  }, [uploadSingleFile]);

  useEffect(() => {
    return () => {
      if (apiRetryTimerRef.current) {
        clearTimeout(apiRetryTimerRef.current);
      }
    };
  }, []);

  return {
    loading,
    refreshAccessToken,
  };
}