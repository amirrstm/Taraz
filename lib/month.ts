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
