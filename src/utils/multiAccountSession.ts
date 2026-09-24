import { resetChauffeurLocationSession } from "@/src/hooks/useChauffeurLocation";
import {
  ACTIVE_SHIFT_KEY,
  TRACKING_REGION_KEY,
} from "@/src/utils/shiftSession";
import {
  getData,
  removeMultipleData,
  storeData,
} from "@/src/utils/storeData";

export const SAVED_ACCOUNTS_KEY = "SAVED_ACCOUNTS";
export const ACTIVE_ACCOUNT_ID_KEY = "ACTIVE_ACCOUNT_ID";

export type SavedAccountSession = {
  USERDATA: any;
  AUTH: boolean;
  LOGIN?: boolean;
  COMPANYLOGIN: string;
  COMPANYDATA: any;
  COMPANYLOGO: string | null;
  google_maps_api_key: string | null;
  GOOGLE_API_KEY: string | null;
};

export type SavedAccount = {
  id: string;
  companyLogin: string;
  displayName: string;
  identifier: string;
  profileImage?: string | null;
  session: SavedAccountSession;
  updatedAt: number;
};

const SWITCH_CLEAR_KEYS = [ACTIVE_SHIFT_KEY, TRACKING_REGION_KEY];

export function buildAccountId(
  companyLogin: string,
  userId: string | number | undefined | null,
): string {
  return `${String(companyLogin || "").trim().toLowerCase()}::${userId ?? "unknown"}`;
}

export function getDisplayNameFromUserData(userData: any): string {
  const data = userData?.data ?? userData;
  const username = data?.user?.username;
  const display = data?.relaties?.display_name;
  if (username && String(username).length > 0) return String(username);
  if (display && String(display).length > 0) return String(display);
  return "Account";
}

export function getIdentifierFromUserData(userData: any): string {
  const data = userData?.data ?? userData;
  const email = data?.user?.email;
  const phone = data?.user?.whatsapp_number;
  if (email) return String(email);
  if (phone) {
    const code = data?.user?.country_code || data?.user?.whatsapp_country_code;
    return code ? `+${code} ${phone}` : String(phone);
  }
  return "";
}

export function getProfileImageFromUserData(userData: any): string | null {
  const data = userData?.data ?? userData;
  return data?.user?.profile_image || null;
}

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  const list = await getData(SAVED_ACCOUNTS_KEY);
  return Array.isArray(list) ? list : [];
}

export async function getActiveAccountId(): Promise<string | null> {
  const id = await getData(ACTIVE_ACCOUNT_ID_KEY);
  return id ? String(id) : null;
}

export async function saveAccountsList(accounts: SavedAccount[]): Promise<void> {
  await storeData(SAVED_ACCOUNTS_KEY, accounts);
}

export async function setActiveAccountId(id: string): Promise<void> {
  await storeData(ACTIVE_ACCOUNT_ID_KEY, id);
}

export async function readLiveSession(): Promise<SavedAccountSession | null> {
  const [
    USERDATA,
    AUTH,
    LOGIN,
    COMPANYLOGIN,
    COMPANYDATA,
    COMPANYLOGO,
    google_maps_api_key,
    GOOGLE_API_KEY,
  ] = await Promise.all([
    getData("USERDATA"),
    getData("AUTH"),
    getData("LOGIN"),
    getData("COMPANYLOGIN"),
    getData("COMPANYDATA"),
    getData("COMPANYLOGO"),
    getData("google_maps_api_key"),
    getData("GOOGLE_API_KEY"),
  ]);

  if (!USERDATA || !COMPANYLOGIN || !AUTH) {
    return null;
  }

  return {
    USERDATA,
    AUTH: Boolean(AUTH),
    LOGIN: LOGIN != null ? Boolean(LOGIN) : undefined,
    COMPANYLOGIN: String(COMPANYLOGIN),
    COMPANYDATA: COMPANYDATA ?? null,
    COMPANYLOGO: COMPANYLOGO ?? null,
    google_maps_api_key: google_maps_api_key ?? null,
    GOOGLE_API_KEY: GOOGLE_API_KEY ?? null,
  };
}

export function accountFromSession(
  session: SavedAccountSession,
): SavedAccount | null {
  const userData = session.USERDATA;
  const data = userData?.data ?? userData;
  const userId = data?.user?.id;
  const companyLogin = session.COMPANYLOGIN;
  if (!companyLogin || userId == null) return null;

  return {
    id: buildAccountId(companyLogin, userId),
    companyLogin,
    displayName: getDisplayNameFromUserData(userData),
    identifier: getIdentifierFromUserData(userData),
    profileImage: getProfileImageFromUserData(userData),
    session,
    updatedAt: Date.now(),
  };
}

export async function upsertSavedAccount(
  account: SavedAccount,
): Promise<SavedAccount[]> {
  const list = await getSavedAccounts();
  const index = list.findIndex((item) => item.id === account.id);
  const next = [...list];
  if (index >= 0) {
    next[index] = { ...next[index], ...account, updatedAt: Date.now() };
  } else {
    next.unshift({ ...account, updatedAt: Date.now() });
  }
  await saveAccountsList(next);
  await setActiveAccountId(account.id);
  return next;
}

/** Keep current logged-in session in the saved list (and mark active). */
export async function ensureCurrentAccountSaved(): Promise<{
  accounts: SavedAccount[];
  activeId: string | null;
}> {
  const session = await readLiveSession();
  if (!session) {
    const accounts = await getSavedAccounts();
    const activeId = await getActiveAccountId();
    return { accounts, activeId };
  }

  const account = accountFromSession(session);
  if (!account) {
    const accounts = await getSavedAccounts();
    const activeId = await getActiveAccountId();
    return { accounts, activeId };
  }

  const accounts = await upsertSavedAccount(account);
  return { accounts, activeId: account.id };
}

export async function applyAccountSession(
  account: SavedAccount,
): Promise<void> {
  const { session } = account;

  await storeData("USERDATA", session.USERDATA);
  await storeData("AUTH", true);
  if (session.LOGIN != null) {
    await storeData("LOGIN", session.LOGIN);
  } else {
    await storeData("LOGIN", true);
  }
  await storeData("COMPANYLOGIN", session.COMPANYLOGIN);
  await storeData("COMPANYDATA", session.COMPANYDATA);
  await storeData("COMPANYLOGO", session.COMPANYLOGO);
  await storeData("google_maps_api_key", session.google_maps_api_key);
  await storeData("GOOGLE_API_KEY", session.GOOGLE_API_KEY);
  await setActiveAccountId(account.id);

  await removeMultipleData(SWITCH_CLEAR_KEYS);
  try {
    await resetChauffeurLocationSession();
  } catch {
    // ignore GPS reset failures during switch
  }
}

export async function buildSessionFromLoginPayload(params: {
  userData: any;
  companyLogin: string;
  companyData: any;
  companyLogo: string | null;
  googleKey: string | null;
}): Promise<SavedAccountSession> {
  return {
    USERDATA: params.userData,
    AUTH: true,
    LOGIN: true,
    COMPANYLOGIN: params.companyLogin,
    COMPANYDATA: params.companyData,
    COMPANYLOGO: params.companyLogo,
    google_maps_api_key: params.googleKey,
    GOOGLE_API_KEY: params.googleKey,
  };
}
