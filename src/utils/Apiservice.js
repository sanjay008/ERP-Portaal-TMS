
import axios from "axios";
import apiConstants from "../api/apiConstants";
import { getData } from "../utils/storeData";
import { getChauffeurCoordsForApi } from "./chauffeurLocationCache";

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "verify_token",
  "expo_token",
]);

function maskValue(key, value) {
  if (!SENSITIVE_KEYS.has(String(key).toLowerCase())) return value;
  const text = String(value ?? "");
  if (text.length <= 8) return "***";
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

function formDataToObject(formData) {
  if (!formData) return null;
  const parts = formData?._parts;
  if (!Array.isArray(parts)) return "[FormData]";

  const out = {};
  parts.forEach(([key, value]) => {
    let next = value;
    if (value && typeof value === "object" && value.uri) {
      next = `[file:${value.name || "upload"}]`;
    } else {
      next = maskValue(key, value);
    }

    if (Object.prototype.hasOwnProperty.call(out, key)) {
      if (!Array.isArray(out[key])) out[key] = [out[key]];
      out[key].push(next);
      return;
    }
    out[key] = next;
  });
  return out;
}

function shortEndpoint(endpoint) {
  if (!endpoint) return "-";
  try {
    const url = String(endpoint);
    const idx = url.indexOf("/api/");
    return idx >= 0 ? url.slice(idx) : url;
  } catch {
    return String(endpoint);
  }
}

// Metro/Cursor terminal is plain text — click / arrow expand does NOT work.
// false = short Response summary | true = full Response JSON in the box
const SHOW_FULL_API_RESPONSE = false;

const apiLogHistory = [];
const API_LOG_HISTORY_MAX = 20;

function toLogText(value) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function summarizeResponse(value) {
  if (value == null || typeof value !== "object") return value;

  const out = {};
  const prefer = [
    "status",
    "success",
    "message",
    "msg",
    "error",
    "errors",
    "code",
  ];
  prefer.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      out[key] = value[key];
    }
  });

  Object.keys(value).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(out, key)) return;
    const child = value[key];
    if (Array.isArray(child)) {
      out[key] = `[Array(${child.length})]`;
      return;
    }
    if (child && typeof child === "object") {
      const keys = Object.keys(child);
      out[key] = `{${keys.slice(0, 6).join(", ")}${
        keys.length > 6 ? ", …" : ""
      }}`;
      return;
    }
    out[key] = child;
  });

  return out;
}

function rememberApiLog(entry) {
  apiLogHistory.unshift(entry);
  if (apiLogHistory.length > API_LOG_HISTORY_MAX) {
    apiLogHistory.length = API_LOG_HISTORY_MAX;
  }
}

function dumpApi(index = 0) {
  const entry = apiLogHistory[index];
  if (!entry) {
    console.log("[API] dumpApi: no stored response");
    return null;
  }
  logApiBlock(`API DUMP #${index} ${entry.title}`, [
    { label: "Endpoint", value: entry.endpoint },
    { label: "Response", value: entry.response },
  ]);
  return entry.response;
}

if (typeof globalThis !== "undefined") {
  globalThis.dumpApi = dumpApi;
  globalThis.API_LOG_FULL = globalThis.API_LOG_FULL ?? SHOW_FULL_API_RESPONSE;
}

function logApiBlock(title, lines) {
  const border = "─".repeat(48);

  console.log(`\n┌${border}`);
  console.log(`│ ${title}`);
  console.log(`├${border}`);

  lines.forEach((line) => {
    if (typeof line === "string") {
      console.log(`│ ${line}`);
      return;
    }

    console.log(`│ ${line.label}:`);
    String(toLogText(line.value ?? null))
      .split("\n")
      .forEach((row) => console.log(`│   ${row}`));
  });

  console.log(`└${border}\n`);
}

function logApiResponseBlock(title, endpoint, responseValue) {
  const wantFull =
    Boolean(globalThis?.API_LOG_FULL) || SHOW_FULL_API_RESPONSE;
  const display = wantFull
    ? responseValue
    : summarizeResponse(responseValue);

  rememberApiLog({ title, endpoint, response: responseValue });

  const lines = [
    { label: "Endpoint", value: String(endpoint) },
    { label: "Response", value: display },
  ];

  if (!wantFull) {
    lines.push("Full → SHOW_FULL_API_RESPONSE=true in Apiservice.js");
  }

  logApiBlock(title, lines);
}

const ApiService = async (endpoint, options = {}) => {
  let requestData;
  let customData = options.customData;

  try {
    const verify_token = await getData("USERDATA");

    const isLiveLocationEndpoint =
      endpoint === apiConstants.update_driver_live_location;
    if (customData && !isLiveLocationEndpoint) {
      const userData = verify_token?.data ?? verify_token;
      const coords = getChauffeurCoordsForApi(userData?.user?.role);
      if (coords) {
        customData = {
          ...coords,
          ...customData,
        };
      }
    }

    if (options.includeToken || customData) {
      requestData = new FormData();

      if (options.includeToken) {
        requestData.append("token", verify_token.data.user.verify_token);
      }

      Object.keys(customData || {}).forEach((key) => {
        const value = customData[key];

        if (
          key === "is_damage" &&
          Array.isArray(value) &&
          value.length > 0 &&
          typeof value[0] === "object" &&
          value[0] !== null
        ) {
          value.forEach((row, index) => {
            if (row?.item_id != null) {
              requestData.append(
                `is_damage[${index}][item_id]`,
                String(row.item_id),
              );
            }
            if (row?.damage_id != null) {
              requestData.append(
                `is_damage[${index}][damage_id]`,
                String(row.damage_id),
              );
            }
          });
          return;
        }

        if (
          key === "is_parcel_damage_accept" &&
          Array.isArray(value) &&
          value.length > 0 &&
          typeof value[0] === "object" &&
          value[0] !== null
        ) {
          value.forEach((row, index) => {
            if (row?.product_id != null) {
              requestData.append(
                `is_parcel_damage_accept[${index}][product_id]`,
                String(row.product_id),
              );
            }
            if (row?.item_id != null) {
              requestData.append(
                `is_parcel_damage_accept[${index}][item_id]`,
                String(row.item_id),
              );
            }
            if (row?.damage != null) {
              requestData.append(
                `is_parcel_damage_accept[${index}][damage]`,
                String(row.damage),
              );
            }
            if (row?.accept != null) {
              requestData.append(
                `is_parcel_damage_accept[${index}][accept]`,
                String(row.accept),
              );
            }
          });
          return;
        }

        if (
          Array.isArray(value) &&
          value.length > 0 &&
          typeof value[0] === "object" &&
          value[0] !== null &&
          value[0].uri
        ) {
          const formKey = key.endsWith("[]") ? key : `${key}[]`;
          value.forEach((file, index) => {
            requestData.append(formKey, {
              uri: file.uri,
              name: file.name || `file_${index + 1}.jpg`,
              type: file.type || "image/jpeg",
            });
          });
          return;
        }

        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (item == null) return;
            requestData.append(`${key}[${index}]`, String(item));
          });
          return;
        }

        if (value == null) return;

        if (typeof value === "object") {
          if (value.uri) {
            requestData.append(key, {
              uri: value.uri,
              name: value.name || "file.jpg",
              type: value.type || "image/jpeg",
            });
            return;
          }
          try {
            requestData.append(key, JSON.stringify(value));
          } catch {
            requestData.append(key, String(value));
          }
          return;
        }

        requestData.append(
          key,
          typeof value === "boolean" ? (value ? "1" : "0") : String(value),
        );
      });
    }

    const method = (options.method || "POST").toUpperCase();
    logApiBlock(`API → ${method} ${shortEndpoint(endpoint)}`, [
      { label: "Endpoint", value: String(endpoint) },
      {
        label: "Request",
        value: formDataToObject(requestData) ?? customData ?? null,
      },
    ]);

    const response = await axios({
      method: options.method || "POST",
      url: endpoint,
      data: requestData || undefined,
      headers: {
        "Content-Type": requestData
          ? "multipart/form-data"
          : "application/json",
      },
    });

    logApiResponseBlock(
      `API ✓ ${method} ${shortEndpoint(endpoint)}`,
      endpoint,
      response?.data ?? null,
    );

    return response.data;
  } catch (error) {
    const method = (options.method || "POST").toUpperCase();
    const errorBody =
      error?.response?.data ?? error?.message ?? String(error);
    const wantFull =
      Boolean(globalThis?.API_LOG_FULL) || SHOW_FULL_API_RESPONSE;

    rememberApiLog({
      title: `API ✗ ${method} ${shortEndpoint(endpoint)}`,
      endpoint,
      response: errorBody,
    });

    const lines = [
      { label: "Endpoint", value: String(endpoint) },
      {
        label: "Request",
        value: formDataToObject(requestData) ?? customData ?? null,
      },
      {
        label: "Error",
        value: wantFull ? errorBody : summarizeResponse(errorBody),
      },
      {
        label: "Status",
        value: error?.response?.status ?? "-",
      },
    ];
    if (!wantFull) {
      lines.push("Full → SHOW_FULL_API_RESPONSE=true in Apiservice.js");
    }
    logApiBlock(`API ✗ ${method} ${shortEndpoint(endpoint)}`, lines);
    throw error;
  }
};

export default ApiService;
