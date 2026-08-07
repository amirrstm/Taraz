const PERSIAN_ZERO = 0x06f0
const ARABIC_ZERO = 0x0660

/**
 * Canonicalizes raw SMS text so downstream patterns can assume ASCII digits,
 * Persian letter forms, and single spaces. Never throws.
 */
export function normalize(input: string): string {
  let out = ''
  for (const ch of input) {
    const code = ch.codePointAt(0)!
    if (code >= PERSIAN_ZERO && code <= PERSIAN_ZERO + 9) {
      out += String(code - PERSIAN_ZERO)
    } else if (code >= ARABIC_ZERO && code <= ARABIC_ZERO + 9) {
      out += String(code - ARABIC_ZERO)
    } else if (ch === 'ك') {
      out += 'ک'
    } else if (ch === 'ي' || ch === 'ى') {
      out += 'ی'
    } else {
      out += ch
    }
  }

  // Drop zero-width and bidi control characters.
  out = out.replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')

  // Remove separators only when they sit between digits.
  out = out.replace(/(?<=\d)[,٬](?=\d)/g, '')

  out = out.replace(/\r\n?/g, '\n')
  out = out.replace(/[^\S\n]+/g, ' ')
  out = out.replace(/ *\n */g, '\n')

  return out.trim()
}
