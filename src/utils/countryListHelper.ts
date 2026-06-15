import {
  FALLBACK_COUNTRIES,
  SORTCODE_TO_CCA2,
} from './countryFallbackData';

export type ApiCountry = {
  id: number;
  name: string;
  sortcode: string;
  favorite: number;
};

export type MergedCountry = {
  apiId: number | null;
  name: string;
  favorite: number;
  sortcode: string;
  countrycode: string;
  cca2: string;
  flag: string;
  countryname: string;
};

const DEFAULT_FAVORITE_CCA2 = new Set(['NL', 'IN', 'SR']);

export const countryCodeToFlag = (cc?: string | null) => {
  if (!cc || cc.length !== 2) return '🏳️';
  return cc
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('');
};

const resolveCca2 = (sortcode?: string | null): string | null => {
  if (!sortcode) return null;
  const upper = sortcode.toUpperCase();
  if (SORTCODE_TO_CCA2[upper as keyof typeof SORTCODE_TO_CCA2]) {
    return SORTCODE_TO_CCA2[upper as keyof typeof SORTCODE_TO_CCA2];
  }
  if (upper.length === 2) return upper;
  return null;
};

const fallbackByCca2 = () => {
  const map = new Map<string, (typeof FALLBACK_COUNTRIES)[number]>();
  FALLBACK_COUNTRIES.forEach((item) => {
    map.set(item.cca2.toUpperCase(), item);
  });
  return map;
};

export const hasCallingCode = (country: MergedCountry) =>
  Boolean(String(country.countrycode ?? '').trim());

export const filterCountriesWithCallingCode = (list: MergedCountry[]) =>
  list.filter(hasCallingCode);

export const buildFallbackOnlyList = (): MergedCountry[] => {
  const map = fallbackByCca2();
  return FALLBACK_COUNTRIES.map((item) => ({
    apiId: null,
    name: item.countryname,
    favorite: DEFAULT_FAVORITE_CCA2.has(item.cca2) ? 1 : 0,
    sortcode: item.cca2,
    countrycode: item.countrycode,
    cca2: item.cca2,
    flag: item.flag,
    countryname: item.countryname,
  })).sort((a, b) => {
    if (b.favorite !== a.favorite) return b.favorite - a.favorite;
    return a.name.localeCompare(b.name);
  });
};

export const mergeCountryLists = (apiList: ApiCountry[]): MergedCountry[] => {
  if (!apiList?.length) return buildFallbackOnlyList();

  const map = fallbackByCca2();

  const merged = apiList.map((api) => {
    const cca2 = resolveCca2(api.sortcode);
    const fallback = cca2 ? map.get(cca2) : undefined;
    const nameFallback = !fallback
      ? FALLBACK_COUNTRIES.find(
          (c) => c.countryname.toLowerCase() === api.name.toLowerCase(),
        )
      : undefined;
    const fb = fallback ?? nameFallback;

    return {
      apiId: api.id,
      name: api.name,
      favorite: Number(api.favorite) === 1 ? 1 : 0,
      sortcode: api.sortcode,
      countrycode: fb?.countrycode ?? '',
      cca2: fb?.cca2 ?? cca2 ?? api.sortcode,
      flag: fb?.flag ?? countryCodeToFlag(cca2),
      countryname: fb?.countryname ?? api.name,
    };
  });

  return filterCountriesWithCallingCode(merged).sort((a, b) => {
    if (b.favorite !== a.favorite) return b.favorite - a.favorite;
    return a.name.localeCompare(b.name);
  });
};

export const getPhoneLengthRules = (countrycode: string) => {
  switch (String(countrycode)) {
    case '31':
      return { min: 8, max: 10 };
    case '597':
      return { min: 7, max: 7 };
    case '91':
      return { min: 10, max: 10 };
    default:
      return { min: 1, max: 15 };
  }
};

export const normalizePhoneForCountry = (
  countrycode: string,
  phone: string,
) => {
  const digits = phone.replace(/\D/g, '');
  const { max } = getPhoneLengthRules(countrycode);
  return digits.slice(0, max);
};

export const filterCountriesByQuery = (
  list: MergedCountry[],
  query: string,
): MergedCountry[] => {
  const trimmed = query.trim();
  if (!trimmed) return list;

  const q = trimmed.toLowerCase();
  const codeQuery = trimmed.replace(/^\+/, '').replace(/\D/g, '');

  return list.filter((c) => {
    const name = c.name?.toLowerCase() ?? '';
    const countryname = c.countryname?.toLowerCase() ?? '';
    const cca2 = c.cca2?.toLowerCase() ?? '';
    const sortcode = c.sortcode?.toLowerCase() ?? '';
    const code = String(c.countrycode ?? '');

    if (name.includes(q) || countryname.includes(q)) return true;
    if (cca2.includes(q) || sortcode.includes(q)) return true;
    if (codeQuery && code.includes(codeQuery)) return true;
    return false;
  });
};

export const isPhoneLengthValid = (countrycode: string, phone: string) => {
  const digits = phone.replace(/\D/g, '');
  const { min, max } = getPhoneLengthRules(countrycode);
  return digits.length >= min && digits.length <= max;
};

export const findCountryByCode = (
  list: MergedCountry[],
  countrycode?: string | null,
) =>
  list.find((c) => String(c.countrycode) === String(countrycode)) ??
  list.find((c) => c.countrycode === '31') ??
  list[0];
