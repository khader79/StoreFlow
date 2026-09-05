export type CurrencyCode = "USD" | "EUR" | "GBP" | "AED" | "SAR";

export const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "AED", "SAR"];

export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.6725,
  SAR: 3.75,
};

export function fromUsd(amountUsd: number, currency: CurrencyCode): number {
  return (Number(amountUsd) || 0) * (EXCHANGE_RATES[currency] ?? 1);
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode,
  locale: "en" | "ar" = "en"
): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.round(amount * 100) / 100);
}