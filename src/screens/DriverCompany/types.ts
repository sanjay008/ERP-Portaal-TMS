export type DriverCompanyScreenMode = "add" | "view_edit";

export type DriverCompanyRecord = {
  id?: number | string;
  company_name?: string | null;
  street?: string | null;
  house_number?: string | null;
  postcode?: string | null;
  city?: string | null;
  country_id?: number | string | null;
  mobile?: string | null;
  mobile_country_code?: string | null;
  website?: string | null;
  email?: string | null;
  invoice_email?: string | null;
  contact_phone?: string | null;
  contact_phone_country_code?: string | null;
  kvk_nr?: string | null;
  btw_nr?: string | null;
  iban?: string | null;
  bic?: string | null;
  bank_id?: number | string | null;
  logo_url?: string | null;
  connection_type_id?: number | string | null;
  department_id?: number | string | null;
  [key: string]: any;
};

export type DriverCompanyFormLists = {
  countries?: any[];
  banks?: any[];
  connection_types?: any[];
  departments?: any[];
  currencies?: any[];
};

export type DriverCompanyGetData = {
  screen?: DriverCompanyScreenMode;
  can_add?: boolean;
  company?: DriverCompanyRecord | null;
  defaults?: {
    connection_type_id?: number | string;
    department_id?: number | string;
    [key: string]: any;
  };
  form?: DriverCompanyFormLists & {
    sections?: any[];
  };
};

export const VISIBLE_FIELD_KEYS = [
  "company_name",
  "street",
  "house_number",
  "postcode",
  "city",
  "country_id",
  "mobile",
  "website",
  "email",
  "invoice_email",
  "kvk_nr",
  "btw_nr",
  "iban",
  "bic",
  "bank_id",
] as const;

export function emptyFormValues(
  defaults?: DriverCompanyGetData["defaults"],
): Record<string, any> {
  return {
    company_name: "",
    street: "",
    house_number: "",
    postcode: "",
    city: "",
    country_id: null,
    mobile: "",
    mobile_country_code: "+31",
    website: "",
    email: "",
    invoice_email: "",
    contact_phone: "",
    contact_phone_country_code: "+31",
    kvk_nr: "",
    btw_nr: "",
    iban: "",
    bic: "",
    bank_id: null,
    connection_type_id: defaults?.connection_type_id ?? null,
    department_id: defaults?.department_id ?? null,
  };
}

export function companyToFormValues(
  company?: DriverCompanyRecord | null,
  defaults?: DriverCompanyGetData["defaults"],
): Record<string, any> {
  const base = emptyFormValues(defaults);
  if (!company) return base;
  return {
    ...base,
    company_name: company.company_name ?? "",
    street: company.street ?? "",
    house_number: company.house_number ?? "",
    postcode: company.postcode ?? "",
    city: company.city ?? "",
    country_id: company.country_id ?? null,
    mobile: company.mobile ?? "",
    mobile_country_code: normalizePhoneCode(
      company.mobile_country_code || "+31",
    ),
    website: company.website ?? "",
    email: company.email ?? "",
    invoice_email: company.invoice_email ?? "",
    contact_phone: company.contact_phone ?? company.mobile ?? "",
    contact_phone_country_code: normalizePhoneCode(
      company.contact_phone_country_code ||
        company.mobile_country_code ||
        "+31",
    ),
    kvk_nr: company.kvk_nr ?? "",
    btw_nr: company.btw_nr ?? "",
    iban: company.iban ?? "",
    bic: company.bic ?? "",
    bank_id: company.bank_id ?? null,
    connection_type_id:
      company.connection_type_id ?? defaults?.connection_type_id ?? null,
    department_id: company.department_id ?? defaults?.department_id ?? null,
  };
}

export function normalizePhoneCode(code: string | number | null | undefined) {
  const raw = String(code ?? "31").trim();
  if (!raw) return "+31";
  return raw.startsWith("+") ? raw : `+${raw.replace(/^\+/, "")}`;
}

export function listLabel(item: any): string {
  return (
    item?.name ||
    item?.label ||
    item?.title ||
    item?.bank_name ||
    item?.country_name ||
    item?.display_name ||
    String(item?.id ?? "")
  );
}

export function listId(item: any): string | number | null {
  if (item == null) return null;
  if (typeof item === "object") {
    return item.id ?? item.value ?? item.country_id ?? item.bank_id ?? null;
  }
  return item;
}
