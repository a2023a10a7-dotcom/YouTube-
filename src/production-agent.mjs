import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {createProductionProject} from "./ai-director.mjs";
const collectOutput=(response)=>{for(const item of response.output??[]){if(item.type==="message")for(const part of item.content??[])if(part.type==="output_text")return part.text;}return response.output_text??"";};
export async function researchTopic({topic,apiKey,model="gpt-6.2-astra",fetchImpl=fetch}){
 if(!apiKey)throw new Error("OPENAI_API_KEY missing for research.");
 const prompt="Research this documentary topic thoroughly for an English-language YouTube audience. Search the web. Return a concise evidence report: factual claims, dates, caveats, disagreements, and at least 6 reliable source URLs with titles. Prefer primary sources, government/university/museum/scientific sources and reputable journalism. Avoid fabricated citations. Topic: "+topic;
 const response=await fetchImpl("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model,tools:[{type:"web_search",search_context_size:"high"}],tool_choice:"required",include:["web_search_call.action.sources"],input:prompt})});
 if(!response.ok)throw new Error("Research API failed HTTP "+response.status+": "+await response.text());
 const result=await response.json(),text=collectOutput(result);
 const sources=[];
 for(const item of result.output??[])if(item.type==="web_search_call"&&item.action?.sources)for(const s of item.action.sources)sources.push({title:s.title??"",url:s.url??""});
 if(!text)throw new Error("Research response had no text.");
 const unique=[...new Map(sources.filter(s=>s.url).map(s=>[s.url,s])).values()];
 return {topic,createdAt:new Date().toISOString(),report:text,sources:unique,model,webSearchUsed:(result.output??[]).some(x=>x.type==="web_search_call")};
}
export async function writeDocumentaryScript({topic,research,apiKey,model="gpt-4.1-mini",fetchImpl=fetch}){
 const response=await fetchImpl("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:.55,messages:[{role:"system",content:"Write a compelling, natural English documentary narration for a Western YouTube audience. Target about 6-8 minutes. Start with a strong hook, build a clear narrative arc, use concrete imagery, avoid padding, and use only claims supported by the supplied research report. Do not invent facts or cite sources aloud. Include chapter transitions. Output only narration, no production directions."},{role:"user",content:"Topic: "+topic+"\\n\\nResearch notes with sources:\\n"+research.report+"\\n\\nSource URLs:\\n"+research.sources.map(s=>s.title+" — "+s.url).join("\\n")} ]})});
 if(!response.ok)throw new Error("Script-writing API failed HTTP "+response.status+": "+await response.text());
 const json=await response.json(),script=json.choices?.[0]?.message?.content?.trim();
 if(!script)throw new Error("Script writer returned no text.");
 return script;
}
export async function runProduction({topic,openaiKey,pexelsKey,outputDir="public/project",researchModel,scriptModel,fetchImpl=fetch}){
 const research=await researchTopic({topic,apiKey:openaiKey,model:researchModel,fetchImpl});
 const script=await writeDocumentaryScript({topic,research,apiKey:openaiKey,model:scriptModel,fetchImpl});
 const project=await createProductionProject({script,openaiKey,pexelsKey,outputDir,model:scriptModel,fetchImpl});
 project.research=research;
 await writeFile(resolve(outputDir,"research.json"),JSON.stringify(research,null,2)+"\n");
 await writeFile(resolve(outputDir,"SOURCES.md"),["# Research sources","",...research.sources.map(s=>"- ["+s.title+"]("+s.url+")"),"","## Research notes","",research.report,""].join("\n"));
 await writeFile(resolve(outputDir,"script.txt"),script+"\n");
 await writeFile(resolve(outputDir,"blueprint.json"),JSON.stringify(project,null,2)+"\n");
 return project;
}
async function cli(){const file=process.argv[2];if(!file){console.error("Usage: OPENAI_API_KEY=... PEXELS_API_KEY=... node src/production-agent.mjs topic.txt");process.exitCode=2;return;}const topic=(await readFile(file,"utf8")).trim();const project=await runProduction({topic,openaiKey:process.env.OPENAI_API_KEY,pexelsKey:process.env.PEXELS_API_KEY,researchModel:process.env.OPENAI_RESEARCH_MODEL,scriptModel:process.env.OPENAI_MODEL});console.log("Research and script complete. Generated "+project.scenes.length+" scenes and acquired "+project.assets.length+" media assets.");}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)cli().catch(e=>{console.error(e.message);process.exitCode=1;});
