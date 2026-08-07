/** Renders integer rial as toman with English digits and thousands separators. */
export function formatToman(rial: number): string {
  return Math.round(rial / 10).toLocaleString('en-US')
}
