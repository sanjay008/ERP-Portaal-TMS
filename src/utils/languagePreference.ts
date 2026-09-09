import { getData, storeData } from "@/src/utils/storeData";

export const USER_LANGUAGE_KEY = "userLanguage";
export const LANGUAGE_SELECTED_KEY = "languageSelected";

export function isValidLanguageCode(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const code = value.trim();
  if (!code) return false;
  // Accept short codes like nl, en, ar and optional region like en-US
  return /^[a-z]{2}(-[A-Za-z]{2})?$/i.test(code);
}

export async function getStoredUserLanguage(): Promise<string | null> {
  const value = await getData(USER_LANGUAGE_KEY);
  return isValidLanguageCode(value) ? value.trim() : null;
}

export async function hasCompletedLanguageSelection(): Promise<boolean> {
  const language = await getStoredUserLanguage();
  if (!language) return false;

  const selected = await getData(LANGUAGE_SELECTED_KEY);
  if (selected === true) return true;

  // Legacy installs already had userLanguage before this flag existed.
  // Migrate once so existing users are not forced back to Select.
  if (selected == null) {
    await storeData(LANGUAGE_SELECTED_KEY, true);
    return true;
  }

  return false;
}

export async function persistLanguageSelection(
  languageShortname: string,
): Promise<string> {
  const code = String(languageShortname || "").trim();
  if (!isValidLanguageCode(code)) {
    throw new Error("Invalid language code");
  }
  await storeData(USER_LANGUAGE_KEY, code);
  await storeData(LANGUAGE_SELECTED_KEY, true);
  return code;
}
