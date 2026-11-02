import { getData, storeData } from "@/src/utils/storeData";

export const USER_LANGUAGE_KEY = "userLanguage";
export const LANGUAGE_SELECTED_KEY = "languageSelected";
export const DEFAULT_LANGUAGE = "nl";

export function isValidLanguageCode(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const code = value.trim();
  if (!code) return false;
  return /^[a-z]{2}(-[A-Za-z]{2})?$/i.test(code);
}

function normalizeLanguageCode(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const code = value.trim().replace(/^"+|"+$/g, "");
    return isValidLanguageCode(code) ? code.toLowerCase() : null;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return (
      normalizeLanguageCode(obj.language_shortname) ||
      normalizeLanguageCode(obj.shortname) ||
      normalizeLanguageCode(obj.code) ||
      normalizeLanguageCode(obj.language)
    );
  }
  return null;
}

export async function getStoredUserLanguage(): Promise<string | null> {
  try {
    const value = await getData(USER_LANGUAGE_KEY);
    return normalizeLanguageCode(value);
  } catch {
    return null;
  }
}

export async function hasCompletedLanguageSelection(): Promise<boolean> {
  try {
    const language = await getStoredUserLanguage();
    if (language) {
      try {
        const selected = await getData(LANGUAGE_SELECTED_KEY);
        if (selected !== true) {
          await storeData(LANGUAGE_SELECTED_KEY, true);
        }
      } catch {}
      return true;
    }

    const selected = await getData(LANGUAGE_SELECTED_KEY);
    if (selected === true) {
      try {
        await storeData(USER_LANGUAGE_KEY, DEFAULT_LANGUAGE);
      } catch {}
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function persistLanguageSelection(
  languageShortname: string,
): Promise<string> {
  const code = normalizeLanguageCode(languageShortname);
  if (!code) {
    throw new Error("Invalid language code");
  }
  await storeData(USER_LANGUAGE_KEY, code);
  await storeData(LANGUAGE_SELECTED_KEY, true);
  return code;
}

export async function ensureLanguageReady(): Promise<string> {
  try {
    const existing = await getStoredUserLanguage();
    if (existing) {
      try {
        await storeData(LANGUAGE_SELECTED_KEY, true);
      } catch {}
      return existing;
    }

    const selected = await getData(LANGUAGE_SELECTED_KEY);
    if (selected === true) {
      try {
        await storeData(USER_LANGUAGE_KEY, DEFAULT_LANGUAGE);
      } catch {}
      return DEFAULT_LANGUAGE;
    }

    return "";
  } catch {
    return "";
  }
}
