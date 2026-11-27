import {readFile,writeFile,mkdir} from "node:fs/promises";

const token=process.env.TELEGRAM_BOT_TOKEN;
const githubToken=process.env.GITHUB_TOKEN;
const repository=process.env.GITHUB_REPOSITORY;
const targetRef=process.env.PRODUCTION_BRANCH||"integrate/openmontage";
const offsetFile="data/telegram-update-offset.txt";
if(!token||!githubToken||!repository)throw new Error("Missing TELEGRAM_BOT_TOKEN, GITHUB_TOKEN or GITHUB_REPOSITORY.");

async function telegram(method,body){
 const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok||!data.ok)throw new Error(`Telegram ${method}: ${data.description??response.status}`);
 return data.result;
}
async function github(path,body){
 const response=await fetch(`https://api.github.com/repos/${repository}/${path}`,{method:"POST",headers:{Authorization:`Bearer ${githubToken}`,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},body:JSON.stringify(body)});
 if(!response.ok)throw new Error(`GitHub ${path}: HTTP ${response.status} ${await response.text()}`);
 return response.status===204?null:response.json();
}
await mkdir("data",{recursive:true});
let offset=0,initialized=true;
try{offset=Number((await readFile(offsetFile,"utf8")).trim())||0;}catch{initialized=false;}
const updates=await telegram("getUpdates",{offset,limit:100,timeout:0,allowed_updates:["message"]});
let nextOffset=offset;
if(!initialized){
 for(const update of updates)nextOffset=Math.max(nextOffset,update.update_id+1);
 await writeFile(offsetFile,String(nextOffset)+"\\n");
 console.log(`Initialized Telegram inbox checkpoint at ${nextOffset}; skipped ${updates.length} older updates to avoid replaying historic messages.`);
 process.exit(0);
}
for(const update of updates){
 nextOffset=Math.max(nextOffset,update.update_id+1);
 const msg=update.message;
 if(!msg||msg.chat?.type!=="private"||msg.from?.is_bot||!msg.text)continue;
 const chatId=msg.chat.id;
 const text=msg.text.trim();
 if(/^\/(start|help)(?:@\w+)?$/i.test(text)){
  await telegram("sendMessage",{chat_id:chatId,text:"مرحباً بك في Michkatt.\n\nأرسل طلب إنتاجك في رسالة نصية واحدة: الموضوع، تعليماتك الإخراجية، وأي روابط YouTube مرجعية.\n\nيمكنك أيضاً استخدام /topic ثم كتابة الموضوع.\n\nحالياً أستقبل النصوص وروابط YouTube؛ الملفات والصوت لم تُفعّل بعد."});
  continue;
 }
 if(/^\/(status)(?:@\w+)?$/i.test(text)){
  await telegram("sendMessage",{chat_id:chatId,text:"البوت متصل ويستقبل الرسائل النصية. أرسل /help لمعرفة طريقة إرسال طلب إنتاج."});
  continue;
 }
 if(/^\/(topic|produce)(?:@\w+)?\s*/i.test(text)===false&&text.startsWith("/")){
  await telegram("sendMessage",{chat_id:chatId,text:"لم أفهم الأمر. أرسل /help لعرض طريقة الاستخدام."});
  continue;
 }
 const brief=text.replace(/^\/(topic|produce)(?:@\w+)?\s*/i,"").trim();
 if(!brief){
  await telegram("sendMessage",{chat_id:chatId,text:"أرسل الموضوع أو موجز الإنتاج بعد الأمر، مثلاً: /topic The Great Molasses Flood of 1919"});
  continue;
 }
 const urls=[...brief.matchAll(/https?:\/\/[^\s]+/g)].map(m=>m[0].replace(/[),.;]+$/,""));
 const cleanBrief=brief.replace(/https?:\/\/[^\s]+/g," ").replace(/\s+/g," ").trim()||"Create a documentary based on the supplied reference videos.";
 if(cleanBrief.length>60000)throw new Error("Incoming production brief exceeds GitHub Actions input limit.");
 await github("actions/workflows/render-demo.yml/dispatches",{ref:targetRef,inputs:{production_script:cleanBrief,reference_urls:urls.join("\n")}});
 await telegram("sendMessage",{chat_id:chatId,text:"استلمت موجز الإنتاج وروابط المراجع، وأرسلت طلب التشغيل إلى GitHub Actions. تنبيه: مرحلة البحث والتوليد تعتمد على رصيد OpenAI API المتاح؛ إذا لم يتوفر الرصيد سيظهر فشل واضح ولن يُعلن عن فيديو غير موجود."});
}
if(nextOffset>offset){
 await writeFile(offsetFile,String(nextOffset)+"\n");
}
console.log(`Processed ${updates.length} Telegram updates; next offset ${nextOffset}.`);
