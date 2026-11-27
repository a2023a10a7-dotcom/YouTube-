import {mkdir,writeFile,readFile} from "node:fs/promises";
import {spawn} from "node:child_process";
import {resolve,basename} from "node:path";

const root=process.cwd();
const commons="https://commons.wikimedia.org/w/api.php";
const voice=resolve("voices/en_US-lessac-medium.onnx");
const voiceJson=voice+".json";
const allowed=(s)=>/public domain|cc0|cc by(-sa)?/i.test(String(s??""));
const clean=(s)=>String(s??"").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const tokens=(s)=>new Set(String(s??"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(x=>x.length>2&&!["the","and","with","from","that","this","into","over","after","before","scene","historical","archival","photograph","photographs"].includes(x)));
async function fetchJson(url){const r=await fetch(url,{headers:{"User-Agent":"HiddenEngineDocumentary/1.0 (documentary archival research; contact via GitHub repository)"}});if(!r.ok)throw new Error("Wikimedia API HTTP "+r.status);return r.json();}
async function getArchivePool(){
 const cats=["Category:Boston_Molasses_Disaster","Category:Boston_Elevated_Railway_after_the_Molasses_Flood"];
 const files=new Map();
 for(const cat of cats){
  const u=new URL(commons);for(const [k,v] of Object.entries({action:"query",generator:"categorymembers",gcmtitle:cat,gcmtype:"file",gcmlimit:"50",prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"1920",format:"json",origin:"*"}))u.searchParams.set(k,v);
  const data=await fetchJson(u);
  for(const page of Object.values(data.query?.pages??{})){
   const info=page.imageinfo?.[0],meta=info?.extmetadata??{},license=clean(meta.LicenseShortName?.value);
   if(!info?.thumburl||!allowed(license))continue;
   files.set(page.pageid,{title:page.title,url:info.thumburl,originalUrl:info.url,description:clean(meta.ImageDescription?.value),artist:clean(meta.Artist?.value),credit:clean(meta.Credit?.value),license,licenseUrl:meta.LicenseUrl?.value??"https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia",sourcePage:"https://commons.wikimedia.org/wiki/"+encodeURIComponent(page.title.replaceAll(" ","_")),width:info.width,height:info.height});
  }
 }
 return [...files.values()];
}
function score(query,item){const q=tokens(query),t=tokens([item.title,item.description].join(" "));let n=0;for(const x of q)if(t.has(x))n++;return n/Math.max(1,q.size);}
async function downloadImage(item,path){const r=await fetch(item.url,{headers:{"User-Agent":"HiddenEngineDocumentary/1.0"}});if(!r.ok)throw new Error("Image download failed: "+r.status+" "+item.title);const b=Buffer.from(await r.arrayBuffer());if(b.length<10000)throw new Error("Image too small: "+item.title);await writeFile(path,b);}
function run(command,args,stdin){return new Promise((ok,bad)=>{const p=spawn(command,args,{stdio:["pipe","inherit","inherit"]});p.on("error",bad);p.on("close",c=>c===0?ok():bad(new Error(command+" exited "+c)));if(stdin!==undefined){p.stdin.end(stdin);}else p.stdin.end();});}
async function probeDuration(path){return new Promise((ok,bad)=>{const p=spawn("ffprobe",["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",path]);let s="";p.stdout.on("data",d=>s+=d);p.on("error",bad);p.on("close",c=>c===0?ok(Number(s.trim())):bad(new Error("ffprobe failed for "+path)));});}
function captionsFor(text,duration){const sentences=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)??[text];const weights=sentences.map(s=>Math.max(1,tokens(s).size));const total=weights.reduce((a,b)=>a+b,0);let cursor=0;return sentences.map((s,i)=>{const start=cursor;cursor+=duration*weights[i]/total;return {startSeconds:Number(start.toFixed(2)),endSeconds:Number(cursor.toFixed(2)),text:s.trim()};});}
async function main(){
 await mkdir("public/assets/archive",{recursive:true});await mkdir("public/assets/narration",{recursive:true});await mkdir("public/project",{recursive:true});await mkdir("out",{recursive:true});
 const source=JSON.parse(await readFile("data/offline-package/blueprint.json","utf8"));
 const narration=await readFile("data/offline-package/script.txt","utf8");
 const pool=await getArchivePool();
 if(pool.length<3)throw new Error("Only "+pool.length+" reusable-license archival images found; refusing to fill a historical documentary with unrelated stock imagery.");
 const used=new Set(),assets=[],scenes=[];
 for(let i=0;i<source.scenes.length;i++){
  const original=source.scenes[i],text=original.narration?.trim();
  if(!text)throw new Error("Scene "+original.id+" has no narration.");
  const ranked=pool.map(item=>({item,score:score(original.visualQuery,item)})).sort((a,b)=>b.score-a.score);
  let picked=ranked.find(x=>!used.has(x.item.title))??ranked[0];
  if(!picked)throw new Error("No archive asset available for "+original.id);
  used.add(picked.item.title);
  const ext=/\.png/i.test(picked.item.title)?".png":".jpg";
  const filename="scene-"+String(i+1).padStart(2,"0")+ext;
  const imagePath=resolve("public/assets/archive",filename);
  await downloadImage(picked.item,imagePath);
  const audioPath=resolve("public/assets/narration","scene-"+String(i+1).padStart(2,"0")+".wav");
  await run("piper",["--model",voice,"--output_file",audioPath],text);
  const audioDuration=await probeDuration(audioPath);
  const durationSeconds=Number((audioDuration+0.45).toFixed(2));
  const visualTitle=original.title.toUpperCase();
  const isGraphic=i===0||i===11;
  scenes.push({
   id:original.id,durationSeconds,
   visual:{kind:isGraphic?"image":"image",src:"/assets/archive/"+filename,background:"#111820",accent:"#D8A35D",eyebrow:"BOSTON • JANUARY 1919",title:visualTitle,subtitle:i===0?"THE GREAT MOLASSES FLOOD":(i===11?"AN INDUSTRIAL SAFETY FAILURE":"A DOCUMENTED HISTORICAL ACCOUNT")},
   style:{fontFamily:"Arial, sans-serif",titleColor:"#F4F1E8",captionColor:"#FFFFFF",titleSize:62,titleAlign:"left",titleTop:95},
   motion:{enter:"rise-fade",scaleFrom:1.10},
   transition:{kind:i===0?"fade":"cut",durationFrames:12},
   audio:[{src:"/assets/narration/scene-"+String(i+1).padStart(2,"0")+".wav",startSeconds:0,durationSeconds:audioDuration,volume:1,fadeInSeconds:.05,fadeOutSeconds:.12}],
   captions:captionsFor(text,audioDuration),
   narration:text,
   assetId:"commons-"+i,
   visualEvidence:{title:picked.item.title,sourcePage:picked.item.sourcePage,license:picked.item.license}
  });
  assets.push({assetId:"commons-"+i,localPath:imagePath,source:"Wikimedia Commons",sourceUrl:picked.item.sourcePage,creator:picked.item.artist||"See Commons file page",credit:picked.item.credit||"",licenseReference:picked.item.license+" — "+picked.item.licenseUrl,downloadUrl:picked.item.originalUrl,description:picked.item.description});
 }
 const total=scenes.reduce((a,s)=>a+s.durationSeconds,0);
 if(total>178)throw new Error("Offline narration is "+total.toFixed(1)+" seconds, exceeding the 178-second production budget.");
 const project={title:source.title,schemaVersion:1,status:"offline_render_ready",format:"1920x1080, 30fps, English narration",targetDurationSeconds:total,hardMaximumSeconds:180,scenes,assets,voice:{engine:"Piper TTS",model:"en_US-lessac-medium",modelLicense:"MIT",modelSource:"https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/lessac/medium"}};
 await writeFile("public/project/blueprint.json",JSON.stringify(project,null,2)+"\n");
 await writeFile("public/project/props.json",JSON.stringify({scenes:scenes.map(({narration,assetId,visualEvidence,...scene})=>scene)},null,2)+"\n");
 await writeFile("public/project/ASSET-REGISTER.json",JSON.stringify(assets,null,2)+"\n");
 await writeFile("public/project/script.txt",scenes.map(s=>s.narration).join("\n\n")+"\n");
 await writeFile("public/project/research.json",await readFile("data/offline-package/research.json","utf8"));
 await writeFile("public/project/SOURCES.md",await readFile("data/offline-package/SOURCES.md","utf8"));
 await writeFile("public/project/production-status.txt",`Offline documentary prepared.\nNarration: Piper TTS en_US-lessac-medium (MIT model).\nVisuals: ${assets.length} license-filtered Wikimedia Commons archive files; each scene has provenance in ASSET-REGISTER.json.\nDuration: ${total.toFixed(1)} seconds.\nNo paid OpenAI API was used.\n`);
 console.log(JSON.stringify({status:"ready_to_render",archiveAssets:assets.length,scenes:scenes.length,durationSeconds:total,voice:"Piper en_US-lessac-medium"},null,2));
}
main().catch(e=>{console.error(e.stack??e.message);process.exitCode=1;});
