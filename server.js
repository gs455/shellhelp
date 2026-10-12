const http=require('http'),fs=require('fs');
const KEY=process.env.OPENROUTER_API_KEY, MODEL=process.env.MODEL||'google/gemini-3.1-flash-lite';
const PORT=process.env.PORT||8787, MAXLEN=500, PER_MIN=10, PER_DAY=100, GLOBAL_DAY=2000;
const html=fs.readFileSync(__dirname+'/index.html');
let day=new Date().toDateString(), global=0; const ips=new Map();
function limit(ip){const d=new Date().toDateString();if(d!==day){day=d;global=0;ips.clear();}
 if(global>=GLOBAL_DAY)return'Daily site limit reached, try tomorrow.';
 const now=Date.now(),r=ips.get(ip)||{m:[],d:0};r.m=r.m.filter(t=>now-t<60000);
 if(r.m.length>=PER_MIN)return'Too many requests, wait a minute.';if(r.d>=PER_DAY)return'Daily limit reached.';
 r.m.push(now);r.d++;ips.set(ip,r);global++;return null;}
const SYS=`You convert a plain-English computer task into shell commands. Reply ONLY with JSON: {"powershell":{"cmd":"","why":""},"cmd":{"cmd":"","why":""},"bash":{"cmd":"","why":""},"zsh_macos":{"cmd":"","why":""}}. "cmd" = a correct, ready-to-run command (one line if possible; use placeholders like <text> only when the user gave no value). "why" = one short line explaining it. bash = Linux GNU tools; zsh_macos = macOS BSD tools. cmd: if plain cmd built-ins cannot do the task reliably, do NOT invent flags; instead give a one-liner powershell -NoProfile -c "..." and start its "why" with "Uses PowerShell from cmd:". cmd: never use wmic (deprecated/removed on Windows 11); prefer built-ins like fsutil, dir, tasklist, netstat, ipconfig, or call powershell -c only if no cmd way exists. If the request isn't a computer task, put a short note in every "why" and empty "cmd".`;
async function ask(q,retry){const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+KEY,'Content-Type':'application/json'},
 body:JSON.stringify({model:MODEL,temperature:0.1,max_tokens:900,response_format:{type:'json_object'},usage:{include:true},messages:[{role:'system',content:SYS},{role:'user',content:retry?q+'\n(Do not use wmic in cmd; it does not exist on Windows 11. Use fsutil, dir, tasklist, systeminfo, etc.)':q}]})});
 const j=await r.json();if(!r.ok)throw new Error('upstream '+r.status);let t=j.choices[0].message.content.trim().replace(/^```(json)?|```$/g,'');
 const o=JSON.parse(t);if(!retry&&/\bwmic\b/i.test(o.cmd&&o.cmd.cmd||''))return ask(q,true);return {result:o,usage:j.usage,model:j.model};}
http.createServer((req,res)=>{
 if(req.method==='GET'&&(req.url==='/'||req.url==='/index.html')){res.writeHead(200,{'Content-Type':'text/html'});return res.end(html);}
 if(req.method==='POST'&&req.url==='/api/ask'){let b='';req.on('data',c=>{b+=c;if(b.length>4000)req.destroy();});
  req.on('end',async()=>{const send=(s,o)=>{res.writeHead(s,{'Content-Type':'application/json'});res.end(JSON.stringify(o));};
   let q;try{q=String(JSON.parse(b).q||'').trim();}catch{return send(400,{error:'Bad request'});}
   if(!q)return send(400,{error:'Empty question'});if(q.length>MAXLEN)return send(400,{error:'Max 500 characters'});
   const ip=(req.headers['cf-connecting-ip']||req.socket.remoteAddress);const e=limit(ip);if(e)return send(429,{error:e});
   try{const {result,usage,model}=await ask(q);result._meta={model,prompt:usage&&usage.prompt_tokens,completion:usage&&usage.completion_tokens,total:usage&&usage.total_tokens,cost:usage&&usage.cost};console.log(new Date().toISOString(),'ok',usage&&usage.total_tokens,usage&&usage.cost);send(200,result);}catch(err){console.log('err',err.message);send(502,{error:'Model error, try again.'});}});return;}
 res.writeHead(404);res.end();}).listen(PORT,()=>console.log('listening',PORT,MODEL));
