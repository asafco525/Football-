import {hash,mutate,project,type State} from './core.ts';
const base=Deno.env.get('SUPABASE_URL')!+'/rest/v1/football_club';
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json'};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, apikey, x-player-token, x-admin-token','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
 const text=await req.text();if(text.length>5000)return reply({error:'הבקשה גדולה מדי'},413);const b=JSON.parse(text);
 const rawDevice=req.headers.get('x-player-token')??'',rawAdmin=req.headers.get('x-admin-token')??'';
 if(rawDevice&&!/^[a-f0-9-]{72}$/.test(rawDevice))return reply({error:'זיהוי מכשיר לא תקין'},400);
 const device=rawDevice?await hash(rawDevice):'',adminHash=rawAdmin?await hash(rawAdmin):'';
 const ipHash=await hash(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'unknown');
 for(let i=0;i<12;i++){
 const r=await fetch(base+'?id=eq.1&select=revision,data',{headers});if(!r.ok)throw Error('Storage unavailable');const rows=await r.json();if(!rows[0])throw Error('Missing configuration');
 const {revision,data:s}=rows[0] as {revision:number,data:State};
 if(b.action==='read')return reply(project(s,device,adminHash));
 const result=await mutate(s,b,device,adminHash,ipHash);
 const update=await fetch(base+`?id=eq.1&revision=eq.${revision}`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({data:s,revision:revision+1})});
 if(!update.ok)throw Error('Storage unavailable');const updated=await update.json();if(!updated.length)continue;
 if(result.error)return reply({error:result.error},result.status);
 return reply({...project(s,device,result.token?await hash(result.token):result.logout?'':adminHash),...(result.token?{token:result.token}:{})});
 }return reply({error:'הרשימה עמוסה כרגע. נסה שוב'},409);
 }catch(e){const msg=e instanceof Error?e.message:'שגיאה';return reply({error:/[א-ת]/.test(msg)?msg:'לא הצלחנו להשלים את הפעולה. נסה שוב'},400)}
});

