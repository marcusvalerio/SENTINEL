const LOCALE = "pt-BR";
const TIME_ZONE = "America/Sao_Paulo";

type DateInput = Date | string | null | undefined;

function toDate(value: DateInput): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Plain dates ("2026-09-24") are calendar dates: anchor them at noon UTC so
  // they never shift a day when rendered in a local time zone.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: DateInput, style: "short" | "long" | "numeric" = "short") {
  const date = toDate(value);
  if (!date) return "—";
  const options: Intl.DateTimeFormatOptions =
    style === "numeric"
      ? { day: "2-digit", month: "2-digit", year: "numeric" }
      : style === "long"
        ? { day: "numeric", month: "long", year: "numeric" }
        : { day: "2-digit", month: "short", year: "numeric" };
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: TIME_ZONE }).format(date).replace(/\./g, "");
}

export function formatTime(value: DateInput) {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(date);
}

export function formatDateTime(value: DateInput) {
  const date = toDate(value);
  if (!date) return "—";
  return `${formatDate(date)} · ${formatTime(date)}`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function formatRelative(value: DateInput, now: Date = new Date()) {
  const date = toDate(value);
  if (!date) return "—";
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  if (Math.abs(seconds) < 45) return "agora";
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(Math.round(seconds / 60), "minute");
}

/** Day key in the product time zone, used to group chronological entries. */
export function dayKey(value: DateInput) {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

export function formatMoney(cents: number | null | undefined, currency = "BRL") {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency, maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

/**
 * Parses user-typed money ("12.500,90", "R$ 1.200", "1200.5") into integer cents.
 * Returns null for empty input and NaN for invalid input.
 */
export function parseMoneyToCents(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  let value = input.replace(/[^\d,.-]/g, "").trim();
  if (!value) return null;
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  if (lastComma > lastDot) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma !== -1) {
    value = value.replace(/,/g, "");
  } else if (lastDot !== -1 && lastComma === -1) {
    // "1.200" (pt-BR thousands) vs "1200.5" (decimal): three trailing digits means thousands.
    const decimals = value.length - lastDot - 1;
    if (decimals === 3 || value.split(".").length > 2) value = value.replace(/\./g, "");
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return Number.NaN;
  return Math.round(number * 100);
}

export function centsToInput(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "";
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
}
