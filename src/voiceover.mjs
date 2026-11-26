import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
export async function synthesizeNarration({text,apiKey,voice="alloy",outputPath,fetchImpl=fetch}){
 if(!apiKey)throw new Error("OPENAI_API_KEY required for voice generation.");
 if(!text?.trim())throw new Error("Narration text is empty.");
 const response=await fetchImpl("https://api.openai.com/v1/audio/speech",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4o-mini-tts",voice,input:text,format:"mp3"})});
 if(!response.ok)throw new Error(`TTS API error HTTP ${response.status}: ${await response.text()}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 const path=resolve(outputPath);await mkdir(resolve(path,".."),{recursive:true});await writeFile(path,bytes);
 return {path,bytes:bytes.length,model:"gpt-4o-mini-tts",voice};
}
