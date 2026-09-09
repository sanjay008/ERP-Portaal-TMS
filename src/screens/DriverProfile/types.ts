import { parseSafeDate, toApiDateString } from "@/src/components/DateFormate";

export const SALUTATION_OPTIONS = [
  { id: "fam", label: "fam" },
  { id: "dhr", label: "dhr" },
  { id: "mevr", label: "mevr" },
];

export type DriverProfileForm = {
  aanhef: string;
  voornaam: string;
  achternaam: string;
  street: string;
  house_number: string;
  postcode: string;
  city: string;
  country_id: string | number | null;
  mobile: string;
  mobile_country_code: string;
  email: string;
  username: string;
  profileImageUri: string;
};

export function normalizePhoneCode(code: string | number | null | undefined) {
  const raw = String(code ?? "31").trim();
  if (!raw) return "+31";
  return raw.startsWith("+") ? raw : `+${raw.replace(/^\+/, "")}`;
}

export function userDataToForm(userData: any): DriverProfileForm {
  const relaties = userData?.relaties ?? {};
  const user = userData?.user ?? {};

  return {
    aanhef: String(relaties.aanhef ?? ""),
    voornaam: String(relaties.voornaam ?? ""),
    achternaam: String(relaties.achternaam ?? ""),
    street: String(relaties.street ?? ""),
    house_number: String(relaties.house_number ?? ""),
    postcode: String(relaties.postcode ?? ""),
    city: String(relaties.city ?? ""),
    country_id: relaties.country ?? relaties.country_id ?? null,
    mobile: String(user.whatsapp_number ?? relaties.mobiel ?? ""),
    mobile_country_code: normalizePhoneCode(
      user.country_code ?? relaties.country_code ?? "+31",
    ),
    email: String(user.email ?? relaties.email_adres ?? ""),
    username: String(user.username ?? ""),
    profileImageUri: String(user.profile_image ?? relaties.file_path ?? ""),
  };
}

export function formatBirthDateForApi(value: string) {
  if (!value) return "";
  const parsed = parseSafeDate(value);
  if (parsed) return toApiDateString(parsed);

  const monthNameMatch = String(value)
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (monthNameMatch) {
    const day = Number(monthNameMatch[1]);
    const monthName = monthNameMatch[2].slice(0, 3).toLowerCase();
    const year = Number(monthNameMatch[3]);
    const months = [
      "jan", "feb", "mar", "apr", "may", "jun",
      "jul", "aug", "sep", "oct", "nov", "dec",
    ];
    const monthIndex = months.indexOf(monthName);
    if (monthIndex >= 0) {
      const date = new Date(year, monthIndex, day);
      return toApiDateString(date);
    }
  }

  return "";
}

export function formsAreEqual(
  a: DriverProfileForm,
  b: DriverProfileForm,
) {
  const keys: (keyof DriverProfileForm)[] = [
    "aanhef",
    "voornaam",
    "achternaam",
    "street",
    "house_number",
    "postcode",
    "city",
    "country_id",
    "mobile",
    "mobile_country_code",
    "email",
  ];
  return keys.every(
    (key) => String(a[key] ?? "").trim() === String(b[key] ?? "").trim(),
  );
}

export function mergeUserDataAfterUpdate(
  current: any,
  form: DriverProfileForm,
  responseData: any,
  profileImageUri?: string | null,
) {
  const nextUser = {
    ...(current?.user ?? {}),
    ...(responseData?.user ?? {}),
    username:
      responseData?.user?.username ||
      `${form.voornaam} ${form.achternaam}`.trim() ||
      form.username,
    email: form.email,
    whatsapp_number: form.mobile,
    country_code: normalizePhoneCode(form.mobile_country_code),
    profile_image:
      profileImageUri ||
      responseData?.user?.profile_image ||
      current?.user?.profile_image,
  };

  const nextRelaties = {
    ...(current?.relaties ?? {}),
    ...(responseData?.relaties ?? {}),
    aanhef: form.aanhef,
    voornaam: form.voornaam,
    achternaam: form.achternaam,
    street: form.street,
    house_number: form.house_number,
    postcode: form.postcode,
    city: form.city,
    country: form.country_id,
    country_id: form.country_id,
    mobiel: form.mobile,
    email_adres: form.email,
    display_name:
      `${form.voornaam} ${form.achternaam}`.trim() ||
      current?.relaties?.display_name ||
      nextUser.username,
    file_path:
      profileImageUri ||
      responseData?.relaties?.file_path ||
      current?.relaties?.file_path,
  };

  return {
    ...current,
    user: nextUser,
    relaties: nextRelaties,
  };
}
