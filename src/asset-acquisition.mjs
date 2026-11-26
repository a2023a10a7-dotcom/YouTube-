import {mkdir,writeFile} from "node:fs/promises";
import {resolve,basename} from "node:path";

const API="https://api.pexels.com/videos/search";
const tokenSet=(s)=>new Set(String(s??"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(x=>x.length>2));
export function relevanceScore(query,candidate){
 const q=tokenSet(query), c=tokenSet([candidate.url,candidate.user?.name,candidate.tags?.join(" "),candidate.description].join(" "));
 if(!q.size)return 0;
 let score=0;for(const token of q)if(c.has(token))score++;
 return score/q.size;
}
export function choosePexelsVideo(query,videos){
 const sorted=[...videos].map(v=>({v,score:relevanceScore(query,v)})).sort((a,b)=>b.score-a.score);
 const winner=sorted[0]; if(!winner||winner.score<=0)return null;
 const files=(winner.v.video_files??[]).filter(f=>f.link&&f.file_type?.includes("mp4"));
 files.sort((a,b)=>(b.width??0)-(a.width??0));
 return files[0]?{video:winner.v,score:winner.score,file:files[0]}:null;
}
export async function acquirePexelsClip({query,apiKey,outputDirectory="public/assets",fetchImpl=fetch}){
 if(!apiKey)throw new Error("Pexels API key is required in PEXELS_API_KEY; never commit credentials.");
 const url=new URL(API);url.searchParams.set("query",query);url.searchParams.set("per_page","15");url.searchParams.set("orientation","landscape");
 const response=await fetchImpl(url,{headers:{Authorization:apiKey}});
 if(!response.ok)throw new Error(`Pexels search failed: HTTP ${response.status}`);
 const data=await response.json();const selected=choosePexelsVideo(query,data.videos??[]);
 if(!selected)throw new Error(`No relevant Pexels clip found for query: ${query}`);
 const download=await fetchImpl(selected.file.link);
 if(!download.ok)throw new Error(`Clip download failed: HTTP ${download.status}`);
 const bytes=Buffer.from(await download.arrayBuffer());
 await mkdir(outputDirectory,{recursive:true});
 const ext=selected.file.file_type?.includes("mp4")?"mp4":"bin";
 const filename=`pexels-${selected.video.id}.${ext}`;
 const path=resolve(outputDirectory,filename);
 await writeFile(path,bytes);
 const asset={
  assetId:`pexels-${selected.video.id}`,query,localPath:path,publicPath:`/assets/${filename}`,
  source:"Pexels",sourceUrl:selected.video.url,creator:selected.video.user?.name??null,
  creatorUrl:selected.video.user?.url??null,videoId:selected.video.id,
  selectedFile:{width:selected.file.width,height:selected.file.height,quality:selected.file.quality,fileType:selected.file.file_type},
  relevanceScore:selected.score,downloadedAt:new Date().toISOString(),
  licenseReference:"Pexels license: https://www.pexels.com/license/ (verify terms before publication)",
 };
 return asset;
}
