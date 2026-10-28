#!/bin/bash
# Start GreenCity PostgreSQL server
export PATH="/Library/PostgreSQL/18/bin:$PATH"
PGDATA="$HOME/pgdata_greencity"

if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
    echo "✅ PostgreSQL is already running on port 5433"
else
    pg_ctl -D "$PGDATA" -o "-p 5433" -l "$PGDATA/server.log" start
    echo "🚀 PostgreSQL started on port 5433"
fi
