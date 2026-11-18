import type { CurrencyCode } from "./types";

// Units per 1 USD. Prototype uses a static snapshot; production swaps in a live FX feed
// (e.g. a cron job writing to an `fx_rates` table) behind the same function.
export const FX: Record<CurrencyCode, { rate: number; symbol: string; name: string; flag: string; decimals: number }> = {
  USD: { rate: 1, symbol: "$", name: "US Dollar", flag: "🇺🇸", decimals: 2 },
  EUR: { rate: 0.92, symbol: "€", name: "Euro", flag: "🇪🇺", decimals: 2 },
  GBP: { rate: 0.78, symbol: "£", name: "British Pound", flag: "🇬🇧", decimals: 2 },
  JPY: { rate: 151.2, symbol: "¥", name: "Japanese Yen", flag: "🇯🇵", decimals: 0 },
  AUD: { rate: 1.52, symbol: "A$", name: "Australian Dollar", flag: "🇦🇺", decimals: 2 },
  CAD: { rate: 1.37, symbol: "C$", name: "Canadian Dollar", flag: "🇨🇦", decimals: 2 },
  CHF: { rate: 0.88, symbol: "Fr", name: "Swiss Franc", flag: "🇨🇭", decimals: 2 },
  CNY: { rate: 7.18, symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳", decimals: 2 },
  INR: { rate: 83.4, symbol: "₹", name: "Indian Rupee", flag: "🇮🇳", decimals: 0 },
  PHP: { rate: 56.3, symbol: "₱", name: "Philippine Peso", flag: "🇵🇭", decimals: 2 },
  SGD: { rate: 1.34, symbol: "S$", name: "Singapore Dollar", flag: "🇸🇬", decimals: 2 },
  KRW: { rate: 1365, symbol: "₩", name: "South Korean Won", flag: "🇰🇷", decimals: 0 },
  AED: { rate: 3.67, symbol: "د.إ", name: "UAE Dirham", flag: "🇦🇪", decimals: 2 },
  BRL: { rate: 5.05, symbol: "R$", name: "Brazilian Real", flag: "🇧🇷", decimals: 2 },
};

export function convert(usd: number, to: CurrencyCode) {
  return usd * FX[to].rate;
}

export function formatMoney(usd: number, ccy: CurrencyCode, opts: { sign?: boolean; compact?: boolean } = {}) {
  const v = convert(usd, ccy);
  const { symbol, decimals } = FX[ccy];
  const abs = Math.abs(v);
  let body: string;
  if (opts.compact && abs >= 10000) {
    body = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(abs);
  } else {
    body = abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  const sign = v < 0 ? "-" : opts.sign && v > 0 ? "+" : "";
  return `${sign}${symbol}${body}`;
}
