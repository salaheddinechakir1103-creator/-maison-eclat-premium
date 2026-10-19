const crypto=require('node:crypto');
const SERVICES=['تسريحة شعر','مكياج عرائس','تركيب الأظافر','تنظيف البشرة','صباغة الشعر','علاج الشعر','باقة العروس','بديكير ومانيكير'];
const PRICES=[250,400,300,200,350,250,800,180];
const configured=()=>Boolean(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN);
async function redis(...command){const response=await fetch(process.env.UPSTASH_REDIS_REST_URL,{method:'POST',headers:{Authorization:'Bearer '+process.env.UPSTASH_REDIS_REST_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(command)});if(!response.ok)throw Error('Storage unavailable');const data=await response.json();if(data.error)throw Error('Storage error');return data.result;}
function auth(req){const expected=process.env.ADMIN_SECRET;if(!expected||expected.length<16)return false;const provided=String(req.headers['x-admin-secret']||'');if(provided.length!==expected.length)return false;return crypto.timingSafeEqual(Buffer.from(provided),Buffer.from(expected));}
function json(res,status,body){res.setHeader('Cache-Control','no-store');return res.status(status).json(body);}
module.exports=async(req,res)=>{if(!configured())return json(res,503,{error:'الحجز غير متاح حالياً. خاص إعداد قاعدة البيانات.'});try{
if(req.method==='POST'){
const b=req.body||{};const service=Number(b.service);const name=String(b.name||'').trim();const phone=String(b.phone||'').trim();const date=String(b.date||'');const time=String(b.time||'');
if(!Number.isInteger(service)||service<0||service>=SERVICES.length||name.length<2||name.length>80||!/^[+0-9 ()-]{8,20}$/.test(phone)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return json(res,400,{error:'راجع معلومات الحجز'});
const day=new Date(date+'T12:00:00Z');if(Number.isNaN(day.getTime())||day.toISOString().slice(0,10)!==date||day.getTime()<Date.now()-86400000||day.getTime()>Date.now()+90*86400000)return json(res,400,{error:'اختار نهار صالح خلال 90 يوم'});
if(!['10:00','11:00','12:00','14:00','15:00','16:00','17:00'].includes(time))return json(res,400,{error:'وقت غير متاح'});
const id='ME-'+crypto.randomBytes(5).toString('hex').toUpperCase();const record={id,service:SERVICES[service],price:PRICES[service],name,phone,date,time,status:'pending',createdAt:new Date().toISOString()};
await redis('SET','booking:'+id,JSON.stringify(record),'EX',60*60*24*365);await redis('ZADD','bookings',Date.now(),id);
return json(res,201,{ticket:{id,service:record.service,price:record.price,name,date,time,status:'pending'}});
}
if(req.method==='GET'){
if(!auth(req))return json(res,401,{error:'غير مسموح'});const ids=await redis('ZREVRANGE','bookings',0,299);const rows=await Promise.all((ids||[]).map(id=>redis('GET','booking:'+id)));return json(res,200,{bookings:rows.filter(Boolean).map(x=>JSON.parse(x))});}
if(req.method==='PATCH'){
if(!auth(req))return json(res,401,{error:'غير مسموح'});const id=String(req.body?.id||'');const status=String(req.body?.status||'');if(!/^ME-[0-9A-F]{10}$/.test(id)||!['pending','confirmed','cancelled','completed'].includes(status))return json(res,400,{error:'طلب غير صالح'});
const raw=await redis('GET','booking:'+id);if(!raw)return json(res,404,{error:'الحجز غير موجود'});const record=JSON.parse(raw);record.status=status;record.updatedAt=new Date().toISOString();await redis('SET','booking:'+id,JSON.stringify(record),'EX',60*60*24*365);return json(res,200,{booking:record});}
res.setHeader('Allow','GET, POST, PATCH');return json(res,405,{error:'Method not allowed'});
}catch(e){return json(res,500,{error:'وقع مشكل مؤقت، عاود حاول'})}};
