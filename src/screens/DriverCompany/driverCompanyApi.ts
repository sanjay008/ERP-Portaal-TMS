import apiConstants from "@/src/api/apiConstants";
import ApiService from "@/src/utils/Apiservice";
import type { DriverCompanyGetData, DriverCompanyRecord } from "./types";

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

export function buildDriverCompanyAuth(userData: AuthUser | null | undefined) {
  return {
    token: userData?.user?.verify_token,
    relaties_id: userData?.relaties?.id,
    user_id: userData?.user?.id,
    role: userData?.user?.role,
  };
}

export async function fetchDriverCompany(userData: AuthUser | null | undefined) {
  return ApiService(apiConstants.getDriverCompany, {
    customData: buildDriverCompanyAuth(userData),
  });
}

export async function storeDriverCompany(
  userData: AuthUser | null | undefined,
  fields: Record<string, any>,
  logo?: { uri: string; name?: string; type?: string } | null,
) {
  const payload: Record<string, any> = {
    ...buildDriverCompanyAuth(userData),
    ...fields,
  };
  if (logo?.uri) {
    payload.logo = {
      uri: logo.uri,
      name: logo.name || "logo.jpg",
      type: logo.type || "image/jpeg",
    };
  }
  return ApiService(apiConstants.storeDriverCompany, {
    customData: payload,
  });
}

export async function updateDriverCompany(
  userData: AuthUser | null | undefined,
  companyId: string | number,
  fields: Record<string, any>,
  logo?: { uri: string; name?: string; type?: string } | null,
) {
  const payload: Record<string, any> = {
    ...buildDriverCompanyAuth(userData),
    company_id: companyId,
    ...fields,
  };
  if (logo?.uri) {
    payload.logo = {
      uri: logo.uri,
      name: logo.name || "logo.jpg",
      type: logo.type || "image/jpeg",
    };
  }
  return ApiService(apiConstants.updateDriverCompany, {
    customData: payload,
  });
}

export async function uploadDriverCompanyLogo(
  userData: AuthUser | null | undefined,
  companyId: string | number,
  logo: { uri: string; name?: string; type?: string },
) {
  return ApiService(apiConstants.uploadDriverCompanyLogo, {
    customData: {
      ...buildDriverCompanyAuth(userData),
      company_id: companyId,
      logo: {
        uri: logo.uri,
        name: logo.name || "logo.jpg",
        type: logo.type || "image/jpeg",
      },
    },
  });
}

export function parseGetPayload(res: any): DriverCompanyGetData {
  const data = res?.data ?? {};
  return {
    screen: data?.screen === "view_edit" ? "view_edit" : "add",
    can_add: data?.can_add !== false,
    company: (data?.company as DriverCompanyRecord) || null,
    defaults: data?.defaults || {},
    form: data?.form || {},
  };
}

export function isApiSuccess(res: any) {
  return Boolean(res?.status) && (res?.status_code == null || Number(res.status_code) === 200);
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

function normalizeErrorPayload(payload: any) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return { ...payload, ...payload.data };
  }
  return payload;
}

/** Pull human-readable message from TMS API error payloads (422, etc.). */
export function extractApiErrorMessage(payload: any): string {
  if (payload == null) return "";
  if (typeof payload === "string") return payload.trim();

  const root = normalizeErrorPayload(payload);
  if (!root || typeof root !== "object") return "";

  const direct =
    (typeof root.message === "string" && root.message.trim()) ||
    (typeof root.error === "string" && root.error.trim()) ||
    (typeof root.error_message === "string" && root.error_message.trim()) ||
    "";

  const fieldMessages: string[] = [];
  if (root.errors != null) {
    collectErrorStrings(root.errors, fieldMessages);
  }

  if (fieldMessages.length) {
    const genericValidation = /^validation\s+(failed|error)/i.test(direct);
    if (direct && !genericValidation) {
      return `${direct}. ${fieldMessages.join(". ")}`;
    }
    return fieldMessages.join(". ");
  }

  return direct;
}

/** Map API `errors` object to form field keys for inline validation. */
export function extractApiFieldErrors(payload: any): Record<string, string> {
  const root = normalizeErrorPayload(payload);
  if (
    !root?.errors ||
    typeof root.errors !== "object" ||
    Array.isArray(root.errors)
  ) {
    return {};
  }

  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(root.errors)) {
    const parts: string[] = [];
    collectErrorStrings(value, parts);
    if (parts.length) mapped[key] = parts[0];
  }
  return mapped;
}
