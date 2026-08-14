/**
 * Cap on the user-written note. Free text rather than a bounded enum, so it
 * needs a length limit; the server enforces it in `editAction`/`addManualAction`
 * and the inputs mirror it with `maxLength` so the limit is visible while
 * typing rather than only on submit.
 *
 * Lives here rather than in `actions.ts` because a `'use server'` module may
 * only export async functions.
 */
export const MAX_NOTE_LENGTH = 500
