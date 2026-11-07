const endpoint='https://rpcvvsphniyounrpllzk.supabase.co/functions/v1/football-api';
const key='sb_publishable_FmYLILyPTNWamPI8ErgBdA_-7qbC0KP';
function device(){let token=localStorage.getItem('footballDevice');if(!token){token=Array.from(crypto.getRandomValues(new Uint8Array(36))).map(x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem('footballDevice',token)}return token}
try{localStorage.removeItem('fb_admin')}catch{}
export async function api(action:string,values:any={}){
 const r=await fetch(endpoint,{method:'POST',headers:{apikey:key,'Content-Type':'application/json','x-player-token':device(),'x-admin-token':sessionStorage.getItem('footballAdmin')??''},body:JSON.stringify({action,...values})});
 let d:any;try{d=await r.json()}catch{throw Error('השירות אינו זמין כרגע. נסה שוב')}
 if(!r.ok)throw Error(d.error??'הפעולה נכשלה');return d;
}
