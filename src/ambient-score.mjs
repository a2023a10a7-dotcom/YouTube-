import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
const chordSets=[[146.83,174.61,220.0],[116.54,146.83,174.61],[174.61,220.0,261.63],[130.81,164.81,196.0]];
export async function generateAmbientScore({durationSeconds,outputPath="public/assets/original-ambient.wav",sampleRate=24000}){
 if(!Number.isFinite(durationSeconds)||durationSeconds<5)throw new Error("Ambient score duration must be at least five seconds.");
 const count=Math.floor(durationSeconds*sampleRate),data=Buffer.alloc(count*4);
 const beat=60/72,bar=beat*4;
 for(let i=0;i<count;i++){
  const t=i/sampleRate,progress=t/durationSeconds;
  const fade=Math.min(1,t/4,(durationSeconds-t)/5);
  const chordIndex=Math.floor(t/(bar*2))%chordSets.length,notes=chordSets[chordIndex];
  const chordPhase=(t%(bar*2))/(bar*2);
  const swell=.72+.28*Math.sin(chordPhase*Math.PI);
  let sample=0;
  for(let n=0;n<notes.length;n++){
   const freq=notes[n];
   sample+=Math.sin(2*Math.PI*freq*t)*.12;
   sample+=Math.sin(2*Math.PI*freq*2.003*t)*.035;
   sample+=Math.sin(2*Math.PI*freq*.5*t)*.045;
  }
  const bass=notes[0]*.5;
  sample+=Math.sin(2*Math.PI*bass*t)*.1;
  // Soft, sparse high-note arpeggio accent on bar changes.
  const beatIndex=Math.floor(t/beat),beatPhase=(t%beat)/beat;
  if(beatIndex%8===0){const melody=notes[(beatIndex/8)%3|0]*2;sample+=Math.sin(2*Math.PI*melody*t)*.07*Math.exp(-beatPhase*5);}
  // Gentle stereo widening by a tiny phase offset in the high partials.
  const left=Math.max(-.8,Math.min(.8,sample*swell*fade));
  const right=Math.max(-.8,Math.min(.8,(sample+.018*Math.sin(2*Math.PI*notes[1]*1.001*t))*swell*fade));
  data.writeInt16LE(Math.round(left*32767),i*4);data.writeInt16LE(Math.round(right*32767),i*4+2);
 }
 const header=Buffer.alloc(44);header.write("RIFF",0);header.writeUInt32LE(36+data.length,4);header.write("WAVE",8);header.write("fmt ",12);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(sampleRate,24);header.writeUInt32LE(sampleRate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write("data",36);header.writeUInt32LE(data.length,40);
 const path=resolve(outputPath);await mkdir(resolve(path,".."),{recursive:true});await writeFile(path,Buffer.concat([header,data]));
 return {path,publicPath:"/assets/"+path.split(/[\\/]/).pop(),durationSeconds,sampleRate,channels:2,bytes:header.length+data.length,composition:"Original synthesized ambient pad progression; no third-party music"};
}
