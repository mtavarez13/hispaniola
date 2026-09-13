import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Deterministic number formatting across Server (SSR) and Client to prevent React hydration errors.
 * Always specifies the 'en-US' locale explicitly so thousand separators and decimal marks are identical.
 */
export function formatNumber(
  value: number | string | undefined | null,
  options?: Intl.NumberFormatOptions
): string {
  if (value === undefined || value === null || value === "") return "0"
  const num = Number(value)
  if (isNaN(num)) return "0"
  return new Intl.NumberFormat("en-US", options).format(num)
}

/**
 * Format currency with 2 decimals by default in a deterministic way.
 */
export function formatCurrency(
  value: number | string | undefined | null,
  decimals: number = 2
): string {
  return formatNumber(value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
