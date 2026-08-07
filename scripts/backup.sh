#!/usr/bin/env sh
# scripts/backup.sh — run from cron on a machine you control, not on Vercel.
# Requires the turso CLI, already authenticated.
set -eu

DEST="${BACKUP_DIR:-$HOME/backups/taraz}"
mkdir -p "$DEST"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

turso db shell taraz .dump > "$DEST/taraz-$STAMP.sql"

# Keep the 14 most recent snapshots. Read filenames line-by-line instead of
# piping through xargs, which word-splits on whitespace and silently drops
# entries when $DEST contains a space.
ls -1t "$DEST"/taraz-*.sql | tail -n +15 | while IFS= read -r f; do rm -f -- "$f"; done
echo "backup written: $DEST/taraz-$STAMP.sql"
