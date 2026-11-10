import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {validate} from './validation.mjs';
const root=dirname(fileURLToPath(import.meta.url)),file=resolve(process.env.DATA_DIR||resolve(root,'data'),'appointments.json');
const password=process.env.PLANNER_PASSWORD;
if(!password || password.length<20) throw Error('Set PLANNER_PASSWORD to a unique password of at least 20 characters.');
await mkdir(dirname(file),{recursive:true});
let records=[];try{records=JSON.parse(await readFile(file,'utf8'));if(!Array.isArray(records))throw Error('Invalid data file');}catch(e){if(e.code!=='ENOENT')throw e;}
const salt=randomBytes(32),hash=scryptSync(password,salt,32),sessions=new Map(),attempts=new Map();
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
async function body(req){let value='';for await(const chunk of req){value+=chunk;if(value.length>1000000)throw Error('Request too large');}return JSON.parse(value||'{}');}
let queue=Promise.resolve();
function mutate(fn){const run=queue.then(async()=>{const next=fn(records);await writeFile(file+'.tmp',JSON.stringify(next,null,2),{mode:0o600});await rename(file+'.tmp',file);records=next;});queue=run.catch(()=>{});return run;}
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");res.setHeader('Cache-Control','no-store');
try{const url=new URL(req.url,'http://localhost');const path=url.pathname;
if(path==='/health')return json(res,200,{ok:true});
if(req.method!=='GET'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return json(res,403,{error:'Invalid origin'});
if(path==='/api/login'&&req.method==='POST'){const ip=req.socket.remoteAddress,now=Date.now();let entry=attempts.get(ip);if(!entry||entry.until<now){entry={count:0,until:now+900000};attempts.set(ip,entry);}if(entry.count>=10)return json(res,429,{error:'Too many attempts. Try again in 15 minutes.'});const data=await body(req);entry.count++;const input=scryptSync(String(data.password||''),salt,32);if(!timingSafeEqual(input,hash))return json(res,401,{error:'Incorrect password'});attempts.delete(ip);const token=randomBytes(32).toString('hex');sessions.set(token,now+86400000);res.setHeader('Set-Cookie',`planner_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);return json(res,200,{ok:true});}
if(path.startsWith('/api/')){const token=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('planner_session='))?.split('=')[1];if((sessions.get(token)||0)<Date.now())return json(res,401,{error:'Please sign in'});
if(path==='/api/logout'&&req.method==='POST'){sessions.delete(token);res.setHeader('Set-Cookie','planner_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
if(path==='/api/appointments'&&req.method==='GET')return json(res,200,records);
if(path==='/api/appointments'&&req.method==='POST'){const data=validate(await body(req)),item={...data,id:randomBytes(12).toString('hex'),updatedAt:new Date().toISOString()};await mutate(items=>[...items,item]);return json(res,201,item);}
const match=path.match(/^\/api\/appointments\/([a-f0-9]{24})$/);if(match){const id=match[1];if(!records.some(x=>x.id===id))return json(res,404,{error:'Appointment not found'});if(req.method==='PUT'){const data=validate(await body(req));await mutate(items=>items.map(x=>x.id===id?{...data,id,updatedAt:new Date().toISOString()}:x));return json(res,200,{ok:true});}if(req.method==='DELETE'){await mutate(items=>items.filter(x=>x.id!==id));return json(res,200,{ok:true});}}
return json(res,404,{error:'Not found'});}
const assets={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};if(req.method!=='GET'||!assets[path])return json(res,404,{error:'Not found'});const ext=assets[path].split('.').pop();res.setHeader('Content-Type',({html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8'})[ext]);res.end(await readFile(resolve(root,'public',assets[path])));
}catch(e){if(e.name==='ValidationError'||e instanceof SyntaxError)return json(res,400,{error:e.message});console.error(e.message);json(res,500,{error:'Unable to save or load data. Please try again.'});}});
setInterval(()=>{const now=Date.now();for(const [k,v]of sessions)if(v<now)sessions.delete(k);for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);},60000).unref();
const option=name=>{const index=process.argv.indexOf(name);return index<0?undefined:process.argv[index+1];};
const port=Number(option('--port')||process.env.PORT)||3000;
server.listen(port,option('--host')||process.env.HOST||'0.0.0.0',()=>console.log('Planner running on port '+port));
