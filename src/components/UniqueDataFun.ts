export function UniqueData<T>(array: T[], value: T): T[] {
  return array.includes(value)
    ? array.filter((item) => item !== value)
    : [...array, value];
}
