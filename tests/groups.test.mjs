import assert from 'node:assert/strict';
import {passwordHash,hash} from '../supabase/functions/football-api/core.ts';
const legacy={revision:0,data:{players:[],game:null,history:[],accounts:[{id:'legacy-owner',name:'admin',salt:'salt',hash:await passwordHash('legacy-test-password','salt'),owner:true}],sessions:[],attempts:{}}};
const rows=new Map();let allow=true;
globalThis.Deno={env:{get:k=>k==='SUPABASE_URL'?'https://test.invalid':'secret'},serve:()=>{}};
globalThis.fetch=async(url,opts={})=>{
 const u=new URL(url),method=opts.method||'GET';const body=opts.body?JSON.parse(opts.body):null;
 if(u.pathname.endsWith('/rpc/football_signup_allowed'))return Response.json(allow);
 const isLegacy=u.pathname.endsWith('/football_club');const id=u.searchParams.get('id')?.slice(3);
 if(method==='POST'){
  if([...rows.values()].some(r=>r.owner_email===body.owner_email))return Response.json({}, {status:409});
  rows.set(body.id,{...body,revision:0});return new Response(null,{status:201});
 }
 const row=isLegacy?legacy:rows.get(id);
 if(method==='PATCH'){
  if(!row||row.revision!==Number(u.searchParams.get('revision')?.slice(3)))return Response.json([]);
  Object.assign(row,structuredClone(body));return Response.json([row]);
 }
 if(u.searchParams.has('owner_email'))return Response.json([...rows.values()].filter(r=>r.owner_email===u.searchParams.get('owner_email').slice(3)).map(r=>({id:r.id})));
 return Response.json(row?[row]:[]);
};
const {handler}=await import('../supabase/functions/football-api/index.ts');
async function call(body,token='',device='a'.repeat(72)){
 const r=await handler(new Request('https://test.invalid/api',{method:'POST',headers:{'content-type':'application/json','x-player-token':device,'x-admin-token':token},body:JSON.stringify(body)}));return {status:r.status,...await r.json()};
}
const a=await call({action:'signup',name:'קבוצה א',email:'a@example.invalid',password:'safe-test-password'});assert.equal(a.status,200);
const b=await call({action:'signup',name:'קבוצה ב',email:'b@example.invalid',password:'other-test-password'});assert.equal(b.status,200);assert.notEqual(a.group,b.group);
assert.equal((await call({action:'signup',name:'כפול',email:'a@example.invalid',password:'safe-test-password'})).status,409);
let r=await call({action:'read',group:a.group},a.token);assert(r.admin);assert.equal(r.groupName,'קבוצה א');assert(!('accounts' in r));
r=await call({action:'read',group:b.group},a.token);assert(!r.admin);assert.equal(r.players.length,0);
assert.equal((await call({action:'create',group:b.group,date:'2026-12-01',time:'20:00',place:'מגרש ברחוב 5'},a.token)).status,400);
r=await call({action:'create',group:a.group,date:'2026-12-01',time:'20:00',place:'מגרש ברחוב 5'},a.token);assert.equal(r.status,200);const gameId=r.game.id;
await call({action:'profile',group:a.group,name:'שחקן בדיקה'});
r=await call({action:'join',group:a.group,gameId});assert.equal(r.game.queue.length,1);
r=await call({action:'read',group:b.group});assert.equal(r.me,null);assert.equal(r.players.length,0);assert.equal(r.game,null);
assert.equal((await call({action:'read',group:'bad&select=*'})).status,400);
assert.equal((await call({action:'read',group:'00000000-0000-0000-0000-000000000001'})).status,404);
r=await call({action:'portalLogin',email:'A@example.invalid',password:'safe-test-password'});assert.equal(r.status,200);assert.equal(r.group,a.group);assert(r.admin);
assert.equal((await call({action:'portalLogin',email:'a@example.invalid',password:'wrong'})).status,401);
r=await call({action:'login',username:'admin',password:'legacy-test-password'});assert(r.admin);assert.equal(r.group,'asaf');
assert(!(await call({action:'read',group:a.group},r.token)).admin);
const old=await call({action:'profile',name:'Legacy Player'});assert.equal(old.group,'asaf');assert.equal(legacy.data.players[0].uid,await hash('a'.repeat(72)));
assert.notEqual(rows.get(a.group).data.players[0].uid,legacy.data.players[0].uid);
allow=false;assert.equal((await call({action:'signup',name:'קבוצה ג',email:'c@example.invalid',password:'test-password-3'})).status,429);
console.log('PASS: signup, duplicate email, tenant reads/writes, scoped device/admin sessions, portal login, legacy compatibility, invalid links and signup limits');
