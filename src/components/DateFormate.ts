const MIN_YEAR = 1970;
const MAX_YEAR = 2100;

export function parseSafeDate(input: unknown): Date | null {
  if (input == null || input === '') return null;

  if (input instanceof Date) {
    return isValidDate(input) ? input : null;
  }

  if (typeof input === 'number') {
    const ms = input > 1e12 ? input : input > 1e9 ? input * 1000 : input;
    const date = new Date(ms);
    return isValidDate(date) ? date : null;
  }

  const value = String(input).trim();
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const date = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
    );
    return isValidDate(date) ? date : null;
  }

  const dmyMatch = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return isValidDate(date) ? date : null;
  }

  const parsed = new Date(value);
  return isValidDate(parsed) ? parsed : null;
}

function isValidDate(date: Date): boolean {
  const time = date.getTime();
  if (!Number.isFinite(time)) return false;
  const year = date.getFullYear();
  return year >= MIN_YEAR && year <= MAX_YEAR;
}

const LOCALES: Record<string, string> = {
  en: 'en-US',
  nl: 'nl-NL',
  ar: 'ar',
};

export const formatDateWithWeekday = (
  input: unknown,
  lang: string = 'en',
): { weekday: string; date: string } => {
  const parsed = parseSafeDate(input);
  if (!parsed) {
    const raw = input == null ? '' : String(input).trim();
    return { weekday: '', date: raw };
  }

  try {
    const locale = LOCALES[lang] ?? (lang?.trim() ? lang : 'en-US');
    return {
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(parsed),
      date: new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(parsed),
    };
  } catch {
    return { weekday: '', date: String(input ?? '') };
  }
};

export const formatDate = (dateInput: unknown, lang: string = 'en'): string => {
  const parsed = parseSafeDate(dateInput);
  if (!parsed) {
    return dateInput == null ? '' : String(dateInput);
  }

  try {
    const safeLang = lang?.trim() || 'en';
    const day = parsed.getDate().toString().padStart(2, '0');
    const month = parsed.toLocaleString(safeLang, { month: 'short' });
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateInput == null ? '' : String(dateInput);
  }
};

export function toApiDateString(dateInput: unknown): string {
  const parsed = parseSafeDate(dateInput);
  if (!parsed) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
