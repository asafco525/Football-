export type Player={id:string,name:string,uid?:string,level:number|null};
export type Game={id:string,date:string,time:string,place:string,open:boolean,queue:string[],teams:string[][]|null};
export type State={players:Player[],game:Game|null,history:Game[],accounts:{id:string,name:string,salt:string,hash:string,owner:boolean}[],sessions:{hash:string,account:string,expires:number}[],attempts:Record<string,{count:number,until:number}>};
export const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:600000},key,256))).map(x=>x.toString(16).padStart(2,'0')).join('')}
export function balance(players:Player[]):string[][] {
 if(players.length!==20 || players.some(p=>!p.level)) throw Error('צריך 20 שחקנים מדורגים כדי לחלק קבוצות');
 const groups=[1,2,3].map(l=>players.filter(p=>p.level===l));for(const g of groups)for(let i=g.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[g[i],g[j]]=[g[j],g[i]]}
 const allocations=(n:number)=>{const out:number[][]=[];for(let mask=0;mask<16;mask++){const a=[0,1,2,3].map(i=>Math.floor(n/4)+((mask>>i)&1));if(a.reduce((x,y)=>x+y,0)===n)out.push(a)}return out};
 let best:number[][]|null=null, score=Infinity;
 for(const a of allocations(groups[0].length))for(const b of allocations(groups[1].length))for(const c of allocations(groups[2].length)){if(a.some((v,i)=>v+b[i]+c[i]!==5))continue;const sums=a.map((v,i)=>v+2*b[i]+3*c[i]);const s=Math.max(...sums)-Math.min(...sums);if(s<score){score=s;best=[a,b,c]}}
 if(!best)throw Error('לא ניתן לחלק קבוצות');const teams:string[][]=[[],[],[],[]];best.forEach((a,l)=>a.forEach((n,i)=>teams[i].push(...groups[l].splice(0,n).map(p=>p.id))));return teams;
}
export function account(s:State,tokenHash:string,now=Date.now()){const session=s.sessions.find(x=>x.hash===tokenHash&&x.expires>now);return session?s.accounts.find(x=>x.id===session.account):undefined}
export function project(s:State,device:string,adminHash:string){const a=account(s,adminHash);return {admin:!!a,owner:!!a?.owner,me:s.players.find(p=>p.uid===device)?.id??null,players:s.players.map(p=>({id:p.id,name:p.name,...(a?{level:p.level}:{} )})),game:s.game,managers:a?.owner?s.accounts.filter(x=>!x.owner).map(x=>({id:x.id,name:x.name})):[]};}
const clean=(x:unknown)=>typeof x==='string'?x.trim().replace(/\s+/g,' ').slice(0,60):'';
export async function mutate(s:State,b:any,device:string,adminHash:string,ipHash:string,now=Date.now()):Promise<any>{
 const a=account(s,adminHash,now),admin=!!a,owner=!!a?.owner;
 const needAdmin=()=>{if(!admin)throw Error('הפעולה מיועדת למנהלים בלבד')};
 if(b.action==='login'){
 s.sessions=s.sessions.filter(x=>x.expires>now);s.attempts=Object.fromEntries(Object.entries(s.attempts).filter(([,v])=>v.until>now));
 const entry=s.attempts[ipHash]??{count:0,until:now+15*60000},global=s.attempts.global??{count:0,until:now+15*60000};
 if(entry.count>=8||global.count>=60)return {error:'יותר מדי ניסיונות כניסה. נסה שוב בעוד רבע שעה',status:429};
 entry.count++;global.count++;s.attempts[ipHash]=entry;s.attempts.global=global;
 const user=s.accounts.find(x=>x.name===clean(b.username));if(!user||typeof b.password!=='string'||b.password.length>128||await passwordHash(b.password,user.salt)!==user.hash)return {error:'שם המשתמש או הסיסמה שגויים',status:401};
 const token=crypto.randomUUID()+crypto.randomUUID();s.sessions.push({hash:await hash(token),account:user.id,expires:now+12*3600000});delete s.attempts[ipHash];return {token};
 }
 if(b.action==='logout'){s.sessions=s.sessions.filter(x=>x.hash!==adminHash);return {logout:true}}
 if(!device)throw Error('לא ניתן לזהות את המכשיר. אפשר שמירה בדפדפן ונסה שוב');
 if(['join','cancel','toggle','balance'].includes(b.action)&&b.gameId!==s.game?.id)throw Error('המשחק השתנה. רענן את הרשימה ונסה שוב');
 if(b.action==='profile'){const name=clean(b.name);if(name.length<3||!name.includes(' '))throw Error('יש להזין שם פרטי ומשפחה');let p=s.players.find(p=>p.uid===device);const existing=s.players.find(x=>x.name.toLocaleLowerCase()===name.toLocaleLowerCase()&&x.id!==p?.id);if(existing&&existing.id!==p?.id&&existing.uid)throw Error('השם כבר בשימוש. אם החלפת מכשיר, פנה למנהל לשחרור החיבור');if(!p&&existing){existing.uid=device;}else if(!p)s.players.push({id:crypto.randomUUID(),name,uid:device,level:null});else {if(existing&&existing.id!==p.id)throw Error('השם קיים במאגר');p.name=name;}}
 else if(b.action==='join'){const p=s.players.find(p=>p.uid===device);if(!p)throw Error('קודם יש לשמור את השם שלך');if(!s.game?.open)throw Error('ההרשמה סגורה');if(!s.game.queue.includes(p.id)){s.game.queue.push(p.id);if(s.game.queue.length<=20)s.game.teams=null;}}
 else if(b.action==='cancel'){const p=s.players.find(p=>p.uid===device);const id=admin&&b.id?b.id:p?.id;if(!id)throw Error('לא נמצאה הרשמה');if(!admin&&b.id&&b.id!==id)throw Error('אפשר לבטל רק את ההרשמה שלך');if(s.game){if(s.game.queue.slice(0,20).includes(id))s.game.teams=null;s.game.queue=s.game.queue.filter(x=>x!==id);}}
 else if(b.action==='create'){needAdmin();if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time)||!clean(b.place)||Number.isNaN(Date.parse(b.date)))throw Error('יש למלא תאריך, שעה ומיקום');if(s.game)s.history.push(s.game);s.game={id:crypto.randomUUID(),date:b.date,time:b.time,place:clean(b.place),open:true,queue:[],teams:null};}
 else if(b.action==='toggle'){needAdmin();if(s.game)s.game.open=!s.game.open;}
 else if(b.action==='add'){needAdmin();const name=clean(b.name);if(name.length<3||!name.includes(' ')||s.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw Error('יש להזין שם מלא ייחודי');const level=Number(b.level);if(![1,2,3].includes(level))throw Error('רמה לא תקינה');s.players.push({id:crypto.randomUUID(),name,level});}
 else if(b.action==='rate'){needAdmin();const p=s.players.find(p=>p.id===b.id);if(!p||![1,2,3].includes(Number(b.level)))throw Error('רמה לא תקינה');p.level=Number(b.level);if(s.game?.queue.slice(0,20).includes(p.id))s.game.teams=null;}
 else if(b.action==='balance'){needAdmin();if(!s.game)throw Error('אין משחק פעיל');s.game.teams=balance(s.game.queue.slice(0,20).map(id=>s.players.find(p=>p.id===id)!));}
 else if(b.action==='release'){needAdmin();const p=s.players.find(p=>p.id===b.id);if(p)delete p.uid;}
 else if(b.action==='manager'){if(!owner)throw Error('רק בעל האתר יכול לשנות מנהלים');const name=clean(b.username);if(!/^[a-zA-Z0-9_-]{2,30}$/.test(name))throw Error('שם משתמש: 2–30 אותיות באנגלית או ספרות');if(s.accounts.some(x=>x.name===name))throw Error('שם המשתמש כבר קיים');if(typeof b.password!=='string'||b.password.length<6||b.password.length>128)throw Error('הסיסמה צריכה להכיל לפחות 6 תווים');const salt=crypto.randomUUID();s.accounts.push({id:crypto.randomUUID(),name,salt,hash:await passwordHash(b.password,salt),owner:false});}
 else if(b.action==='removeManager'){if(!owner)throw Error('רק בעל האתר יכול לשנות מנהלים');s.accounts=s.accounts.filter(x=>x.owner||x.id!==b.id);s.sessions=s.sessions.filter(x=>s.accounts.some(a=>a.id===x.account));}
 else throw Error('פעולה לא מוכרת');
 return {};
}

