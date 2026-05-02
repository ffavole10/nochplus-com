/**
 * Shared display formatters.
 * Use formatCurrency for any UI rendering of dollar amounts.
 * Do NOT use these for input fields, DB storage, or API payloads.
 */

export interface FormatCurrencyOptions {
  /** Reserved for future use. Currently always compact magnitude-based. */
  compact?: boolean;
}

/**
 * Magnitude-based currency abbreviation.
 *   850         -> "$850"
 *   5_000       -> "$5k"
 *   42_500      -> "$42.5k"
 *   750_000     -> "$750k"
 *   1_000_000   -> "$1M"
 *   2_400_000   -> "$2.4M"
 *   119_100_000 -> "$119.1M"
 *   1_500_000_000 -> "$1.5B"
 */
export function formatCurrency(value: number | null | undefined, _options?: FormatCurrencyOptions): string {
  const n = Number(value ?? 0);
  if (!isFinite(n)) return "$0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (abs < 1_000) {
    return `${sign}$${Math.round(abs).toLocaleString()}`;
  }
  if (abs < 1_000_000) {
    const v = abs / 1_000;
    const decimals = abs < 10_000 ? 1 : 0;
    return `${sign}$${stripTrailingZeros(v.toFixed(decimals))}k`;
  }
  if (abs < 1_000_000_000) {
    const v = abs / 1_000_000;
    return `${sign}$${stripTrailingZeros(v.toFixed(1))}M`;
  }
  const v = abs / 1_000_000_000;
  return `${sign}$${stripTrailingZeros(v.toFixed(1))}B`;
}

function stripTrailingZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}
