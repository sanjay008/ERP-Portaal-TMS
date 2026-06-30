import { toApiDateString } from './DateFormate';

export function ApiFormatDate(dateInput: any): string {
  return toApiDateString(dateInput);
}
