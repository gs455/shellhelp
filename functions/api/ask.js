// Cloudflare Pages Function: POST /api/ask
// Secret: OPENROUTER_API_KEY. Optional vars: MODEL.
// Rate limits are BEST-EFFORT: kept in isolate memory, which Cloudflare may recycle
// or run in many copies. For hard limits add a Cloudflare WAF rate-limit rule or KV/Durable Object.
const MAXLEN = 500, PER_MIN = 10, PER_DAY = 100, GLOBAL_DAY = 2000;
const DEFAULT_MODEL = 'google/gemini-3.1-flash-lite';
let day = '', global = 0; const ips = new Map();
function limit(ip) {
  const d = new Date().toDateString(); if (d !== day) { day = d; global = 0; ips.clear(); }
  if (global >= GLOBAL_DAY) return 'Daily site limit reached, try tomorrow.';
  const now = Date.now(), r = ips.get(ip) || { m: [], d: 0 }; r.m = r.m.filter(t => now - t < 60000);
  if (r.m.length >= PER_MIN) return 'Too many requests, wait a minute.';
  if (r.d >= PER_DAY) return 'Daily limit reached.';
  r.m.push(now); r.d++; ips.set(ip, r); global++; return null;
}
const SYS = `You convert a plain-English computer task into shell commands. Reply ONLY with JSON: {"powershell":{"cmd":"","why":""},"cmd":{"cmd":"","why":""},"bash":{"cmd":"","why":""},"zsh_macos":{"cmd":"","why":""},"fish":{"cmd":"","why":""}}. "cmd" = a correct, ready-to-run command (one line if possible; use placeholders like <text> only when the user gave no value). "why" = one short line explaining it. bash = Linux GNU tools; zsh_macos = macOS BSD tools. If the request isn't a computer task, put a short note in every "why" and empty "cmd".`;
const json = (s, o) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
export async function onRequestPost({ request, env }) {
  let q; try { q = String((await request.json()).q || '').trim(); } catch { return json(400, { error: 'Bad request' }); }
  if (!q) return json(400, { error: 'Empty question' });
  if (q.length > MAXLEN) return json(400, { error: 'Max 500 characters' });
  const e = limit(request.headers.get('cf-connecting-ip') || 'unknown'); if (e) return json(429, { error: e });
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST',
      headers: { Authorization: 'Bearer ' + env.OPENROUTER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.MODEL || DEFAULT_MODEL, temperature: 0.1, max_tokens: 900,
        response_format: { type: 'json_object' }, messages: [{ role: 'system', content: SYS }, { role: 'user', content: q }] }) });
    if (!r.ok) throw new Error('upstream ' + r.status);
    const j = await r.json();
    const t = j.choices[0].message.content.trim().replace(/^```(json)?|```$/g, '');
    return json(200, JSON.parse(t));
  } catch { return json(502, { error: 'Model error, try again.' }); }
}
