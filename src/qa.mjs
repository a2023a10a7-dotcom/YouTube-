import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {access} from "node:fs/promises";
import {spawn} from "node:child_process";

export function validateProject(project){
 const errors=[],warnings=[];
 if(!Array.isArray(project.scenes)||!project.scenes.length)errors.push("Blueprint has no scenes");
 for(const scene of project.scenes??[]){
  if(!scene.id||!Number.isFinite(scene.durationSeconds)||scene.durationSeconds<=0)errors.push("Invalid scene timing/id: "+scene.id);
  if(!scene.visual?.src)errors.push("Scene has no visual source: "+scene.id);
  if(!(scene.captions??[]).length)warnings.push("No timed caption cues: "+scene.id);
  if(!(scene.audio??[]).length)warnings.push("No narration/audio layer: "+scene.id);
  for(const cue of scene.captions??[])if(cue.startSeconds<0||cue.endSeconds>scene.durationSeconds||cue.endSeconds<=cue.startSeconds)errors.push("Caption cue out of scene bounds: "+scene.id);
 }
 if(!Array.isArray(project.assets)||!project.assets.length)warnings.push("No source/licensing asset register.");
 for(const asset of project.assets??[])if(!asset.sourceUrl||!asset.licenseReference)errors.push("Asset missing provenance/license reference: "+asset.assetId);
 return {ok:errors.length===0,errors,warnings,sceneCount:project.scenes?.length??0,assetCount:project.assets?.length??0};
}
export async function verifyProjectAssetFiles(project){const missing=[];for(const asset of project.assets??[]){if(asset.localPath){try{await access(asset.localPath);}catch{missing.push(asset.localPath);}}}return missing;}\nexport async function inspectRenderedVideo(file,{requireAudio=false}={}){
 const result=await new Promise((resolveResult,reject)=>{const child=spawn("ffprobe",["-v","error","-show_entries","stream=codec_type,codec_name,width,height","-show_entries","format=duration","-of","json",file]);let out="",err="";child.stdout.on("data",d=>out+=d);child.stderr.on("data",d=>err+=d);child.on("error",reject);child.on("close",code=>code===0?resolveResult(JSON.parse(out)):reject(new Error(err||"ffprobe failed")));});
 const video=result.streams?.find(s=>s.codec_type==="video"),audio=result.streams?.find(s=>s.codec_type==="audio");
 const errors=[],warnings=[];
 if(!video)errors.push("Rendered file has no video stream");
 if(video&&(video.width!==1920||video.height!==1080))warnings.push("Video resolution is not 1920x1080");
 if(!audio){if(requireAudio)errors.push("No audio stream found in production render");else warnings.push("Render has no audio stream");}
 const duration=Number(result.format?.duration??0);if(!duration||duration<1)errors.push("Invalid or too-short output duration");
 return {ok:errors.length===0,errors,warnings,durationSeconds:duration,video,audio};
}
async function cli(){const path=process.argv[2]??"out/documentary.mp4";const projectPath=process.argv[3]??"public/project/blueprint.json";const project=JSON.parse(await readFile(projectPath,"utf8"));const projectQA=validateProject(project);const missingAssets=await verifyProjectAssetFiles(project);if(missingAssets.length){projectQA.ok=false;projectQA.errors.push(...missingAssets.map(p=>"Missing downloaded asset: "+p));}const videoQA=await inspectRenderedVideo(path,{requireAudio:true});const result={project:projectQA,render:videoQA,checkedAt:new Date().toISOString()};await writeFile("public/project/QA-REPORT.json",JSON.stringify(result,null,2)+"\n");console.log(JSON.stringify(result,null,2));if(!projectQA.ok||!videoQA.ok)process.exitCode=1;}
if(process.argv[1]&&import.meta.url===new URL("file://"+resolve(process.argv[1])).href)cli().catch(e=>{console.error(e.message);process.exitCode=1;});
