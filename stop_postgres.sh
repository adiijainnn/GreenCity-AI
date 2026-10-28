#!/bin/bash
# Stop GreenCity PostgreSQL server
export PATH="/Library/PostgreSQL/18/bin:$PATH"
PGDATA="$HOME/pgdata_greencity"

pg_ctl -D "$PGDATA" stop
echo "🛑 PostgreSQL stopped"
