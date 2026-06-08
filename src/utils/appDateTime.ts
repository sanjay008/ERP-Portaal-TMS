export function getDateByTimezone(timeZone?: string): string {
  const tz =
    timeZone?.trim() ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function resolveAppTimeZone(companyTimeZone?: string | null): string {
  return (
    companyTimeZone?.trim() ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC"
  );
}

export function bootstrapAppDateTime(
  companyTimeZone: string | null | undefined,
  setTimeZone: (value: string) => void,
  setSelectActiveDate: (value: string) => void,
  currentActiveDate?: string | null,
): string {
  const timeZone = resolveAppTimeZone(companyTimeZone);
  setTimeZone(timeZone);

  const today = getDateByTimezone(timeZone);
  if (!currentActiveDate) {
    setSelectActiveDate(today);
  }

  return currentActiveDate || today;
}
