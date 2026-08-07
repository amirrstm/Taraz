import { normalize } from '@/lib/sms/normalize'

/** Renders integer rial as toman with English digits and thousands separators. */
export function formatToman(rial: number): string {
  return Math.round(rial / 10).toLocaleString('en-US')
}

/**
 * Parses a raw toman-amount input (as typed by the user, possibly with
 * Persian/Arabic-Indic digits and thousands separators) into an integer
 * rial amount. Returns null for anything that isn't a valid positive
 * amount, rather than throwing — mirrors the never-throws contract of
 * normalize()/parse().
 */
export function parseTomanInput(input: string): number | null {
  const normalized = normalize(input).replace(/,/g, '')
  if (normalized === '') return null

  const value = Number(normalized)
  if (!Number.isFinite(value) || !Number.isSafeInteger(value) || value <= 0) return null

  return Math.round(value * 10)
}
