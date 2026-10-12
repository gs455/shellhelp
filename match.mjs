// ESM copy of match.js for Cloudflare Pages Functions; keep in sync.
// Fuzzy matcher: query -> library entry, or null (falls through to AI). No deps.
const STOP=new Set('a an the to my me i in on of for from with all any some this that these those is are be how do can you please what which give command way using use it its s am by whatever up i m want need'.split(' ').filter(w=>!['file','show','get','all'].includes(w)));
const SYN={folder:'directory',dir:'directory',directories:'directory',folders:'directory',files:'file',delete:'remove',del:'remove',erase:'remove',rm:'remove',see:'show',display:'show',view:'show',print:'show',list:'show',ls:'show',check:'show',find:'search',locate:'search',look:'search',size:'size',space:'space',storage:'space',procs:'process',processes:'process',program:'process',programs:'process',kill:'stop',terminate:'stop',end:'stop',ip:'ip',address:'ip',ports:'port',listening:'listen',make:'create',new:'create',mkdir:'create',unzip:'extract',decompress:'extract',uncompress:'extract',zip:'zip',compress:'compress',rename:'rename',biggest:'largest',big:'largest',largest:'largest',copy:'copy',duplicate:'copy',cp:'copy',move:'move',mv:'move',env:'environment',variables:'variable',vars:'variable',var:'variable',usage:'use',memory:'memory',ram:'memory',mem:'memory',cpu:'cpu',processor:'cpu',reboot:'restart',os:'os',version:'version',ver:'version',containing:'contain',contains:'contain',inside:'contain',text:'text',string:'text',word:'text',permissions:'permission',perms:'permission',executable:'executable',exec:'executable'};
const norm=s=>String(s).toLowerCase().replace(/<[^>]*>/g,' ').replace(/[^a-z0-9.\s]/g,' ').split(/\s+/).map(w=>w.replace(/^\.+|\.+$/g,'')).filter(w=>w&&!STOP.has(w)).map(w=>{w=SYN[w]||w;if(w.length>4&&w.endsWith('es')&&!w.endsWith('ses'))w=w.slice(0,-2);else if(w.length>3&&w.endsWith('s')&&!w.endsWith('ss'))w=w.slice(0,-1);return SYN[w]||w;});
function build(lib){return lib.map(e=>({e,ph:[...e.phrases,e.id.replace(/^[a-z]+-/,'').replace(/-/g,' ')].map(p=>new Set(norm(p)))}));}
const isVal=t=>/^\d+$/.test(t)||/[._]/.test(t);
// Score = 0.6*query coverage + 0.4*phrase coverage. Literal values (numbers, names with . or _) are ignored
// for query coverage since entries use placeholders. Ambiguous wins (two entries within 0.05) go to AI.
function match(idx,q,thr=0.8){const all=norm(q),qt=new Set(all.filter(t=>!isVal(t)));if(!qt.size||qt.size>8)return null;
 const sc=[];for(const it of idx){let b=0,qc=0;for(const p of it.ph){if(!p.size)continue;let n=0;for(const t of qt)if(p.has(t))n++;
  const q1=n/qt.size,s=0.6*q1+0.4*n/p.size;if(s>b){b=s;qc=q1;}}if(qc>=0.75)sc.push([b,it.e]);}
 sc.sort((a,b)=>b[0]-a[0]);if(!sc.length||sc[0][0]<thr)return null;if(sc[1]&&sc[0][0]-sc[1][0]<0.05)return null;
 const e=sc[0][1];// Query carries a concrete value (number, quoted text, file.ext, name_x) and entry uses placeholders: let AI fill it in.
 if(/\d|['"`]|\.\w|\w_\w/.test(q)&&/<[^>]+>/.test(e.bash.cmd+e.powershell.cmd+e.cmd.cmd+e.zsh_macos.cmd))return null;
 return {entry:e,score:sc[0][0]};}
export {build,match,norm};
