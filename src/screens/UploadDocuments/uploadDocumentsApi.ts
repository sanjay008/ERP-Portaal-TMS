import apiConstants from "@/src/api/apiConstants";
import ApiService from "@/src/utils/Apiservice";
import type {
  PickedDocumentFile,
  QuickUploadType,
  RelatieDocument,
} from "./types";

type AuthUser = {
  user?: {
    id?: number | string;
    role?: string;
    verify_token?: string;
  };
  relaties?: {
    id?: number | string;
  };
};

export function buildDocumentAuth(userData: AuthUser | null | undefined) {
  return {
    token: userData?.user?.verify_token,
    relaties_id: userData?.relaties?.id,
    user_id: userData?.user?.id,
    role: userData?.user?.role,
  };
}

export function isApiSuccess(res: any) {
  return (
    Boolean(res?.status) &&
    (res?.status_code == null || Number(res.status_code) === 200)
  );
}

export async function fetchQuickUploadTypes(
  userData: AuthUser | null | undefined,
  mobileOnly = true,
) {
  return ApiService(apiConstants.getQuickUploadTypes, {
    customData: {
      ...buildDocumentAuth(userData),
      mobile_only: mobileOnly ? 1 : 0,
    },
  });
}

export async function fetchRelatieDocuments(
  userData: AuthUser | null | undefined,
) {
  return ApiService(apiConstants.getRelatieDocuments, {
    customData: buildDocumentAuth(userData),
  });
}

export async function fetchDocumentDetails(
  userData: AuthUser | null | undefined,
  documentId: number | string,
) {
  return ApiService(apiConstants.getDocumentDetails, {
    customData: {
      ...buildDocumentAuth(userData),
      document_id: documentId,
    },
  });
}

export type QuickUploadPayload = {
  type: string;
  expire_date?: string;
  front_file: PickedDocumentFile;
  back_file: PickedDocumentFile;
  filename?: string;
  short_description?: string;
};

export async function quickUploadDocuments(
  userData: AuthUser | null | undefined,
  payload: QuickUploadPayload,
) {
  return ApiService(apiConstants.quickUploadDocument, {
    customData: {
      ...buildDocumentAuth(userData),
      type: payload.type,
      expire_date: payload.expire_date || "",
      filename: payload.filename || payload.type,
      short_description: payload.short_description || "",
      front_file: {
        uri: payload.front_file.uri,
        name: payload.front_file.name || "photo_front.jpg",
        type: payload.front_file.type || "image/jpeg",
      },
      back_file: {
        uri: payload.back_file.uri,
        name: payload.back_file.name || "photo_back.jpg",
        type: payload.back_file.type || "image/jpeg",
      },
    },
  });
}

export function parseQuickUploadTypes(res: any): QuickUploadType[] {
  const list = res?.data?.types;
  if (!Array.isArray(list)) return [];
  return list.filter(
    (item) =>
      item &&
      (item.show_on_mobile !== false) &&
      (item.type || item.slug),
  );
}

export function parseRelatieDocuments(res: any): RelatieDocument[] {
  const list = res?.data?.documents;
  if (!Array.isArray(list)) return [];
  return list;
}

export function parseDocumentDetails(res: any): RelatieDocument | null {
  const data = res?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (data.id == null) return null;
  return data as RelatieDocument;
}

function collectErrorStrings(value: unknown, out: string[]) {
  if (value == null) return;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) out.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectErrorStrings(item, out));
    return;
  }
  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) =>
      collectErrorStrings(item, out),
    );
  }
}

export function extractDocumentApiError(payload: any): string {
  if (payload == null) return "";
  if (typeof payload === "string") return payload.trim();

  const root =
    payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? { ...payload, ...payload.data }
      : payload;

  if (!root || typeof root !== "object") return "";

  const direct =
    (typeof root.message === "string" && root.message.trim()) ||
    (typeof root.error === "string" && root.error.trim()) ||
    "";

  const fieldMessages: string[] = [];
  if (root.errors != null) {
    collectErrorStrings(root.errors, fieldMessages);
  }

  if (fieldMessages.length) {
    const generic = /^validation\s+(failed|error)/i.test(direct);
    if (direct && !generic) return `${direct}. ${fieldMessages.join(". ")}`;
    return fieldMessages.join(". ");
  }

  return direct;
}
