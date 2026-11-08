import {hash,passwordHash,mutate,project,type State} from './core.ts';
const root=Deno.env.get('SUPABASE_URL')!+'/rest/v1/';
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json'};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, apikey, x-player-token, x-admin-token','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export async function handler(req:Request){
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
 const text=await req.text();if(text.length>5000)return reply({error:'הבקשה גדולה מדי'},413);const b=JSON.parse(text);
 const rawDevice=req.headers.get('x-player-token')??'',rawAdmin=req.headers.get('x-admin-token')??'';
 if(rawDevice&&!/^[a-f0-9-]{72}$/.test(rawDevice))return reply({error:'זיהוי מכשיר לא תקין'},400);
 const ipHash=await hash(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'unknown');
 let group=b.group===undefined?'asaf':b.group;
 let action=b.action;
 if(action==='signup'||action==='portalLogin'){
 const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>60)return reply({error:'יש להזין כתובת אימייל תקינה (עד 60 תווים)'},400);
 const limiter=await fetch(root+'rpc/football_signup_allowed',{method:'POST',headers,body:JSON.stringify({ip_key:ipHash})});
 if(!limiter.ok)throw Error('Rate limiter unavailable');if(!await limiter.json())return reply({error:'יותר מדי ניסיונות. נסה שוב בעוד שעה'},429);
 if(action==='signup'){
 const name=typeof b.name==='string'?b.name.trim().replace(/\s+/g,' '):'';
 if(name.length<2||name.length>60||typeof b.password!=='string'||b.password.length<10||b.password.length>128)return reply({error:'יש להזין שם קבוצה וסיסמה של 10–128 תווים'},400);
 group=crypto.randomUUID();const salt=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),id=crypto.randomUUID();
 const s:State={players:[],game:null,history:[],accounts:[{id,name:email,salt,hash:await passwordHash(b.password,salt),owner:true}],sessions:[{hash:await hash(token),account:id,expires:Date.now()+12*3600000}],attempts:{}};
 const insert=await fetch(root+'football_groups',{method:'POST',headers,body:JSON.stringify({id:group,name,owner_email:email,data:s})});
 if(insert.status===409)return reply({error:'לא ניתן ליצור קבוצה עם הפרטים האלה. אם כבר נרשמת, עבור לכניסת מנהל'},409);
 if(!insert.ok)throw Error('Create failed');return reply({group,groupName:name,token});
 }
 const lookup=await fetch(root+'football_groups?owner_email=eq.'+encodeURIComponent(email)+'&select=id',{headers});if(!lookup.ok)throw Error('Lookup failed');const found=await lookup.json();
 if(!found[0])return reply({error:'האימייל או הסיסמה שגויים'},401);
 group=found[0].id;action='login';b.username=email;
 }
 if(group!=='asaf'&&(typeof group!=='string'||!uuid.test(group)))return reply({error:'קישור הקבוצה אינו תקין'},400);
 const legacy=group==='asaf',base=root+(legacy?'football_club':'football_groups'),filter=legacy?'id=eq.1':'id=eq.'+group;
 // Scope device identity to a group; legacy identities retain their original hashes.
 const device=rawDevice?await hash(legacy?rawDevice:group+':'+rawDevice):'',adminHash=rawAdmin?await hash(rawAdmin):'';
 for(let i=0;i<12;i++){
 const r=await fetch(base+'?'+filter+'&select=revision,data'+(legacy?'':',name'),{headers});if(!r.ok)throw Error('Storage unavailable');const rows=await r.json();if(!rows[0])return reply({error:'הקבוצה לא נמצאה. בדוק את הקישור שקיבלת'},404);
 const {revision,data:s}=rows[0] as {revision:number,data:State};const groupName=legacy?'הכדורגל שלנו':rows[0].name;
 if(action==='read')return reply({...project(s,device,adminHash),group,groupName});
 const result=await mutate(s,{...b,action},device,adminHash,ipHash);
 const update=await fetch(base+`?${filter}&revision=eq.${revision}`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({data:s,revision:revision+1})});
 if(!update.ok)throw Error('Storage unavailable');const updated=await update.json();if(!updated.length)continue;
 if(result.error)return reply({error:result.error},result.status);
 return reply({...project(s,device,result.token?await hash(result.token):result.logout?'':adminHash),group,groupName,...(result.token?{token:result.token}:{})});
 }return reply({error:'הרשימה עמוסה כרגע. נסה שוב'},409);
 }catch(e){const msg=e instanceof Error?e.message:'שגיאה';return reply({error:/[א-ת]/.test(msg)?msg:'לא הצלחנו להשלים את הפעולה. נסה שוב'},400)}
}
Deno.serve(handler);
