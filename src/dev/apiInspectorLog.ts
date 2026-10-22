import axios from "axios";
import { getApiBaseUrl } from "@/src/utils/apiBaseUrl";

const MAX_ENTRIES = 5;
const MAX_TEXT = 50000;

export type ApiInspectorIdentity = {
  userId?: string | number | null;
  role?: string | null;
  relatiesId?: string | number | null;
};

export type ApiLogEntry = {
  id: string;
  method: string;
  url: string;
  status: number | null;
  ok: boolean;
  durationMs: number;
  requestText: string;
  responseText: string;
  errorText: string | null;
  at: number;
};

const ALLOWED_PRODUCTION_USER_IDS = new Set(["719", "785"]);

let identity: ApiInspectorIdentity | null = null;
let entries: ApiLogEntry[] = [];
const listeners = new Set<() => void>();
let installed = false;
let seq = 0;

export function readApiInspectorIdentity(raw: any): ApiInspectorIdentity {
  const root = raw?.user ? raw : raw?.data?.user ? raw.data : raw?.data ?? raw;
  return {
    userId: root?.user?.id ?? root?.user_id ?? root?.id ?? null,
    role: root?.user?.role ?? root?.role ?? null,
    relatiesId: root?.relaties?.id ?? root?.relaties_id ?? null,
  };
}

export function isApiInspectorAllowed(
  next: ApiInspectorIdentity | null = identity,
): boolean {
  if (__DEV__) return true;
  return ALLOWED_PRODUCTION_USER_IDS.has(String(next?.userId ?? ""));
}

export function setApiInspectorIdentity(next: ApiInspectorIdentity | null): void {
  identity = next;
  if (!isApiInspectorAllowed(next)) {
    entries = [];
  }
}

export function getApiLogEntries(): ApiLogEntry[] {
  return entries;
}

export function subscribeApiLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function isAppApiUrl(url: string): boolean {
  if (!url || url.includes("dropbox")) return false;
  const base = getApiBaseUrl().replace(/\/+$/, "");
  return (
    url.startsWith(base) ||
    url.includes("erpportaal.nl/api") ||
    url.includes("gesutms.nl/api")
  );
}

function formValue(value: unknown): unknown {
  if (value && typeof value === "object" && "uri" in (value as object)) {
    const file = value as { uri?: string; name?: string; type?: string };
    return { file: file.name || "file", type: file.type || "" };
  }
  return value;
}

export function requestBodyToPlain(data: unknown): unknown {
  if (data == null) return null;
  const parts = (data as { _parts?: [string, unknown][] })._parts;
  if (Array.isArray(parts)) {
    const body: Record<string, unknown> = {};
    parts.forEach(([key, value]) => {
      const plain = formValue(value);
      if (body[key] === undefined) {
        body[key] = plain;
        return;
      }
      const current = body[key];
      body[key] = Array.isArray(current) ? [...current, plain] : [current, plain];
    });
    return body;
  }
  return data;
}

function toText(value: unknown): string {
  if (value == null || value === "") return "—";
  try {
    const text =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    if (text.length <= MAX_TEXT) return text;
    return `${text.slice(0, MAX_TEXT)}\n… truncated`;
  } catch {
    return String(value);
  }
}

function record(entry: Omit<ApiLogEntry, "id" | "requestText" | "responseText"> & {
  request: unknown;
  response: unknown;
}): void {
  if (!isApiInspectorAllowed()) return;
  const next: ApiLogEntry = {
    id: `${Date.now()}_${seq++}`,
    method: entry.method,
    url: entry.url,
    status: entry.status,
    ok: entry.ok,
    durationMs: entry.durationMs,
    requestText: toText(requestBodyToPlain(entry.request)),
    responseText: toText(entry.response),
    errorText: entry.errorText,
    at: entry.at,
  };
  entries = [next, ...entries].slice(0, MAX_ENTRIES);
  emit();
}

function fullUrl(config: { baseURL?: string; url?: string } | undefined): string {
  const url = config?.url || "";
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = config?.baseURL || getApiBaseUrl();
  return `${base.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

export function installApiInspector(): void {
  if (installed) return;
  installed = true;

  axios.interceptors.request.use((config) => {
    (config as { __inspectorStart?: number }).__inspectorStart = Date.now();
    return config;
  });

  axios.interceptors.response.use(
    (response) => {
      const config = response.config as {
        url?: string;
        baseURL?: string;
        method?: string;
        data?: unknown;
        __inspectorStart?: number;
      };
      const url = fullUrl(config);
      if (isAppApiUrl(url)) {
        const started = config.__inspectorStart ?? Date.now();
        record({
          method: (config.method || "POST").toUpperCase(),
          url,
          status: response.status ?? null,
          ok: true,
          durationMs: Math.max(0, Date.now() - started),
          request: config.data,
          response: response.data,
          errorText: null,
          at: Date.now(),
        });
      }
      return response;
    },
    (error) => {
      const config = error?.config as
        | {
            url?: string;
            baseURL?: string;
            method?: string;
            data?: unknown;
            __inspectorStart?: number;
          }
        | undefined;
      const url = fullUrl(config);
      if (isAppApiUrl(url)) {
        const started = config?.__inspectorStart ?? Date.now();
        record({
          method: (config?.method || "POST").toUpperCase(),
          url,
          status: error?.response?.status ?? null,
          ok: false,
          durationMs: Math.max(0, Date.now() - started),
          request: config?.data,
          response: error?.response?.data ?? null,
          errorText: error?.message || "Request failed",
          at: Date.now(),
        });
      }
      return Promise.reject(error);
    },
  );
}
