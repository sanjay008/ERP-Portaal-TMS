import { getData } from "@/src/utils/storeData";

const LOG_TAG = "[GoogleMapsKey]";

function maskKey(key: string): string {
  const value = String(key || "").trim();
  if (!value) return "(empty)";
  if (value.length <= 8) return `${value.slice(0, 2)}…`;
  return `${value.slice(0, 4)}…${value.slice(-4)} (len=${value.length})`;
}

function normalizeKey(value: unknown): string {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw || raw === "null" || raw === "undefined") return "";
  return raw;
}

/**
 * Resolve Maps JS key the same way company login stores it:
 * AsyncStorage `google_maps_api_key` ← default_company.project_google_maps_api_key
 */
export async function resolveGoogleMapsApiKey(
  contextKey?: string | null,
): Promise<{ key: string; source: string }> {
  const fromContext = normalizeKey(contextKey);
  if (fromContext) {
    console.log(LOG_TAG, "using context GOOGLE_API_KEY", maskKey(fromContext));
    return { key: fromContext, source: "context" };
  }

  try {
    const primary = normalizeKey(await getData("google_maps_api_key"));
    if (primary) {
      console.log(LOG_TAG, "using storage google_maps_api_key", maskKey(primary));
      return { key: primary, source: "storage:google_maps_api_key" };
    }
  } catch (error) {
    console.log(LOG_TAG, "failed reading google_maps_api_key", error);
  }

  try {
    const legacy = normalizeKey(await getData("GOOGLE_API_KEY"));
    if (legacy) {
      console.log(LOG_TAG, "using storage GOOGLE_API_KEY", maskKey(legacy));
      return { key: legacy, source: "storage:GOOGLE_API_KEY" };
    }
  } catch (error) {
    console.log(LOG_TAG, "failed reading GOOGLE_API_KEY", error);
  }

  try {
    const company = await getData("COMPANYDATA");
    const fromCompany = normalizeKey(
      company?.default_company?.project_google_maps_api_key,
    );
    if (fromCompany) {
      console.log(
        LOG_TAG,
        "using COMPANYDATA.project_google_maps_api_key",
        maskKey(fromCompany),
      );
      return { key: fromCompany, source: "COMPANYDATA" };
    }
  } catch (error) {
    console.log(LOG_TAG, "failed reading COMPANYDATA maps key", error);
  }

  console.log(
    LOG_TAG,
    "MISSING — checked context, google_maps_api_key, GOOGLE_API_KEY, COMPANYDATA",
  );
  return { key: "", source: "missing" };
}

export function logGoogleMapsIssue(
  reason: string,
  extra?: Record<string, unknown>,
) {
  console.log(LOG_TAG, "ISSUE:", reason, extra || {});
}
