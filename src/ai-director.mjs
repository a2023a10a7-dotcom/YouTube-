import {writeFile,mkdir,readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {acquirePexelsClip} from "./asset-acquisition.mjs";
import {synthesizeNarration} from "./voiceover.mjs";

const SYSTEM=`You are an experienced documentary film director and editor. Create a detailed, factual scene-by-scene visual blueprint for an English-language YouTube documentary for a Western audience. Never fabricate facts. Use scene footage query descriptions that specify real-world cinematic imagery and camera framing. Never request reference-video footage, copyrighted movie footage, or named creators' protected works. Avoid generic repeated stock search terms. Output JSON only with {title,fps,scenes}. Each scene: {id,durationSeconds,narration,visualQuery,visual:{kind:"video",src:""},motion:{enter:"rise-fade"|"fade"|"none",scaleFrom:number},transition:{kind:"fade"|"cut"|"wipe"|"slide"|"zoom",durationFrames:number},style:{fontFamily:string,titleColor:string,captionColor:string,titleSize:number,titleAlign:"left"|"center"|"right",titleTop:number},captions:[{startSeconds,endSeconds,text}],audio:[]}. Captions are short readable phrases timed within the scene; narration must be original. Include visualQuery for every scene. Keep scene durations between 4 and 12 seconds.`;
export function validateDirectorOutput(data){
 if(!data||!Array.isArray(data.scenes)||!data.scenes.length)throw new Error("Director returned no scenes.");
 for(const [i,s] of data.scenes.entries()){
  if(!s.id||typeof s.narration!=="string"||!s.narration.trim()||!s.visualQuery)throw new Error(`Scene ${i+1} missing id, narration, or visual query`);
  if(!Number.isFinite(s.durationSeconds)||s.durationSeconds<4||s.durationSeconds>12)throw new Error(`Scene ${i+1} duration must be 4–12 seconds`);
  s.id=String(s.id).replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,60);
  s.visual={kind:"video",src:"",title:s.visual?.title,subtitle:s.visual?.subtitle,eyebrow:s.visual?.eyebrow};
  s.transition={kind:["fade","cut","wipe","slide","zoom"].includes(s.transition?.kind)?s.transition.kind:"fade",durationFrames:Math.max(0,Math.min(60,s.transition?.durationFrames??12))};
  s.style={fontFamily:String(s.style?.fontFamily??"Arial, sans-serif"),titleColor:String(s.style?.titleColor??"#F4F7FB"),captionColor:String(s.style?.captionColor??"#FFFFFF"),titleSize:Math.max(24,Math.min(140,Number(s.style?.titleSize??72))),titleAlign:["left","center","right"].includes(s.style?.titleAlign)?s.style.titleAlign:"left",titleTop:Math.max(100,Math.min(800,Number(s.style?.titleTop??300)))};
  s.audio=[];
  s.captions=(s.captions??[]).map(c=>({...c,startSeconds:Math.max(0,c.startSeconds),endSeconds:Math.min(s.durationSeconds,c.endSeconds)})).filter(c=>c.endSeconds>c.startSeconds);
 }
 return data;
}
export async function generateDirectorBlueprint({script,referenceStyleProfile=null,apiKey,model="gpt-4.1-mini",fetchImpl=fetch}){
 if(!apiKey)throw new Error("OPENAI_API_KEY is missing.");
 const response=await fetchImpl("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:.6,response_format:{type:"json_object"},messages:[{role:"system",content:SYSTEM},{role:"user",content:`Turn this documentary script into scenes. Keep facts, arrange visuals to match narration. If partial thumbnail style observations are provided, use cautiously for typography, color, and composition; do not infer full-video pacing, transitions, motion or audio.\n\nSTYLE EVIDENCE: ${JSON.stringify(referenceStyleProfile)}\n\nSCRIPT:\n${script}`} ]})});
 if(!response.ok)throw new Error(`AI Director API error HTTP ${response.status}: ${await response.text()}`);
 const body=await response.json();const raw=body.choices?.[0]?.message?.content;
 if(!raw)throw new Error("AI Director response contained no JSON content.");
 return validateDirectorOutput(JSON.parse(raw));
}
export async function createProductionProject({script,openaiKey,pexelsKey,outputDir="public/project",model,fetchImpl=fetch}){
 let referenceStyleProfile=null;try{referenceStyleProfile=JSON.parse(await readFile("data/REFERENCE-STYLE-PROFILE.json","utf8"));}catch{}
 const blueprint=await generateDirectorBlueprint({script,referenceStyleProfile,apiKey:openaiKey,model,fetchImpl});
 const assetRecords=[];
 for(const scene of blueprint.scenes){
  const asset=await acquirePexelsClip({query:scene.visualQuery,apiKey:pexelsKey,outputDirectory:resolve("public/assets"),fetchImpl});
  scene.visual.src=asset.publicPath;
  assetRecords.push(asset);
  const voice=await synthesizeNarration({text:scene.narration,apiKey:openaiKey,voice:process.env.TTS_VOICE??"alloy",outputPath:resolve("public/assets","narration-"+scene.id+".mp3"),fetchImpl});
  scene.audio=[{src:"/assets/narration-"+scene.id+".mp3",volume:1,fadeInSeconds:.08,fadeOutSeconds:.15}];
  assetRecords.push({assetId:"voice-"+scene.id,source:"OpenAI TTS",sourceUrl:"https://platform.openai.com/docs/guides/text-to-speech",licenseReference:"Review applicable OpenAI API terms before publishing",localPath:voice.path,publicPath:scene.audio[0].src,voice:voice.voice,model:voice.model,bytes:voice.bytes});
 }
 const manifest={title:blueprint.title,createdAt:new Date().toISOString(),scenes:blueprint.scenes.map(s=>({id:s.id,durationSeconds:s.durationSeconds,narration:s.narration,visualQuery:s.visualQuery,visual:s.visual,motion:s.motion,transition:s.transition,captions:s.captions,audio:s.audio})),assets:assetRecords};
 await mkdir(outputDir,{recursive:true});
 await writeFile(resolve(outputDir,"blueprint.json"),JSON.stringify(manifest,null,2)+"\n");
 await writeFile(resolve(outputDir,"props.json"),JSON.stringify({scenes:manifest.scenes},null,2)+"\n");
 await writeFile(resolve(outputDir,"script.txt"),script+"\n");
 return manifest;
}
async function cli(){
 const input=process.argv[2];if(!input){console.error("Usage: OPENAI_API_KEY=... PEXELS_API_KEY=... node src/ai-director.mjs script.txt");process.exitCode=2;return;}
 const script=await readFile(input,"utf8");
 const project=await createProductionProject({script,openaiKey:process.env.OPENAI_API_KEY,pexelsKey:process.env.PEXELS_API_KEY,model:process.env.OPENAI_MODEL});
 console.log(`Created ${project.scenes.length} scenes with ${project.assets.length} media assets, including generated narration.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)cli().catch(e=>{console.error(e.message);process.exitCode=1;});
