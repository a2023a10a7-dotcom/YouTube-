import {readFile} from "node:fs/promises";

const API="https://api.telegram.org";
async function telegram(method,token,body){
 const response=await fetch(`${API}/bot${token}/${method}`,{method:"POST",body});
 const json=await response.json().catch(()=>({}));
 if(!response.ok||!json.ok)throw new Error(`Telegram ${method} failed: ${json.description??response.status}`);
 return json.result;
}
function splitText(value,max=3800){
 const chunks=[];let remaining=String(value??"");
 while(remaining.length>max){let cut=remaining.lastIndexOf("\n",max);if(cut<max/2)cut=max;chunks.push(remaining.slice(0,cut));remaining=remaining.slice(cut).trimStart();}
 if(remaining)chunks.push(remaining);return chunks;
}
export async function sendProductionBundle({token,chatId,projectDir="public/project",fetchImpl=fetch}){
 if(!token||!chatId)throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required.");
 const [research,script,blueprint,sources]=await Promise.all([
  readFile(`${projectDir}/research.json`,"utf8"),
  readFile(`${projectDir}/script.txt`,"utf8"),
  readFile(`${projectDir}/blueprint.json`,"utf8"),
  readFile(`${projectDir}/SOURCES.md`,"utf8")
 ]);
 const send=async(method,body)=>{const response=await fetchImpl(`${API}/bot${token}/${method}`,{method:"POST",body});const json=await response.json().catch(()=>({}));if(!response.ok||!json.ok)throw new Error(`Telegram ${method} failed: ${json.description??response.status}`);return json.result;};
 await send("sendMessage",new URLSearchParams({chat_id:String(chatId),text:"🎬 Documentary production package ready\nTopic: "+JSON.parse(research).topic+"\n\nI am sending the research, English narration, director blueprint and source list as separate files."}));
 const upload=async(filename,content,caption)=>{const form=new FormData();form.append("chat_id",String(chatId));form.append("document",new Blob([content],{type:"application/json"}),filename);if(caption)form.append("caption",caption);await send("sendDocument",form);};
 await upload("research-report.json",research,"1/4 — Research report with source URLs");
 await upload("english-script.txt",script,"2/4 — English documentary narration");
 await upload("director-blueprint.json",blueprint,"3/4 — Editorial scene-by-scene director blueprint; footage assets are still pending.");
 await upload("sources.md",sources,"4/4 — Research source list");
 return {sent:4,chatId:String(chatId)};
}
if(import.meta.url===new URL(process.argv[1]??"", "file://"+process.cwd()+"/").href){
 sendProductionBundle({token:process.env.TELEGRAM_BOT_TOKEN,chatId:process.env.TELEGRAM_CHAT_ID}).then(x=>console.log("Telegram delivery complete:",x)).catch(e=>{console.error(e.message);process.exitCode=1;});
}
