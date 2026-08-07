import { parse } from '@/lib/sms/parse'
import {
  hashBody,
  insertNeedsReview,
  insertParsed,
  isDuplicate,
  logSms,
} from '@/lib/db/queries'

export type IngestResult = 'parsed' | 'needs_review' | 'duplicate'

/**
 * The single path from raw SMS text to stored transaction, shared by the
 * webhook and the Paste SMS screen so both behave identically.
 */
export async function ingestSms(
  text: string,
  sender: string | null,
  now: number,
): Promise<IngestResult> {
  const bodyHash = hashBody(text)
  if (await isDuplicate(bodyHash, now)) {
    await logSms({
      rawText: text,
      bodyHash,
      sender,
      receivedAt: now,
      parseOk: false,
      error: 'duplicate',
    })
    return 'duplicate'
  }

  const parsed = parse(text)
  const logId = await logSms({
    rawText: text,
    bodyHash,
    sender,
    receivedAt: now,
    parseOk: parsed !== null,
    error: parsed === null ? 'unparsed' : null,
  })

  if (parsed) {
    await insertParsed(parsed, logId, now)
    return 'parsed'
  }

  await insertNeedsReview(logId, now)
  return 'needs_review'
}
