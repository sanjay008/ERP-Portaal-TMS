/** One clean request / response log line for Rejection APIs. */

function redactValue(key: string, value: unknown): unknown {
  const k = key.toLowerCase();
  if (k.includes("token") || k.includes("signature")) {
    if (typeof value === "string" && value.length > 24) {
      return `${value.slice(0, 12)}…(${value.length})`;
    }
  }
  if (k === "qr_data" && typeof value === "string" && value.length > 120) {
    return `${value.slice(0, 80)}…`;
  }
  return value;
}

function sanitizeForLog(data: unknown): unknown {
  if (data == null || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map((row) => sanitizeForLog(row));
  }
  const out: Record<string, unknown> = {};
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value != null && typeof value === "object" && !(value instanceof Date)) {
      out[key] = sanitizeForLog(value);
      return;
    }
    out[key] = redactValue(key, value);
  });
  return out;
}

export function logRejectionApi(
  name: string,
  kind: "REQ" | "RES" | "ERR",
  data?: unknown,
) {
  console.log(`[Rejection] ${name} ${kind}`, sanitizeForLog(data));
}
