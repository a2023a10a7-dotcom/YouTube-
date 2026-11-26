import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import {spawn} from "node:child_process";
import {pathToFileURL} from "node:url";
import {readReferenceProfile} from "./reference-videos.mjs";

const runAnalyzer=(url,index)=>new Promise((resolveResult,reject)=>{
 const dir=resolve("data/reference-analysis","reference-"+(index+1));
 const child=spawn(process.env.PYTHON??"python3",["scripts/openmontage_reference_analyzer.py",url,dir,"10"],{stdio:["ignore","pipe","pipe"]});
 let stdout="",stderr="";
 child.stdout.on("data",d=>stdout+=d);child.stderr.on("data",d=>stderr+=d);
 child.on("error",reject);
 child.on("close",code=>{if(code!==0)return reject(new Error("OpenMontage analysis failed for reference "+(index+1)+": "+stderr));try{resolveResult(JSON.parse(stdout));}catch(e){reject(new Error("Invalid analyzer JSON for reference "+(index+1)+": "+e.message));}});
});

async function analyzeFrames({brief,apiKey,model,fetchImpl}){
 const frames=(brief.keyframes??[]).slice(0,10);
 const images=[];
 for(const frame of frames){try{const bytes=await readFile(frame.path);images.push({timestamp:frame.timestamp,sceneIndex:frame.scene_index,dataUrl:"data:image/jpeg;base64,"+bytes.toString("base64")});}catch{}}
 const evidence={title:brief.source?.title??"",durationSeconds:brief.source?.duration_seconds??0,structure:brief.structure_analysis??{},audioEnergy:brief.style_profile?.audio_energy_profile??null,transcript:brief.narration_transcript?.full_text??"",keyframes:images.map(({timestamp,sceneIndex})=>({timestamp,sceneIndex}))};
 if(!images.length)throw new Error("OpenMontage did not extract readable keyframes. Cannot claim visual style analysis.");
 const content=[{type:"text",text:"Analyze this reference video for editing/style replication. Use only the supplied measured scene timing, transcript/audio-energy evidence and extracted keyframes. Return JSON: {contentSummary,styleProfile:{pacing,shotLanguage,cameraMotion,transitions,typography,colorLighting,audioSoundDesign,storyStructure},shotNotes:[{timestamp,sceneIndex,subject,subjectMotion,scene,spatialFraming,camera,overlays}],replicationGuidance,limitations}. For every property include summary, confidence 0..1, evidence with timestamps/scene indices, and limitations. Distinguish measured cut timing/audio energy from visual observations. Do not infer exact transitions between frames unless scene boundaries/keyframes support them. Never suggest reusing reference footage/audio. Evidence metadata: "+JSON.stringify(evidence)}];
 for(const item of images)content.push({type:"text",text:"Keyframe at "+item.timestamp+"s (scene "+item.sceneIndex+"):"},{type:"image_url",image_url:{url:item.dataUrl,detail:"high"}});
 const response=await fetchImpl("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:0,response_format:{type:"json_object"},messages:[{role:"user",content}]})});
 if(!response.ok)throw new Error("Reference vision analysis failed HTTP "+response.status+": "+await response.text());
 const json=await response.json(),raw=json.choices?.[0]?.message?.content;
 if(!raw)throw new Error("Reference vision analysis returned no content.");
 return JSON.parse(raw);
}

export async function analyzeReferenceProfile({profilePath="data/channel-profile.json",apiKey=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL??"gpt-4.1-mini",fetchImpl=fetch}={}){
 if(!apiKey)throw new Error("OPENAI_API_KEY is required for visual reference analysis.");
 const profile=await readReferenceProfile(profilePath);
 if(!profile||![3,5].includes(profile.references?.length))throw new Error("A saved profile with exactly 3 or 5 YouTube references is required.");
 const analyses=[];
 for(let i=0;i<profile.references.length;i++){
  const brief=await runAnalyzer(profile.references[i].url,i);
  const vision=await analyzeFrames({brief,apiKey,model,fetchImpl});
  analyses.push({videoId:profile.references[i].videoId,url:profile.references[i].url,analysis:{status:"analyzed",durationSeconds:brief.source?.duration_seconds??null,sceneCount:brief.structure_analysis?.total_scenes??null,pacingProfile:brief.structure_analysis?.pacing_profile??null,audioEnergy:brief.style_profile?.audio_energy_profile??null,transcriptAvailable:Boolean(brief.narration_transcript?.full_text),vision}});
 }
 const result={schemaVersion:2,status:"full_reference_analysis",analyzedAt:new Date().toISOString(),referenceCount:analyses.length,references:analyses,limitations:["Analysis is based on downloaded accessible reference media, extracted keyframes, scene detection, available transcript and audio-energy measurements.","Exact camera/lens settings and inaudible sound-design details cannot be guaranteed from sampled frames or energy measurements.","Reference footage and audio are style-only evidence and must never be reused in the produced video."]};
 const output=resolve("data/REFERENCE-STYLE-PROFILE.json");await mkdir("data",{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+"\n");
 profile.styleAnalysis=result;await writeFile(profilePath,JSON.stringify(profile,null,2)+"\n");
 return result;
}
async function main(){const result=await analyzeReferenceProfile();console.log("Analyzed "+result.referenceCount+" reference videos with OpenMontage VideoAnalyzer and visual evidence.");}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
