import { TEHRAN_OFFSET_MS } from '@/lib/sms/jalali'

/**
 * Half-open unix-ms bounds `[startMs, endMs)` for a Gregorian month, aligned
 * to Iran-local (UTC+03:30) midnight rather than UTC midnight.
 *
 * `monthSummary`'s daily breakdown buckets by Iran-local day (it shifts
 * `occurredAt` by `TEHRAN_OFFSET_MS` before extracting the day-of-month).
 * If the window passed to it were naive UTC month boundaries, a
 * transaction in the ~3.5 hour gap between UTC midnight and Tehran
 * midnight would either be bucketed into the wrong month or dropped from
 * the daily strip. Subtracting the offset from naive UTC midnight yields
 * the unix-ms instant that corresponds to Tehran midnight, so the window
 * edges line up with the daily buckets.
 */
export function monthRange(year: number, month1to12: number): { startMs: number; endMs: number } {
  return {
    startMs: Date.UTC(year, month1to12 - 1, 1) - TEHRAN_OFFSET_MS,
    endMs: Date.UTC(year, month1to12, 1) - TEHRAN_OFFSET_MS,
  }
}

/**
 * The Iran-local (year, month) containing `nowMs`. Used to pick a default
 * month for the month screens: reading `getUTCFullYear`/`getUTCMonth`
 * directly off `nowMs` would use UTC's calendar date, which is wrong for
 * the ~3.5 hour window between UTC midnight and Tehran midnight (and, on
 * the 1st, for the whole month until 03:30 Tehran).
 */
export function currentYearMonth(nowMs: number): { year: number; month: number } {
  const tehranNow = new Date(nowMs + TEHRAN_OFFSET_MS)
  return { year: tehranNow.getUTCFullYear(), month: tehranNow.getUTCMonth() + 1 }
}
