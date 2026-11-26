import {readFile,writeFile} from "node:fs/promises";
import {resolve,dirname} from "node:path";
import {mkdir} from "node:fs/promises";
const PROMPT="Analyze only the supplied YouTube thumbnail images, not video contents. Return JSON with observations for thumbnailComposition, thumbnailColor, thumbnailTypography, thumbnailVisualMood. Each property: {summary,confidence,evidence,limitations}. Confidence 0..1. Cite thumbnail index. Do not infer cuts, shot length, transitions, camera motion, narration, music, sound effects, or full-video grading from thumbnails. State that thumbnail analysis is not full video style analysis.";
export async function analyzeReferenceThumbnails({profile,apiKey,profilePath="data/channel-profile.json",model="gpt-4.1-mini",fetchImpl=fetch}){
 const refs=(profile.references??[]).filter(r=>r.metadata?.thumbnail_url);
 if(!refs.length)throw new Error("No available reference thumbnails in profile.");
 if(!apiKey)throw new Error("OPENAI_API_KEY missing for thumbnail analysis.");
 const content=[{type:"text",text:PROMPT+" Analyze these "+refs.length+" reference thumbnails:"},...refs.map((r,i)=>({type:"image_url",image_url:{url:r.metadata.thumbnail_url,detail:"high"}}))];
 const res=await fetchImpl("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:0,response_format:{type:"json_object"},messages:[{role:"user",content}]})});
 if(!res.ok)throw new Error("Thumbnail style API failed HTTP "+res.status+": "+await res.text());
 const json=await res.json();const result=JSON.parse(json.choices?.[0]?.message?.content??"{}");
 for(const key of Object.keys(result)){if(!result[key]?.summary||!Array.isArray(result[key]?.evidence))throw new Error("Missing evidence in thumbnail analysis for "+key);}
 const style={...profile.styleAnalysis,status:"partial_thumbnail_analysis",thumbnailAnalysis:result,unavailableEvidence:["full-video editing rhythm","cut and transition types","camera movement","shot composition outside thumbnails","audio/narration/music/sound design","full-video grading"]};
 profile.styleAnalysis=style;
 await writeFile(resolve("data/channel-profile.json"),JSON.stringify(profile,null,2)+"\n");
 await writeFile(resolve("data/REFERENCE-STYLE-PROFILE.json"),JSON.stringify(style,null,2)+"\n");
 const lines=["# Reference thumbnail style analysis","","**Status:** Partial analysis based on thumbnail images only.",""];
 for(const [key,value] of Object.entries(result)){lines.push("## "+key,"",value.summary,"","Confidence: "+value.confidence,"","Evidence: "+value.evidence.join(", "),"","Limitations: "+value.limitations.join("; "),"");}
 lines.push("## Not analyzed from thumbnails","","",...style.unavailableEvidence.map(x=>"- "+x),"");
 await writeFile(resolve(outputDir,"REFERENCE-STYLE-PROFILE.md"),lines.join("\n"));
 return style;
}
async function cli(){const path=process.argv[2]??"data/channel-profile.json";const profile=JSON.parse(await readFile(path,"utf8"));const style=await analyzeReferenceThumbnails({profile,apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL});console.log("Thumbnail-only analysis saved. Full-video analysis remains unavailable for "+style.unavailableEvidence.length+" categories.");}
if(process.argv[1]&&import.meta.url===new URL("file://"+resolve(process.argv[1])).href)cli().catch(e=>{console.error(e.message);process.exitCode=1;});
