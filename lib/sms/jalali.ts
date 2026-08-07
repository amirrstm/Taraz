import { toGregorian } from 'jalaali-js'

/** Iran standard time. No daylight saving since 2022. */
const TEHRAN_OFFSET_MS = (3 * 60 + 30) * 60 * 1000

/**
 * Converts a Jalali calendar date and Tehran wall-clock time to unix
 * milliseconds. Returns null when any component is out of range.
 */
export function jalaliToUnixMs(
  jy: number,
  jm: number,
  jd: number,
  hh: number,
  mm: number,
  ss: number,
): number | null {
  if (!Number.isInteger(jy) || jy < 1300 || jy > 1500) return null
  if (!Number.isInteger(jm) || jm < 1 || jm > 12) return null
  if (!Number.isInteger(jd) || jd < 1 || jd > 31) return null
  if (!Number.isInteger(hh) || hh < 0 || hh > 23) return null
  if (!Number.isInteger(mm) || mm < 0 || mm > 59) return null
  if (!Number.isInteger(ss) || ss < 0 || ss > 59) return null

  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  const utc = Date.UTC(gy, gm - 1, gd, hh, mm, ss)
  return utc - TEHRAN_OFFSET_MS
}
