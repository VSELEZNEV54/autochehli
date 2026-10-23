#!/bin/sh
# Ежедневная копия базы SQLite (без остановки сервиса), храним 30 дней.
# cron: 15 3 * * * /opt/avtostil/backend/deploy/backup.sh /opt/avtostil/backend/data/avtostil.db /opt/avtostil/backups
# Копии храните ещё и вне сервера (Яндекс Object Storage, другой сервер): в базе персональные данные клиентов —
# шифруйте копии и не кладите их в общий доступ.
set -eu
DB="${1:?путь к avtostil.db}"
DIR="${2:?папка для копий}"
mkdir -p "$DIR"
OUT="$DIR/avtostil-$(date +%Y%m%d-%H%M).db"
python3 - "$DB" "$OUT" <<'EOF'
import sqlite3, sys
src = sqlite3.connect(sys.argv[1]); dst = sqlite3.connect(sys.argv[2])
with dst:
    src.backup(dst)
dst.close(); src.close()
EOF
gzip "$OUT"
find "$DIR" -name 'avtostil-*.db.gz' -mtime +30 -delete
echo "ok: $OUT.gz"
