import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from '@/lib/sms/parse'

const dir = join(import.meta.dirname, '__fixtures__')
const names = readdirSync(dir)
  .filter((f) => f.endsWith('.txt'))
  .map((f) => f.replace(/\.txt$/, ''))

describe('sms fixtures', () => {
  test('at least one fixture exists', () => {
    expect(names.length).toBeGreaterThan(0)
  })

  for (const name of names) {
    test(name, () => {
      const raw = readFileSync(join(dir, `${name}.txt`), 'utf8')
      const expected = JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'))
      expect(parse(raw)).toEqual(expected)
    })
  }
})
