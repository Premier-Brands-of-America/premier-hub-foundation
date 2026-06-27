#!/usr/bin/env bash
# ============================================================================
# start-review.sh — one-command local review environment for Premier Hub revamp
# ----------------------------------------------------------------------------
# Starts the Vite dev server DETACHED, bound to all interfaces on port 8080, so
# it survives this script exiting and is reachable over Tailscale. Idempotent:
# re-running restarts cleanly.
#
#   ./start-review.sh
#
# Then open the printed URL and read docs/REVIEW-GUIDE.md.
#
# Required env (public values; real secrets live in supabase/functions/.env):
#   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY   (already in ./.env)
# Optional routing identities (fallbacks used if unset):
#   VITE_ART_LEAD_EMAIL, VITE_MANAGER_JACLYN_EMAIL,
#   VITE_MANAGER_MEGAN_EMAIL, VITE_MANAGER_DAN_EMAIL
#
# Login: at /login (localhost/LAN) pick a MOCK test profile (Standard / Admin /
# Diagnostics) — no real Supabase session. All feature flags are force-enabled
# in preview, so every screen (incl. /planner and /graph) is reachable.
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")"

# Make node/npm available (Homebrew on Apple Silicon).
export PATH="/opt/homebrew/bin:$PATH"

PORT=8080
RUN_DIR=".run"
LOG="$RUN_DIR/server.log"
PIDFILE="$RUN_DIR/server.pid"
mkdir -p "$RUN_DIR"

# Resolve a reachable host (Tailscale MagicDNS if present, else hostname).
TS_NAME="$(/Applications/Tailscale.app/Contents/MacOS/Tailscale status --json 2>/dev/null \
  | /opt/homebrew/bin/node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);process.stdout.write((j.Self&&j.Self.DNSName||'').replace(/\.$/,''))}catch(e){}})" 2>/dev/null || true)"
HOST_NAME="${TS_NAME:-localhost}"
URL="http://${HOST_NAME}:${PORT}"

echo "▶ Premier Hub — review environment"

# Install deps if missing.
if [ ! -d node_modules ]; then
  echo "  • installing dependencies (npm ci)…"
  npm ci || npm install
fi

# Stop any prior dev server on this port (idempotent restart).
if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
  echo "  • stopping existing server on :$PORT"
  lsof -ti tcp:"$PORT" | xargs kill 2>/dev/null || true
  sleep 1
fi

# Start detached, bound to all interfaces, logging to .run/server.log.
echo "  • starting Vite (detached) on 0.0.0.0:$PORT"
nohup npm run dev -- --host 0.0.0.0 --port "$PORT" > "$LOG" 2>&1 &
echo $! > "$PIDFILE"

# Wait briefly for the port to come up.
for _ in $(seq 1 30); do
  if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

echo "$URL" > "$RUN_DIR/REVIEW_URL"
echo ""
echo "  ✅ Review server is up (detached — survives this shell)."
echo "     URL:    $URL"
echo "     Local:  http://localhost:$PORT"
echo "     Guide:  docs/REVIEW-GUIDE.md"
echo "     Logs:   $LOG"
echo "     Stop:   kill \$(cat $PIDFILE)   (or re-run this script to restart)"
