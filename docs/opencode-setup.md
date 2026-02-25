# OpenCode Web with TLS for Local Network Access

This setup allows you to run OpenCode Web on one machine and access it securely from other devices on the same local network.

## Prerequisites

- Caddy (installed via `brew install caddy`)
- claude-proxy built in `~/Documents/Code/AprovanLabs/claude-proxy`
- OpenCode CLI installed

## Quick Start

### Option 1: Use the shell function (recommended)

Add this to your `.zshrc`:

```zsh
function opencodeweb {
  local CLAUDE_PROXY_PORT=3467
  local OPENCODE_PORT=3466
  local CADDY_PORT=3465
  local LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

  # Cleanup function
  cleanup() {
    echo "\nShutting down..."
    [ -n "$caddy_pid" ] && kill $caddy_pid 2>/dev/null
    [ -n "$opencode_pid" ] && kill $opencode_pid 2>/dev/null
    [ -n "$proxy_pid" ] && kill $proxy_pid 2>/dev/null
  }
  trap cleanup EXIT

  # Start Claude proxy
  node ~/Documents/Code/AprovanLabs/claude-proxy/dist/cli.js serve --port $CLAUDE_PROXY_PORT &
  proxy_pid=$!
  sleep 1

  # Start OpenCode web (bound to localhost only)
  ANTHROPIC_API_KEY=dummy ANTHROPIC_BASE_URL=http://127.0.0.1:$CLAUDE_PROXY_PORT opencode web --hostname 127.0.0.1 --port $OPENCODE_PORT &
  opencode_pid=$!
  sleep 2

  echo ""
  echo "============================================"
  echo "OpenCode Web available at:"
  echo "  Local:   https://localhost:$CADDY_PORT"
  echo "  Network: https://$LOCAL_IP:$CADDY_PORT"
  echo "============================================"
  echo ""

  # Start Caddy with internal (self-signed) TLS certs
  caddy reverse-proxy --from :$CADDY_PORT --to :$OPENCODE_PORT --internal-certs
}
```

### Option 2: Use the standalone script

```bash
~/Documents/Code/AprovanLabs/core/scripts/opencode-web.sh
```

## Accessing from Other Devices

1. Find your Mac's IP address (shown when the script starts, or run `ipconfig getifaddr en0`)
2. On the other device, open: `https://<your-mac-ip>:3465`
3. Accept the self-signed certificate warning:
   - **Chrome**: Click "Advanced" → "Proceed to ... (unsafe)"
   - **Safari**: Click "Show Details" → "visit this website"
   - **Firefox**: Click "Advanced" → "Accept the Risk and Continue"

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Mac                              │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ Claude Proxy │◄───│ OpenCode Web │◄───│ Caddy (TLS)   │◄─┼── Other devices
│  │   :3467      │    │    :3466     │    │    :3465      │  │   (HTTPS)
│  └──────────────┘    └──────────────┘    └───────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

- **Claude Proxy** (port 3467): Proxies requests to Anthropic API
- **OpenCode Web** (port 3466): The web UI, bound to localhost only
- **Caddy** (port 3465): TLS termination, accepts external connections

## Security Notes

- OpenCode binds to `127.0.0.1` only (not directly accessible from network)
- Caddy handles TLS with self-signed certificates
- Only port 3465 is exposed to the network
- For a private local network, self-signed certs are sufficient

## Trusting the Certificate (Optional)

To avoid browser warnings, you can install the Caddy CA certificate:

```bash
# Export Caddy's root CA
caddy trust
```

This adds Caddy's CA to your system keychain. Other devices on the network would need to manually trust this CA as well.

## Troubleshooting

### Port already in use

```bash
# Find and kill processes on the ports
lsof -ti:3465 | xargs kill -9
lsof -ti:3466 | xargs kill -9
lsof -ti:3467 | xargs kill -9
```

### Connection refused from other device

1. Check your Mac's firewall settings (System Preferences → Security & Privacy → Firewall)
2. Ensure both devices are on the same network
3. Verify the IP address is correct
