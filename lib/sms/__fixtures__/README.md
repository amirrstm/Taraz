# SMS fixtures

Every real bank SMS the app meets becomes a pair of files here:

- `<name>.txt` — the raw message body, exactly as received.
- `<name>.json` — the expected `parse()` result, or `null` when the message
  is not a transaction.

`fixtures.test.ts` iterates this directory, so adding a pair is the whole
workflow for supporting a new format. Mask account digits before committing.
