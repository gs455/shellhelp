#!/bin/bash
cd /workspace/shellhelp; pkill -f "node server.js"; pkill -f "cloudflared tunnel --protocol http2 --url http://localhost:8787"
nohup node server.js > server.log 2>&1 &
nohup cloudflared tunnel --protocol http2 --url http://localhost:8787 > tunnel.log 2>&1 &
sleep 15; grep -ao "https://[a-z0-9-]*\.trycloudflare\.com" tunnel.log | head -1; grep -a Registered tunnel.log || echo "TUNNEL NOT CONNECTED (check tunnel.log)"
