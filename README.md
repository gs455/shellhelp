# ShellHelp

Type a plain-English task ("search my whole PC for files with invoice in the name") and get the command for **PowerShell, cmd, Linux (bash) and macOS (zsh)**, each with a copy button and a one-line explanation. Answers come from a cheap LLM via [OpenRouter](https://openrouter.ai), asked for strict JSON.

## Verified library (hybrid)
`library.json` holds ~230 common tasks (files, search, disk, processes, network, ports, permissions, archives, env vars, users, services, git, system info), each with phrasings and `{cmd,why}` for all four shells. Entries were drafted by `google/gemini-3.1-flash-lite` and reviewed/fixed by `anthropic/claude-sonnet-4.6`; bash commands were spot-tested. `match.js` (and its ESM copy `match.mjs` for Cloudflare) does token-overlap matching before calling OpenRouter. It is conservative: ambiguous matches, or queries with concrete values (numbers, quoted text, `file.ext`) on placeholder entries, go to the AI. Library hits return `_meta.source: "library"` and show `✓ verified library` in the UI; AI answers carry `_meta.source: "ai"`.

## Structure
| Path | Purpose |
|---|---|
| `index.html` | Static UI (dark, compact). POSTs `{"q": "..."}` to `/api/ask`. |
| `functions/api/ask.js` | Cloudflare Pages Function serving `POST /api/ask`. |
| `server.js` | Equivalent Node server (no deps, Node 18+) for local use or Render. Serves `index.html` + `/api/ask`. |
| `start.sh` | Box helper: starts `server.js` + a cloudflared quick tunnel in the background. |

API response: `{"powershell":{"cmd","why"},"cmd":{...},"bash":{...},"zsh_macos":{...}}`, or `{"error": "..."}` with 4xx/5xx.

## Safeguards
- 500-character input cap.
- Per-IP limit: 10/min, 100/day. Global cap: 2,000 requests/day. Constants are at the top of `ask.js` / `server.js`; keep both in sync.
- The OpenRouter key is read only from the environment (`OPENROUTER_API_KEY`) and never sent to the browser. Never commit it.
- **On Cloudflare the limits are best-effort**: they live in Worker isolate memory, which can be recycled or duplicated. For hard limits add a Cloudflare WAF rate-limiting rule on `/api/ask` and/or set a credit limit on the OpenRouter key (recommended).

## Deploy to Cloudflare Pages
1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick this repo.
2. Production branch: `main`. Framework preset: None. Build command: *(empty)*. Build output directory: `/`.
3. Settings → Variables and Secrets → add **Secret** `OPENROUTER_API_KEY` (Production, and Preview if wanted). Optional plain var `MODEL`.
4. Redeploy so the secret takes effect. Pages auto-detects `functions/`.

## Run locally / Render
```
export OPENROUTER_API_KEY=sk-or-...
node server.js        # http://localhost:8787
```
Render: New Web Service → this repo → Build command empty, Start command `node server.js`, env var `OPENROUTER_API_KEY`. The server honors `PORT` (default 8787).

## Switching models
Set env var `MODEL` (Cloudflare var or shell env), or change `DEFAULT_MODEL`/the default in code. Check ids and prices: `curl -s https://openrouter.ai/api/v1/models`. The model must support JSON output. Default `google/gemini-3.1-flash-lite` costs ≈ $0.0004 per query.
