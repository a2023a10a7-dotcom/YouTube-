import {mkdir,writeFile,readFile,copyFile,stat} from "node:fs/promises";
import {spawn} from "node:child_process";
import {resolve,basename,extname} from "node:path";
import {generateAmbientScore} from "../src/ambient-score.mjs";

const inputDir=resolve("extracted");
const voiceModel=resolve("voices/en_US-lessac-medium.onnx");
const clean=(s)=>String(s??"").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
const tokens=(s)=>new Set(String(s??"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(x=>x.length>3&&!["this","that","with","from","into","over","after","before","scene","boston","historical","archival","photograph"].includes(x)));
const overlap=(query,candidate)=>{const q=tokens(query),c=tokens(candidate);let n=0;for(const x of q)if(c.has(x))n++;return n/Math.max(1,q.size);};
const allowed=(license)=>{const s=String(license??"").toLowerCase();return /(public domain|cc0|cc by|cc-by|creative commons attribution)/i.test(s)&&!/(non.?commercial|cc by-nc|cc-by-nc|no derivatives|cc by-nd|all rights reserved|unknown)/i.test(s);};
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
async function run(command,args,stdin){return new Promise((ok,bad)=>{const p=spawn(command,args,{stdio:["pipe","pipe","pipe"]});let out="",err="";p.stdout.on("data",d=>out+=d);p.stderr.on("data",d=>err+=d);p.on("error",bad);p.on("close",c=>c===0?ok({out,err}):bad(new Error(command+" exited "+c+": "+err.slice(-1600))));if(stdin!==undefined)p.stdin.end(stdin);else p.stdin.end();});}
async function probe(path){const {out}=await run("ffprobe",["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",path]);const n=Number(out.trim());if(!Number.isFinite(n)||n<=0)throw new Error("Could not read media duration: "+path);return n;}
async function download(url,path){for(let i=0;i<5;i++){try{const r=await fetch(url,{headers:{"User-Agent":"MichkattDocumentary/1.0 (https://github.com/a2023a10a7-dotcom/YouTube-)"}});if(r.status===429||r.status===503){await wait(1500*(i+1));continue;}if(!r.ok)throw new Error("HTTP "+r.status);const b=Buffer.from(await r.arrayBuffer());if(b.length<5000)throw new Error("download too small");await writeFile(path,b);return b.length;}catch(e){if(i===4)throw e;await wait(800*(i+1));}}throw new Error("download failed");}
function svgFor(scene,index){
 const title=clean(scene.title).replace(/[&<>]/g," ");
 const id=String(scene.scene_id||("S"+index)).toUpperCase();
 const colors=["#0B0A08","#17120E","#20150C","#101820"];
 const bg=colors[index%colors.length];
 const tank=["S01","S02","S03","S04"].includes(id);
 const wave=["S05","S06"].includes(id);
 const court=["S09","S10"].includes(id);
 const skyline=`<g fill="#34271B" stroke="#C9A96E" stroke-opacity=".45" stroke-width="3"><path d="M0 780h1920v300H0z"/><path d="M80 780V520h170v260M290 780V430h210v350M540 780V560h150v220M1250 780V480h180v300M1490 780V540h280v240"/><path d="M110 560h110m-110 60h110m-110 60h110M330 475h130m-130 65h130m-130 65h130M1290 525h100m-100 60h100m-100 60h100"/></g>`;
 const tankSvg=`<g transform="translate(760 150)"><rect x="0" y="100" width="420" height="520" rx="30" fill="#4C3320" stroke="#C9A96E" stroke-width="9"/><ellipse cx="210" cy="100" rx="210" ry="44" fill="#68431F" stroke="#C9A96E" stroke-width="8"/><path d="M20 250h380M20 380h380M20 510h380" stroke="#A97943" stroke-width="5" opacity=".8"/><path d="M60 620v90m300-90v90" stroke="#C9A96E" stroke-width="18"/></g>`;
 const waveSvg=`<path d="M0 760 Q220 650 420 760 T850 740 T1280 700 T1920 760 V1080H0Z" fill="#5A2D10" stroke="#C9A96E" stroke-width="8"/><path d="M0 850 Q300 730 560 860 T1120 830 T1600 810 T1920 860" fill="none" stroke="#D8A35D" stroke-width="12" opacity=".7"/>`;
 const courtSvg=`<g transform="translate(510 180)"><rect width="900" height="650" fill="#E8E1D2" stroke="#C9A96E" stroke-width="12"/><path d="M100 150h700M100 220h700M100 290h520M100 430h700M100 500h700" stroke="#6B5541" stroke-width="12" opacity=".65"/><rect x="560" y="340" width="220" height="100" fill="#8E1B1B" opacity=".9"/><text x="670" y="405" font-size="52" text-anchor="middle" fill="#F5EFE3" font-family="monospace">FILED</text></g>`;
 const art=tank? tankSvg : wave? waveSvg : court? courtSvg : `<g fill="none" stroke="#C9A96E" stroke-width="5" opacity=".8"><circle cx="960" cy="520" r="300"/><circle cx="960" cy="520" r="220"/><path d="M300 520h1320M960 150v740M520 250l880 540M1400 250L520 790"/></g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><radialGradient id="g"><stop stop-color="#5B3215"/><stop offset="1" stop-color="${bg}"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#g)"/>${skyline}${art}<rect x="70" y="70" width="1780" height="940" fill="none" stroke="#C9A96E" stroke-opacity=".25" stroke-width="2"/><text x="110" y="145" fill="#C9A96E" font-size="26" letter-spacing="8" font-family="monospace">MICHKATT / HISTORICAL VISUALIZATION / ${id}</text><text x="110" y="940" fill="#F5EFE3" font-size="54" font-family="Georgia,serif">${title}</text><text x="110" y="990" fill="#C9A96E" font-size="22" font-family="monospace">ILLUSTRATIVE GRAPHIC · NOT AN ARCHIVAL IMAGE</text></svg>`;
}
async function searchCommons(query,outputPath){
 const api=new URL("https://commons.wikimedia.org/w/api.php");
 for(const [k,v] of Object.entries({action:"query",generator:"search",gsrsearch:query,gsrnamespace:"6",gsrlimit:"12",prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"1920",format:"json"}))api.searchParams.set(k,v);
 const r=await fetch(api,{headers:{"User-Agent":"MichkattDocumentary/1.0 (https://github.com/a2023a10a7-dotcom/YouTube-)"}});if(!r.ok)throw new Error("Wikimedia search HTTP "+r.status);
 const data=await r.json();const pages=Object.values(data.query?.pages??{}).map(p=>{const info=p.imageinfo?.[0],meta=info?.extmetadata??{};const license=clean(meta.LicenseShortName?.value);return {title:p.title,info,license,description:clean(meta.ImageDescription?.value),artist:clean(meta.Artist?.value),licenseUrl:meta.LicenseUrl?.value??"",sourceUrl:"https://commons.wikimedia.org/wiki/"+encodeURIComponent(p.title.replaceAll(" ","_"))};}).filter(x=>x.info?.thumburl&&allowed(x.license)&&Math.max(x.info.width??0,x.info.thumbwidth??0)>=700);
 const best=pages.map(p=>({...p,score:overlap(query,p.title+" "+p.description)})).sort((a,b)=>b.score-a.score||((b.info.width??0)-(a.info.width??0)))[0];
 if(!best||best.score<0.04)return null;
 const ext=extname(new URL(best.info.thumburl).pathname)||".jpg";const path=outputPath+ext;
 await download(best.info.thumburl,path);
 return {path,kind:"image",source:"Wikimedia Commons",sourceUrl:best.sourceUrl,license:best.license+" — "+best.licenseUrl,creator:best.artist||"See Commons file page",title:best.title,score:best.score};
}
function overlayCues(scene){
 const start=Number(scene.timing?.start_s??0),duration=Number(scene.timing?.duration_s??0);
 return (scene.text_overlays??[]).map(o=>({startSeconds:Math.max(0,Number(o.start_s??start)-start),endSeconds:Math.min(duration,Number(o.end_s??(start+duration))-start),text:clean(o.text)})).filter(o=>o.text&&o.endSeconds>o.startSeconds);
}
async function main(){
 for(const p of ["public/assets/archive","public/assets/openmontage","public/assets/graphics","public/assets/narration","public/assets/music","public/project","out","data"])await mkdir(p,{recursive:true});
 const [blueText,manifestText,scriptText,researchText]=await Promise.all([
  readFile(resolve(inputDir,"director_blueprint.json"),"utf8"),
  readFile(resolve(inputDir,"asset_manifest.json"),"utf8"),
  readFile(resolve(inputDir,"documentary_screenplay.md"),"utf8"),
  readFile(resolve(inputDir,"research_analysis.md"),"utf8")
 ]);
 const director=JSON.parse(blueText),manifest=JSON.parse(manifestText);
 const scenes=director.scenes??[];
 if(scenes.length<3)throw new Error("Director blueprint contains fewer than three scenes.");
 const totalPlanned=Number(director.technical?.total_duration_s??scenes.reduce((n,s)=>n+Number(s.timing?.duration_s??0),0));
 if(totalPlanned>180)throw new Error("Director blueprint exceeds the 180-second delivery limit.");
 const byId=new Map((manifest.assets??[]).map(a=>[a.id,a]));
 const queries=scenes.map(s=>({query:[s.title,s.section,s.on_screen_description,...(s.layers??[]).map(l=>{const a=byId.get(l.asset_id);return [a?.title,a?.description,a?.prompt].filter(Boolean).join(" ");})].filter(Boolean).join(". ").slice(0,420),slot_id:s.scene_id,kind:"any"}));
 const requestPath=resolve("data/openmontage-asset-queries.json");
 await writeFile(requestPath,JSON.stringify({sources:["archive_org","wikimedia"],clipsPerQuery:3,timeoutSeconds:1200,queries},null,2));
 let clips=[];
 try{
  const {out,err}=await run("python3",["scripts/openmontage_asset_search.py",requestPath,resolve("data/openmontage-assets")]);
  const result=JSON.parse(out);clips=result.clips??[];
  console.log("OpenMontage retrieved "+clips.length+" candidate assets.");
  if(err.trim())console.log(err.trim().slice(-1200));
 }catch(error){console.log("OpenMontage retrieval returned no usable batch; continuing with license-filtered Wikimedia search: "+error.message);}
 const used=new Set(),assets=[],renderScenes=[];
 for(let i=0;i<scenes.length;i++){
  const s=scenes[i],sceneId=String(s.scene_id??("S"+String(i+1).padStart(2,"0")));
  const duration=Number(s.timing?.duration_s??0),narration=clean(s.narration?.text);
  if(!narration||!duration)throw new Error("Scene "+sceneId+" is missing narration or timing.");
  const query=queries[i].query;
  const candidates=clips.filter(c=>c.slot_id===sceneId&&c.path&&c.source_url&&allowed(c.license));
  const ranked=candidates.map(c=>({...c,score:overlap(query,[c.query,c.source_tags,c.source_id,c.source].join(" "))})).sort((a,b)=>b.score-a.score||((b.width??0)-(a.width??0)));
  let picked=ranked.find(c=>c.score>=0.04&&!used.has(c.clip_id));
  let mediaPath="",mediaKind="image",assetRecord=null;
  if(picked){
   used.add(picked.clip_id);
   const ext=extname(picked.path)|| (picked.kind==="video"?".mp4":".jpg");
   const filename=sceneId.toLowerCase()+"-"+basename(picked.path).replace(/[^a-zA-Z0-9._-]/g,"_");
   mediaPath=resolve("public/assets/openmontage",filename);
   await copyFile(picked.path,mediaPath);
   mediaKind=picked.kind==="video"?"video":"image";
   assetRecord={assetId:picked.clip_id,localPath:mediaPath,publicPath:"/assets/openmontage/"+filename,source:"OpenMontage / "+picked.source,sourceUrl:picked.source_url,creator:picked.creator??null,licenseReference:picked.license,query,selectionScore:picked.score};
  }else{
   const filename=sceneId.toLowerCase()+".jpg";
   const target=resolve("public/assets/archive",filename);
   try{
    const commons=await searchCommons(query,target);
    if(commons){mediaPath=commons.path;mediaKind="image";assetRecord={assetId:"commons-"+sceneId,localPath:mediaPath,publicPath:"/assets/archive/"+basename(mediaPath),source:commons.source,sourceUrl:commons.sourceUrl,creator:commons.creator,licenseReference:commons.license,query,selectionScore:commons.score};}
   }catch(error){console.log("Wikimedia fallback for "+sceneId+": "+error.message);}
  }
  if(!mediaPath){
   const filename=sceneId.toLowerCase()+".svg",path=resolve("public/assets/graphics",filename);
   await writeFile(path,svgFor(s,i));
   mediaPath=path;mediaKind="image";
   assetRecord={assetId:"original-graphic-"+sceneId,localPath:path,publicPath:"/assets/graphics/"+filename,source:"Original MICHKATT vector illustration",sourceUrl:"https://github.com/a2023a10a7-dotcom/YouTube-",creator:"MICHKATT production pipeline",licenseReference:"Original SVG artwork created by this repository; no third-party media license applies.",query,selectionScore:1};
  }
  assets.push(assetRecord);
  const voicePath=resolve("public/assets/narration",sceneId.toLowerCase()+".wav");
  await run("piper",["--model",voiceModel,"--output_file",voicePath],narration);
  const voiceDuration=await probe(voicePath);
  const firstLayer=s.layers?.[0],camera=firstLayer?.camera??{};
  const scaleFrom=Math.max(1,Math.min(mediaKind==="video"?1.12:1.08,Number(camera.from?.scale??1.04)));
  const captions=overlayCues(s);
  const transitionName=String(s.transition_out?.type??s.transition_out?.kind??"fade").toLowerCase();
  const transitionKind=["cut","fade","wipe","slide","zoom"].includes(transitionName)?transitionName:"fade";
  const src=assetRecord.publicPath;
  renderScenes.push({
   id:sceneId,durationSeconds:duration,
   visual:{kind:mediaKind,src,background:"#0B0A08",accent:"#C9A96E",eyebrow:mediaKind==="video"?"ARCHIVE FOOTAGE":(assetRecord.source.includes("Wikimedia")||assetRecord.source.includes("OpenMontage")?"ARCHIVAL / LICENSED":"ILLUSTRATIVE GRAPHIC"),title:s.title.toUpperCase(),subtitle:"BOSTON · JANUARY 15, 1919"},
   style:{fontFamily:"Georgia, serif",titleColor:"#F5EFE3",captionColor:"#F5EFE3",titleSize:72,titleAlign:"left",titleTop:115},
   motion:{enter:"rise-fade",scaleFrom},
   transition:{kind:transitionKind,durationFrames:transitionKind==="cut"?0:18},
   audio:[{src:"/assets/narration/"+sceneId.toLowerCase()+".wav",startSeconds:0,durationSeconds:Math.min(voiceDuration,duration),volume:1,fadeInSeconds:.08,fadeOutSeconds:.18}],
   captions
  });
  console.log(sceneId+": "+mediaKind+" / "+assetRecord.source+" / narration "+voiceDuration.toFixed(1)+"s");
 }
 const soundtrack=await generateAmbientScore({durationSeconds:totalPlanned,outputPath:"public/assets/music/original-ambient.wav"});
 const project={schemaVersion:1,status:"render_ready",title:director.project?.title??"MICHKATT Documentary",project:director.project,technical:{...director.technical,fps:24},visualIdentity:director.visual_identity,audioMix:director.audio_mix,sourceBlueprint:director,sourceAssetManifest:manifest,scenes:renderScenes,assets,soundtrack:{...soundtrack,src:soundtrack.publicPath,volume:.2,duckingVolume:.08,fadeInSeconds:3,fadeOutSeconds:4},researchFile:"research_analysis.md",screenplayFile:"documentary_screenplay.md",builtAt:new Date().toISOString(),productionEngine:"OpenMontage DirectClipSearch + Piper TTS + Remotion"};
 await writeFile("public/project/blueprint.json",JSON.stringify(project,null,2)+"\n");
 await writeFile("public/project/props.json",JSON.stringify({scenes:renderScenes,soundtrack:{src:soundtrack.publicPath,volume:.2,duckingVolume:.08,fadeInSeconds:3,fadeOutSeconds:4}},null,2)+"\n");
 await writeFile("public/project/ASSET-REGISTER.json",JSON.stringify(assets,null,2)+"\n");
 await writeFile("public/project/script.txt",scenes.map(s=>s.narration.text).join("\n\n")+"\n");
 await writeFile("public/project/research.json",JSON.stringify({title:director.project?.title??"",analysis:researchText},null,2)+"\n");
 await writeFile("public/project/SOURCES.md",researchText+"\n\n---\n\nOriginal asset manifest warning:\n"+String(manifest.warning??"") );
 await writeFile("public/project/original-screenplay.md",scriptText);
 await writeFile("public/project/production-status.txt","Prepared from the Telegram ZIP. OpenMontage DirectClipSearch was attempted first; all selected third-party media has source and license metadata. Missing source media is replaced only by original vector illustrations, never by fabricated archival photographs. Narration uses Piper TTS (local model). Music is an original procedural score. No OpenAI API was called.\n");
 console.log(JSON.stringify({status:"ready_to_render",title:project.title,scenes:renderScenes.length,assets:assets.length,archiveOrVideoAssets:assets.filter(a=>!a.source.includes("Original")).length,durationSeconds:totalPlanned,voice:"Piper en_US-lessac-medium",openmontageCandidates:clips.length},null,2));
}
main().catch(e=>{console.error(e.stack??e.message);process.exitCode=1;});
