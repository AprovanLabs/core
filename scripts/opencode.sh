#!/bin/bash
# OpenCode Web with TLS via Caddy reverse proxy
# Allows secure access from other devices on the local network

set -e

CLAUDE_PROXY_PORT=3467
OPENCODE_PORT=3466
CADDY_PORT=3465

# Get local IP for display
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

cleanup() {
    echo ""
    echo "Shutting down..."
    [ -n "$CADDY_PID" ] && kill $CADDY_PID 2>/dev/null
    [ -n "$OPENCODE_PID" ] && kill $OPENCODE_PID 2>/dev/null
    [ -n "$PROXY_PID" ] && kill $PROXY_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting OpenCode Web with TLS..."
echo ""

# Start Claude proxy
echo "Starting Claude proxy on port $CLAUDE_PROXY_PORT..."
node ~/Documents/Code/AprovanLabs/claude-proxy/dist/cli.js serve --port $CLAUDE_PROXY_PORT &
PROXY_PID=$!
sleep 1

# Start OpenCode web
echo "Starting OpenCode web on port $OPENCODE_PORT..."
ANTHROPIC_API_KEY=dummy ANTHROPIC_BASE_URL=http://127.0.0.1:$CLAUDE_PROXY_PORT opencode web --hostname 127.0.0.1 --port $OPENCODE_PORT &
OPENCODE_PID=$!
sleep 2

# Start Caddy reverse proxy with TLS
echo "Starting Caddy TLS proxy on port $CADDY_PORT..."
echo ""
echo "============================================"
echo "OpenCode Web is now available at:"
echo ""
echo "  Local:   https://localhost:$CADDY_PORT"
echo "  Network: https://$LOCAL_IP:$CADDY_PORT"
echo ""
echo "Note: Your browser will show a certificate"
echo "warning for the self-signed cert. This is"
echo "expected - click 'Advanced' and proceed."
echo "============================================"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

caddy reverse-proxy --from :$CADDY_PORT --to :$OPENCODE_PORT --internal-certs &
CADDY_PID=$!

# Wait for any process to exit
wait
