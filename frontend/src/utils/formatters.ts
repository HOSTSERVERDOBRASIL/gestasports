import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "./locale";

const currencyFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  style: "currency",
  currency: DEFAULT_CURRENCY
});

const dateTimeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});

const dateTimeWithYearFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const dateFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

/** Format integer cents as Brazilian Real currency (e.g. 1234 -> "R$ 12,34"). */
export function formatCurrency(cents: number) {
  return currencyFormatter.format((cents || 0) / 100);
}

/** Format an ISO date string as "dd/mm hh:mm". */
export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

/** Format an ISO date string as "dd/mm/yyyy hh:mm". */
export function formatDateTimeWithYear(value: string) {
  return dateTimeWithYearFormatter.format(new Date(value));
}

/** Format an ISO date string as "dd/mm/yyyy". */
export function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}
