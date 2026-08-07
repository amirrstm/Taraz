import { expect, test } from 'vitest'
import { jalaliToUnixMs } from '@/lib/sms/jalali'

test('converts a known Jalali date and time to unix ms', () => {
  // 1405/05/16 11:38:58 Tehran == 2026-08-07T08:08:58Z
  const ms = jalaliToUnixMs(1405, 5, 16, 11, 38, 58)
  expect(new Date(ms!).toISOString()).toBe('2026-08-07T08:08:58.000Z')
})

test('converts Nowruz correctly', () => {
  // 1404/01/01 00:00:00 Tehran == 2025-03-20T20:30:00Z
  const ms = jalaliToUnixMs(1404, 1, 1, 0, 0, 0)
  expect(new Date(ms!).toISOString()).toBe('2025-03-20T20:30:00.000Z')
})

test('handles a time before the offset, rolling to the previous UTC day', () => {
  const ms = jalaliToUnixMs(1405, 5, 16, 1, 0, 0)
  expect(new Date(ms!).toISOString()).toBe('2026-08-06T21:30:00.000Z')
})

test('rejects an out-of-range month', () => {
  expect(jalaliToUnixMs(1405, 13, 1, 0, 0, 0)).toBeNull()
})

test('rejects an out-of-range day', () => {
  expect(jalaliToUnixMs(1405, 1, 32, 0, 0, 0)).toBeNull()
})

test('rejects an out-of-range hour', () => {
  expect(jalaliToUnixMs(1405, 1, 1, 24, 0, 0)).toBeNull()
})
