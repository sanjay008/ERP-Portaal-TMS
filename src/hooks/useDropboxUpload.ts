import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as BackgroundTask from "expo-background-task";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as FileSystem from "expo-file-system/legacy";
import NetInfo from "@react-native-community/netinfo";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import apiConstants from "../api/apiConstants";
import { GlobalContextData } from "../context/GlobalContext";
import { DropboxContext } from "../context/UploadProider";
import { getDeviceMeta } from "../utils/deviceMeta";
import {
  buildDropboxOrderFolder,
  resolveBoundDropboxFolder,
  toPositiveId,
} from "../utils/localUploadQueue";

const STORAGE_QUEUE_KEY = "LOCAL_UPLOAD_QUEUE";
const TASK_NAME = "DROPBOX_BACKGROUND_UPLOAD";
const STORAGE_ERROR_KEY = "FAILED_UPLOAD_QUEUE";
const STORAGE_API_QUEUE_KEY = "DROPBOX_API_QUEUE";
const STORAGE_API_ERROR_KEY = "FAILED_API_QUEUE";
const API_RETRY_DELAY_MS = 2 * 60 * 1000;
const LOCAL_RETRY_DELAY_MS = 2 * 60 * 1000;

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

type UploadSingleFileOutcome =
  | { ok: true; data: FileUploadResult }
  | { ok: false; error: string; file: string; userMessage: string };

export interface LocalUploadItem {
  order_id: number | null;
  image_data: string[];
  item_id: number | null;
  commentId: number | null;
  folder?: string;
  batchId?: string;
  qr_data?: string | null;
  tracking_started_at?: number;
  picture_count?: number;
  source?: string;
  parcel_count?: number | null;
}

export interface DropboxQueueItem {
  order_id: number | null;
  image_data: FileUploadResult[];
  item_id: number | null;
  commentId: number | null;
  batchId?: string;
  qr_data?: string | null;
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
  noInternet: "No internet connection. Uploads are on hold and will resume automatically when internet is back.",
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
  const [networkAvailable, setNetworkAvailable] = useState<boolean | null>(null);

  const accessTokenRef = useRef<string>(AccessToken || "");
  const isProcessingRef = useRef<boolean>(false);
  const isApiProcessingRef = useRef<boolean>(false);
  const apiErrorCountRef = useRef<number>(0);
  const apiStoppedRef = useRef<boolean>(false);
  const apiRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingLocalKeysRef = useRef<Set<string>>(new Set());
  const processingApiKeysRef = useRef<Set<string>>(new Set());
  const shownUploadFailureKeysRef = useRef<Set<string>>(new Set());
  const networkToastShownRef = useRef(false);

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

  const showUploadErrorOnce = useCallback((key: string, message: string) => {
    if (shownUploadFailureKeysRef.current.has(key)) return;
    shownUploadFailureKeysRef.current.add(key);
    showToast(message);
  }, [showToast]);

  const notifyOfflineOnce = useCallback(() => {
    if (networkToastShownRef.current) return;
    networkToastShownRef.current = true;
    showToast(t(UPLOAD_TOAST.noInternet));
  }, [showToast, t]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const available = state.isConnected === true && state.isInternetReachable !== false;
      setNetworkAvailable(available);
      if (available) {
        networkToastShownRef.current = false;
      } else if (
        (latestQueueRef.current.length > 0 || latestApiQueueRef.current.length > 0) &&
        state.isConnected === false
      ) {
        notifyOfflineOnce();
      }
    });
    return unsubscribe;
  }, [notifyOfflineOnce]);

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

      throw e;
    }
  }, [RefreshToken, ClientId, ClientSecret, setAccessToken]);

  const uploadSingleFile = useCallback(
    async (
      uri: string,
      folder: string = "photos",
      retry: number = 0,
    ): Promise<UploadSingleFileOutcome | null> => {
      try {
        if (!uri) return null;

        const rawName = uri.split("/").pop() || `file-${Date.now()}`;
        const originalFileName = rawName.replace(/\+/g, "_");
        const extension = originalFileName.split(".").pop()?.toLowerCase() || "";
        const mimeType = EXTENSION_TO_MIME[extension] || "";

        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
          const errorMessage = `Unsupported file type: .${extension || "unknown"} (${mimeType || "unknown mime"})`;
          logDropboxUploadError("uploadSingleFile rejected", {
            step: "mime_validation",
            retry,
            fileName: originalFileName,
            extension: extension || "unknown",
            mimeType: mimeType || "unknown",
            uri: sanitizeFileUri(uri),
            errorMessage,
          });
          return {
            ok: false,
            error: errorMessage,
            file: originalFileName,
            userMessage: t(UPLOAD_TOAST.unsupportedFile),
          };
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

          return { ok: false, error: errorMessage, file: originalFileName, userMessage };
        }

        const uploadData = JSON.parse(uploadRes.body);
        let sharedLink: string | null = null;

        let lastLinkError = "Dropbox shared link could not be created";
        for (let attempt = 0; attempt < 4 && !sharedLink; attempt += 1) {
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
          const linkData = await linkResponse.json().catch(() => ({}));
          if (linkResponse.ok && linkData?.url) {
            sharedLink = linkData.url;
            break;
          }

          lastLinkError = linkData?.error_summary || linkData?.error?.error_summary || lastLinkError;
          if (String(lastLinkError).includes("shared_link_already_exists")) {
            const existingResponse = await fetch(
              "https://api.dropboxapi.com/2/sharing/list_shared_links",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ path: uploadData.path_display, direct_only: true }),
              },
            );
            const existingData = await existingResponse.json().catch(() => ({}));
            sharedLink = existingData?.links?.[0]?.url || null;
          }
          if (!sharedLink && attempt < 3) {
            await new Promise<void>((resolve) => setTimeout(resolve, 2000));
          }
        }
        if (!sharedLink) throw new Error(lastLinkError);

        const fileJson: FileUploadResult = {
          file_path: uploadData.path_display,
          dropbox_id: uploadData.id,
          file_extension: extension,
          file: originalFileName,
          shared_link: sharedLink,
        };
        return { ok: true, data: fileJson };

      } catch (e: any) {
        const rawName = uri.split("/").pop() || `file-${Date.now()}`;
        const originalFileName = rawName.replace(/\+/g, "_");
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

        return { ok: false, error: errorMessage, file: originalFileName, userMessage };
      }
    },
    [refreshAccessToken, t]
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

  const saveApiErrorToStorage = useCallback(async (item: DropboxQueueItem, message: string): Promise<void> => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_API_ERROR_KEY);
      const errors: { item: DropboxQueueItem; message: string; time: string }[] = existing
        ? JSON.parse(existing)
        : [];
      const itemKey = item.batchId || `${item.order_id}_${item.item_id ?? "none"}_${item.image_data.map((image) => image.dropbox_id || image.file_path).join("|")}`;
      const existingIndex = errors.findIndex((entry) => {
        const queued = entry.item;
        const queuedKey = queued.batchId || `${queued.order_id}_${queued.item_id ?? "none"}_${queued.image_data.map((image) => image.dropbox_id || image.file_path).join("|")}`;
        return queuedKey === itemKey;
      });
      const nextEntry = { item, message, time: new Date().toISOString() };
      if (existingIndex >= 0) errors[existingIndex] = nextEntry;
      else errors.push(nextEntry);
      await AsyncStorage.setItem(
        STORAGE_API_ERROR_KEY,
        JSON.stringify(errors.slice(-100)),
      );
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

      const orderId = toPositiveId(item.order_id);
      if (orderId == null) {
        return { success: false, message: "Missing order_id — refuse store" };
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
        formData.append("order_id", String(orderId));
        if (item.commentId != null) {
          formData.append("order_log_id", String(item.commentId));
        }
        // formData.append("qr_data", item.qr_data ?? "null");

        const itemId = toPositiveId(item.item_id);
        if (itemId != null) {
          formData.append("item_id", String(itemId));
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
        return { success: false, message };
      }
    },
    [UserData, t]
  );

  const reportImageUploadError = useCallback(
    async (params: {
      order_id: number | null;
      item_id: number | null;
      order_log_id: number | null;
      error: string;
      file: string;
      qr_data?: string | null;
      dropbox_tracking_meta_data?: Record<string, any>;
    }): Promise<{ success: boolean; message?: string }> => {
      if (!UserData?.user?.verify_token) {
        return { success: false, message: "User data not available" };
      }

      try {
        const formData = new FormData();

        formData.append("token", UserData.user.verify_token);
        formData.append("role", UserData.user.role);
        formData.append("relaties_id", String(UserData.relaties?.id ?? ""));
        formData.append("user_id", String(UserData.user.id ?? ""));
        formData.append("order_id", String(params.order_id ?? ""));
        if (params.order_log_id != null) {
          formData.append("order_log_id", String(params.order_log_id));
        }
        formData.append("error", params.error);
        formData.append("file", params.file);
        formData.append("qr_data", params.qr_data ?? "null");
        formData.append(
          "dropbox_tracking_meta_data",
          JSON.stringify(params.dropbox_tracking_meta_data ?? {}),
        );

        if (params.item_id !== null && params.item_id !== undefined) {
          formData.append("item_id", String(params.item_id));
        }

        const response = await axios.post(
          apiConstants.store_tms_image_upload_error,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            transformRequest: (data) => data,
          },
        );

        const data = response?.data;
        if (!isStoreImageApiSuccess(data)) {
          throw new Error(data?.message || t("something_went_wrong"));
        }

        return { success: true };
      } catch (e: any) {
        const message =
          e?.response?.data?.message || e?.message || "Unknown API error";
        logDropboxUploadError("reportImageUploadError failed", {
          ...params,
          message,
        });
        return { success: false, message };
      }
    },
    [UserData, t],
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

  const persistMediaBeforeUpload = useCallback(async (item: LocalUploadItem): Promise<LocalUploadItem> => {
    const root = FileSystem.documentDirectory;
    if (!root) throw new Error("App storage is unavailable; media remains queued.");

    const queued = withBatchId(item);
    const directory = `${root}pending_uploads/${encodeURIComponent(queued.batchId!)}/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

    const durableUris: string[] = [];
    for (const [index, uri] of queued.image_data.entries()) {
      if (!uri) continue;
      if (uri.startsWith(root)) {
        durableUris.push(uri);
        continue;
      }

      const name = sanitizeFileUri(uri) || `media_${index}`;
      const destination = `${directory}${index}_${name}`;
      const [existing, sourceInfo] = await Promise.all([
        FileSystem.getInfoAsync(destination),
        FileSystem.getInfoAsync(uri),
      ]);
      const incompleteCopy = existing.exists &&
        typeof existing.size === "number" &&
        typeof sourceInfo.size === "number" &&
        existing.size !== sourceInfo.size;
      if (incompleteCopy) {
        await FileSystem.deleteAsync(destination, { idempotent: true });
      }
      if (!existing.exists || incompleteCopy) {
        await FileSystem.copyAsync({ from: uri, to: destination });
      }
      durableUris.push(destination);
    }

    const durableItem = { ...queued, image_data: durableUris };
    const originalKey = getQueueItemKey(item);
    let persistedQueue: LocalUploadItem[] = [];
    try {
      const stored = await AsyncStorage.getItem(STORAGE_QUEUE_KEY);
      persistedQueue = stored ? JSON.parse(stored) : [];
    } catch {
      persistedQueue = [];
    }
    const nextQueue = [...persistedQueue];
    latestQueueRef.current.forEach((entry) => {
      if (!nextQueue.some((queuedItem) => getQueueItemKey(queuedItem) === getQueueItemKey(entry))) {
        nextQueue.push(entry);
      }
    });
    const index = nextQueue.findIndex((entry) => getQueueItemKey(entry) === originalKey);
    if (index >= 0) nextQueue[index] = durableItem;
    else if (!nextQueue.some((entry) => getQueueItemKey(entry) === getQueueItemKey(durableItem))) {
      nextQueue.push(durableItem);
    }

    // Persist the durable file paths before allowing the upload worker to run.
    await AsyncStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(nextQueue));
    latestQueueRef.current = nextQueue;
    setLocalImagesUploadbeforeData?.(nextQueue);
    return durableItem;
  }, [setLocalImagesUploadbeforeData]);

  const processApiQueue = useCallback(
    async (queue: DropboxQueueItem[]): Promise<void> => {
      if (!setDropBoxUploadImageDataQues) return;
      if (isApiProcessingRef.current || queue.length === 0) return;
      if (networkAvailable !== true) {
        if (networkAvailable === false) notifyOfflineOnce();
        return;
      }

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
          shownUploadFailureKeysRef.current.delete(`api:${getQueueItemKey(item)}`);
          syncApiQueue(latestApiQueueRef.current.filter((q) => !isSameQueueItem(q, item)));
        } else {
          apiErrorCountRef.current += 1;
          const errorMessage = result.message || t("something_went_wrong");
          showUploadErrorOnce(`api:${getQueueItemKey(item)}`, errorMessage);
          await saveApiErrorToStorage(item, errorMessage);

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
      showUploadErrorOnce,
      t,
      networkAvailable,
      notifyOfflineOnce,
    ]
  );

  useEffect(() => {
    processApiQueueFnRef.current = processApiQueue;
  }, [processApiQueue]);

  const processQueueItem = useCallback(
    async (item: LocalUploadItem): Promise<boolean> => {
      if (!setDropBoxUploadImageDataQues || !setLocalImagesUploadbeforeData) return false;

      const boundOrderId = toPositiveId(item.order_id);
      if (boundOrderId == null || !item.image_data?.length) {
        if (__DEV__) {
          console.warn("[DropboxUpload] skip queue item — invalid order_id or empty images", {
            order_id: item.order_id,
            imageCount: item.image_data?.length ?? 0,
          });
        }
        return true;
      }

      const batchItem = withBatchId({
        ...item,
        order_id: boundOrderId,
        item_id: toPositiveId(item.item_id),
      });
      const itemKey = getQueueItemKey(batchItem);
      const trackingStartedAt = batchItem.tracking_started_at ?? Date.now();

      if (processingLocalKeysRef.current.has(itemKey)) {
        return true;
      }

      processingLocalKeysRef.current.add(itemKey);

      try {
        const uris = item.image_data.filter(Boolean);
        if (uris.length === 0) {
          processingLocalKeysRef.current.delete(itemKey);
          return true;
        }

        const folder = resolveBoundDropboxFolder(boundOrderId, batchItem.folder);
        const results = await Promise.all(uris.map((uri) => uploadSingleFile(uri, folder)));

        const uploaded: FileUploadResult[] = [];
        const failed: { error: string; file: string; userMessage: string }[] = [];

        for (const result of results) {
          if (!result) continue;
          if (result.ok === false) {
            failed.push({ error: result.error, file: result.file, userMessage: result.userMessage });
          } else {
            uploaded.push(result.data);
            shownUploadFailureKeysRef.current.delete(
              `file:${batchItem.order_id}:${batchItem.item_id ?? "none"}:${result.data.file}`,
            );
          }
        }

        failed.forEach((failure) => {
          showUploadErrorOnce(
            `file:${batchItem.order_id}:${batchItem.item_id ?? "none"}:${failure.file}`,
            failure.userMessage || t(UPLOAD_TOAST.generic),
          );
        });

        const finishedAt = Date.now();
        const deviceMeta = await getDeviceMeta();
        const uploadSuccess = uploaded.length > 0 && failed.length === 0;
        const partialSuccess = uploaded.length > 0 && failed.length > 0;
        const statusTag = uploadSuccess
          ? "success"
          : partialSuccess
            ? "partial"
            : "failed";
        const errorSummary =
          failed.length > 0
            ? failed.map((f) => `${f.file}: ${f.error}`).join(" | ")
            : uploadSuccess
              ? "upload_success"
              : "upload_failed";
        const fileSummary =
          [
            ...uploaded.map((u) => u.file),
            ...failed.map((f) => f.file),
          ].join(",") || "none";

        const dropbox_tracking_meta_data = {
          status: statusTag,
          upload_success: uploadSuccess,
          order_id: batchItem.order_id,
          item_id: batchItem.item_id,
          order_log_id: batchItem.commentId,
          batch_id: batchItem.batchId ?? null,
          source: batchItem.source ?? "queue",
          folder,
          picture_count:
            batchItem.picture_count ?? batchItem.image_data?.length ?? uris.length,
          pictures_attempted: uris.length,
          pictures_uploaded: uploaded.length,
          pictures_failed: failed.length,
          parcel_count: batchItem.parcel_count ?? null,
          duration_ms: Math.max(0, finishedAt - trackingStartedAt),
          started_at: trackingStartedAt,
          finished_at: finishedAt,
          started_at_iso: new Date(trackingStartedAt).toISOString(),
          finished_at_iso: new Date(finishedAt).toISOString(),
          device: {
            ...deviceMeta,
            brand: Device.brand ?? null,
            model_name: Device.modelName ?? null,
            model_id: Device.modelId ?? null,
            os_version: Device.osVersion ?? null,
            platform: Platform.OS,
            platform_version: String(Platform.Version ?? ""),
            app_build:
              Constants.expoConfig?.android?.versionCode ??
              Constants.nativeBuildVersion ??
              null,
            is_device: Device.isDevice ?? null,
          },
          dropbox_uploaded: uploaded,
          dropbox_failed: failed,
          qr_data: batchItem.qr_data ?? null,
          error_summary: errorSummary,
        };

        await reportImageUploadError({
          order_id: batchItem.order_id,
          item_id: batchItem.item_id,
          order_log_id: batchItem.commentId,
          error: errorSummary,
          file: fileSummary,
          qr_data: batchItem.qr_data ?? null,
          dropbox_tracking_meta_data,
        });

        // Retry only the files that did not finish the Dropbox upload + link step.
        // Successfully uploaded files continue to the API queue below.
        if (failed.length > 0) {
          const failedUris = uris.filter((uri) =>
            failed.some((failure) => failure.file === sanitizeFileUri(uri)),
          );
          if (failedUris.length > 0) {
            syncLocalQueue([
              ...latestQueueRef.current.filter((q) => !isSameLocalItem(q, batchItem)),
              { ...batchItem, batchId: createBatchId(), image_data: failedUris },
            ]);
          }
        }

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
          return failed.length > 0;
        }

        const doneItem: DropboxQueueItem = withBatchId({
          order_id: batchItem.order_id,
          image_data: uploaded,
          item_id: batchItem.item_id,
          commentId: batchItem.commentId,
          batchId: batchItem.batchId,
          qr_data: batchItem.qr_data ?? null,
        });

        const doneKey = getQueueItemKey(doneItem);
        const apiQueue = latestApiQueueRef.current;
        const alreadyInApiQueue = apiQueue.some((q) => getQueueItemKey(q) === doneKey);

        if (!alreadyInApiQueue) {
          apiStoppedRef.current = false;
          apiErrorCountRef.current = 0;
          syncApiQueue([...apiQueue, doneItem]);
        }
        syncLocalQueue(latestQueueRef.current.filter((q) => !isSameLocalItem(q, batchItem)));
        processingLocalKeysRef.current.delete(itemKey);

        return true;

      } catch (e: any) {
        const errorMessage =
          e?.message || e?.response?.data?.message || "Unknown queue upload error";
        const userMessage = getUserFriendlyExceptionError(e, t);
        const finishedAt = Date.now();

        try {
          const deviceMeta = await getDeviceMeta();
          await reportImageUploadError({
            order_id: batchItem.order_id,
            item_id: batchItem.item_id,
            order_log_id: batchItem.commentId,
            error: errorMessage,
            file: (batchItem.image_data || [])
              .map((uri) => sanitizeFileUri(String(uri)))
              .join(","),
            qr_data: batchItem.qr_data ?? null,
            dropbox_tracking_meta_data: {
              status: "exception",
              upload_success: false,
              order_id: batchItem.order_id,
              item_id: batchItem.item_id,
              order_log_id: batchItem.commentId,
              batch_id: batchItem.batchId ?? null,
              source: batchItem.source ?? "queue",
              folder: batchItem.folder ||
                (batchItem.order_id != null
                  ? buildDropboxOrderFolder(batchItem.order_id)
                  : "photos"),
              picture_count:
                batchItem.picture_count ?? batchItem.image_data?.length ?? 0,
              pictures_attempted: batchItem.image_data?.length ?? 0,
              pictures_uploaded: 0,
              pictures_failed: batchItem.image_data?.length ?? 0,
              parcel_count: batchItem.parcel_count ?? null,
              duration_ms: Math.max(0, finishedAt - trackingStartedAt),
              started_at: trackingStartedAt,
              finished_at: finishedAt,
              started_at_iso: new Date(trackingStartedAt).toISOString(),
              finished_at_iso: new Date(finishedAt).toISOString(),
              device: {
                ...deviceMeta,
                brand: Device.brand ?? null,
                model_name: Device.modelName ?? null,
                model_id: Device.modelId ?? null,
                os_version: Device.osVersion ?? null,
                platform: Platform.OS,
                platform_version: String(Platform.Version ?? ""),
                app_build:
                  Constants.expoConfig?.android?.versionCode ??
                  Constants.nativeBuildVersion ??
                  null,
                is_device: Device.isDevice ?? null,
              },
              dropbox_uploaded: [],
              dropbox_failed: [],
              exception: {
                message: errorMessage,
                user_message: userMessage,
                code: e?.code ?? null,
                name: e?.name ?? null,
              },
              qr_data: batchItem.qr_data ?? null,
              error_summary: errorMessage,
            },
          });
        } catch {
        }

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
        syncLocalQueue([
          ...latestQueueRef.current.filter((q) => !isSameLocalItem(q, batchItem)),
          batchItem,
        ]);
        showUploadErrorOnce(
          `queue:${batchItem.batchId || itemKey}`,
          userMessage,
        );
        return false;
      }
    },
    [uploadSingleFile, reportImageUploadError, setDropBoxUploadImageDataQues, setLocalImagesUploadbeforeData, syncLocalQueue, syncApiQueue, showUploadErrorOnce, t]
  );

  const processQueue = useCallback(
    async (queue: LocalUploadItem[]): Promise<void> => {
      if (!setLocalImagesUploadbeforeData) return;
      if (isProcessingRef.current || queue.length === 0) return;

      isProcessingRef.current = true;
      setLoading(true);

      try {
        const snapshot = latestQueueRef.current
          .filter((item) => !processingLocalKeysRef.current.has(getQueueItemKey(item)))
          .filter(
            (item, index, arr) =>
              arr.findIndex((q) => getQueueItemKey(q) === getQueueItemKey(item)) === index
          );

        const durableItems: LocalUploadItem[] = [];
        for (const item of snapshot) {
          try {
            durableItems.push(await persistMediaBeforeUpload(item));
          } catch (error: any) {
            console.error("[DropboxUpload] Could not persist queued media", {
              order_id: item.order_id,
              item_id: item.item_id,
              batch_id: item.batchId ?? null,
              message: error?.message ?? String(error),
            });
          }
        }

        if (networkAvailable !== true) {
          if (networkAvailable === false && snapshot.length > 0) notifyOfflineOnce();
          return;
        }
        if (!AccessToken && !RefreshToken) return;

        for (const item of durableItems) {
          await processQueueItem(item);
        }

      } catch (e) {
      } finally {
        isProcessingRef.current = false;
        setLoading(false);
        if (latestQueueRef.current.length > 0 && !localRetryTimerRef.current) {
          localRetryTimerRef.current = setTimeout(() => {
            localRetryTimerRef.current = null;
            const pending = latestQueueRef.current;
            if (pending.length > 0) processQueueFnRef.current?.(pending);
          }, LOCAL_RETRY_DELAY_MS);
        }
      }
    },
    [AccessToken, RefreshToken, processQueueItem, persistMediaBeforeUpload, setLocalImagesUploadbeforeData, networkAvailable, notifyOfflineOnce]
  );

  useEffect(() => {
    processQueueFnRef.current = processQueue;
  }, [processQueue]);

  useEffect(() => {
    if (!setLocalImagesUploadbeforeData || !setDropBoxUploadImageDataQues) return;

    const restoreAndStart = async () => {
      try {
        await AsyncStorage.removeItem("COMPLETED_API_KEYS");

        const storedQueue = await AsyncStorage.getItem(STORAGE_QUEUE_KEY);
        const storedApiQueue = await AsyncStorage.getItem(STORAGE_API_QUEUE_KEY);
        const storedErrors = await AsyncStorage.getItem(STORAGE_ERROR_KEY);
        const storedApiErrors = await AsyncStorage.getItem(STORAGE_API_ERROR_KEY);

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

        const persistedQueue: LocalUploadItem[] = storedQueue ? JSON.parse(storedQueue) : [];
        const legacyErrors: LocalUploadItem[] = storedErrors ? JSON.parse(storedErrors) : [];
        const mergedQueue = [...persistedQueue];
        legacyErrors.forEach((item) => {
          if (!mergedQueue.some((queued) => isSameLocalItem(queued, item))) {
            mergedQueue.push(item);
          }
        });
        if (mergedQueue.length > 0) {
          // Promote legacy failures into the durable active queue before
          // clearing their old storage, so restart cannot lose pending media.
          await AsyncStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(mergedQueue));
          setLocalImagesUploadbeforeData((prev: LocalUploadItem[]) => {
            const current = [...(prev || [])];
            mergedQueue.forEach((item) => {
              if (!current.some((q) => isSameLocalItem(q, item))) current.push(item);
            });
            return current;
          });
        }
        if (storedErrors) await AsyncStorage.removeItem(STORAGE_ERROR_KEY);

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
    }
  }, [LocalImagesUploadbeforeData, processQueue, restored, AccessToken, RefreshToken, networkAvailable]);

  useEffect(() => {
    if (!restored) return;

    if (DropBoxUploadImageDataQues?.length > 0 && !isApiProcessingRef.current && !apiStoppedRef.current) {
      processApiQueue(DropBoxUploadImageDataQues);
    }
  }, [DropBoxUploadImageDataQues, processApiQueue, restored, UserData, networkAvailable]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || networkAvailable !== true) return;
      if (latestQueueRef.current.length > 0) {
        processQueueFnRef.current?.(latestQueueRef.current);
      }
      if (latestApiQueueRef.current.length > 0) {
        processApiQueueFnRef.current?.(latestApiQueueRef.current);
      }
    });
    return () => subscription.remove();
  }, [networkAvailable]);

  useEffect(() => {
    // The previous task uploaded to Dropbox without saving the database stage,
    // which could create duplicate remote files. Pending jobs resume through
    // the durable queue when the app is active again.
    void BackgroundTask.unregisterTaskAsync(TASK_NAME).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (apiRetryTimerRef.current) {
        clearTimeout(apiRetryTimerRef.current);
      }
      if (localRetryTimerRef.current) {
        clearTimeout(localRetryTimerRef.current);
      }
    };
  }, []);

  return {
    loading,
    refreshAccessToken,
  };
}
