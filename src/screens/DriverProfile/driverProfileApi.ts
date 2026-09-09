import apiConstants from "@/src/api/apiConstants";
import ApiService from "@/src/utils/Apiservice";
import {
  formatBirthDateForApi,
  normalizePhoneCode,
  type DriverProfileForm,
} from "./types";

type PendingProfileImage = {
  uri: string;
  name?: string;
  type?: string;
};

export function isApiSuccess(res: any) {
  return Boolean(res?.status) && (res?.status_code == null || Number(res.status_code) === 200);
}

export function buildUpdateProfilePayload(
  form: DriverProfileForm,
  userData: any,
  companyLogin: string,
  pendingImage?: PendingProfileImage | null,
) {
  const user = userData?.user ?? {};
  const relaties = userData?.relaties ?? {};

  const payload: Record<string, any> = {
    company_login: companyLogin,
    user_id: user.id,
    token: user.verify_token,
    username:
      `${form.voornaam} ${form.achternaam}`.trim() ||
      form.username ||
      user.username,
    email: form.email.trim(),
    password: "",
    whatsapp_number: String(form.mobile || "").trim(),
    country_code: normalizePhoneCode(form.mobile_country_code),
    birth_date: formatBirthDateForApi(relaties.birth_date),
    birth_place: relaties.birth_place || "",
    iban: relaties.iban || "",
    bsn_nr: relaties.bsn_nr || "",
    voertuig_kentekencheck: relaties.voertuig_kentekencheck || "",
    website: relaties.website || "",
    aanhef: form.aanhef,
    voornaam: form.voornaam.trim(),
    achternaam: form.achternaam.trim(),
    street: form.street.trim(),
    house_number: form.house_number.trim(),
    postcode: form.postcode.trim(),
    city: form.city.trim(),
    country: form.country_id,
    country_id: form.country_id,
    email_adres: form.email.trim(),
    mobiel: String(form.mobile || "").trim(),
  };

  if (pendingImage?.uri) {
    payload.profile_image = {
      uri: pendingImage.uri,
      name: pendingImage.name || "profile.jpg",
      type: pendingImage.type || "image/jpeg",
    };
  }

  return payload;
}

export async function updateDriverProfile(
  form: DriverProfileForm,
  userData: any,
  companyLogin: string,
  pendingImage?: PendingProfileImage | null,
) {
  return ApiService(apiConstants.updateProfile, {
    customData: buildUpdateProfilePayload(
      form,
      userData,
      companyLogin,
      pendingImage,
    ),
  });
}
