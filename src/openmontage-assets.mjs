import {readFile,writeFile,mkdir,copyFile} from "node:fs/promises";
import {resolve,relative,basename} from "node:path";
import {spawn} from "node:child_process";

const runSearch=(request,outputDir)=>new Promise((resolveResult,reject)=>{
 const input=resolve("data/openmontage-asset-queries.json");
 writeFile(input,JSON.stringify(request,null,2)).then(()=>{
  const child=spawn(process.env.PYTHON??"python3",["scripts/openmontage_asset_search.py",input,outputDir],{stdio:["ignore","pipe","pipe"]});
  let stdout="",stderr="";child.stdout.on("data",d=>stdout+=d);child.stderr.on("data",d=>stderr+=d);
  child.on("error",reject);child.on("close",code=>{if(code!==0)return reject(new Error("OpenMontage asset retrieval failed: "+stderr));try{resolveResult(JSON.parse(stdout));}catch(e){reject(new Error("OpenMontage returned invalid asset JSON: "+e.message));}});
 }).catch(reject);
});

async function selectClip({scene,candidates,apiKey,model,fetchImpl}){
 const viable=[];
 for(const c of candidates){if(!c.thumbnail)continue;try{const b=await readFile(c.thumbnail);viable.push({...c,dataUrl:"data:image/jpeg;base64,"+b.toString("base64")});}catch{}}
 if(!viable.length)throw new Error("No inspectable OpenMontage thumbnails for scene "+scene.id);
 const content=[{type:"text",text:"You are the documentary footage editor. Select the single best clip for this scene based on actual thumbnail evidence, query relevance, cinematic composition and shot variety. Do not prefer a source without provenance. Return JSON only: {clip_id,reason}. Scene: "+JSON.stringify({id:scene.id,narration:scene.narration,query:scene.visualQuery})+" Candidates: "+JSON.stringify(viable.map(c=>({clip_id:c.clip_id,source:c.source,source_url:c.source_url,license:c.license,duration:c.duration,width:c.width,height:c.height,source_tags:c.source_tags})))}];
 for(const c of viable)content.push({type:"text",text:"Candidate "+c.clip_id+" from "+c.source+":"},{type:"image_url",image_url:{url:c.dataUrl,detail:"high"}});
 const res=await fetchImpl("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:0,response_format:{type:"json_object"},messages:[{role:"user",content}]})});
 if(!res.ok)throw new Error("AI footage selection failed HTTP "+res.status+": "+await res.text());
 const json=await res.json(),choice=JSON.parse(json.choices?.[0]?.message?.content??"{}");
 const picked=viable.find(c=>c.clip_id===choice.clip_id);
 if(!picked)throw new Error("AI selected an unknown clip for scene "+scene.id);
 return {...picked,selectionReason:choice.reason??"Selected by AI from inspected OpenMontage thumbnails."};
}

export async function acquireOpenMontageAssets({scenes,apiKey=process.env.OPENAI_API_KEY,model=process.env.OPENAI_MODEL??"gpt-4.1-mini",fetchImpl=fetch,outputDir="public/assets/openmontage"}){
 if(!apiKey)throw new Error("OPENAI_API_KEY is required for AI footage selection.");
 if(!Array.isArray(scenes)||!scenes.length)throw new Error("Director scenes are required.");
 const request={clipsPerQuery:3,timeoutSeconds:900,queries:scenes.map(s=>({query:s.visualQuery,slot_id:s.id,kind:"video"}))};
 await mkdir("data",{recursive:true});await mkdir(outputDir,{recursive:true});
 const result=await runSearch(request,resolve(outputDir));
 const clips=result.clips??[];
 const selected=[];
 for(const scene of scenes){
  const candidates=clips.filter(c=>c.slot_id===scene.id&&c.kind==="video"&&c.path&&c.source_url&&c.license);
  if(!candidates.length)throw new Error("OpenMontage found no license-attributed video candidates for scene "+scene.id);
  const picked=await selectClip({scene,candidates,apiKey,model,fetchImpl});
  const filename=basename(picked.path),target=resolve("public/assets/openmontage",filename);
  if(resolve(picked.path)!==target)await copyFile(picked.path,target);
  const publicPath="/assets/openmontage/"+filename;
  scene.visual={...scene.visual,kind:"video",src:publicPath};
  selected.push({assetId:picked.clip_id,query:scene.visualQuery,source:picked.source,sourceUrl:picked.source_url,licenseReference:picked.license,creator:picked.creator??null,localPath:target,publicPath,thumbnail:picked.thumbnail??null,duration:picked.duration??null,dimensions:{width:picked.width??null,height:picked.height??null},selectionReason:picked.selectionReason});
 }
 return selected;
}
