import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const scenes = [
  {eyebrow:"THE HIDDEN ENGINE",title:"THE WORLD\nIN NUMBERS",sub:"A visual story, built frame by frame",accent:"#7CE7D4"},
  {eyebrow:"CHAPTER 01",title:"EVERY NUMBER\nTELLS A STORY",sub:"Data becomes meaningful when we see the pattern.",accent:"#F5C66A"},
  {eyebrow:"THE BIG PICTURE",title:"LOOK CLOSER.\nTHINK BIGGER.",sub:"A first render pipeline — the foundation for real documentaries.",accent:"#9DA8FF"}
];

export const Documentary: React.FC = () => {
 const frame = useCurrentFrame(); const {fps} = useVideoConfig();
 const sceneIndex = Math.min(2, Math.floor(frame / 150)); const local = frame - sceneIndex * 150; const scene = scenes[sceneIndex];
 const opacity = interpolate(local,[0,18,130,150],[0,1,1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
 const rise = interpolate(local,[0,35],[60,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
 const pulse = 1 + Math.sin(frame / fps * 1.5) * 0.025;
 return <AbsoluteFill style={{background:"#080D18",color:"#F4F7FB",fontFamily:"Arial, sans-serif",overflow:"hidden"}}>
   <AbsoluteFill style={{opacity:0.18,backgroundImage:"linear-gradient(rgba(124,231,212,.16) 1px, transparent 1px),linear-gradient(90deg, rgba(124,231,212,.16) 1px, transparent 1px)",backgroundSize:"80px 80px",transform:`scale(${pulse})`}} />
   <div style={{position:"absolute",width:760,height:760,borderRadius:"50%",right:-180,top:-240,border:`1px solid ${scene.accent}55`,boxShadow:`0 0 160px ${scene.accent}22`}} />
   <div style={{position:"absolute",left:130,top:105,fontSize:22,letterSpacing:7,color:scene.accent,fontWeight:700}}>●  {scene.eyebrow}</div>
   <div style={{position:"absolute",left:125,top:300,opacity,transform:`translateY(${rise}px)`,fontSize:112,lineHeight:1.02,fontWeight:800,letterSpacing:-5,whiteSpace:"pre-line",maxWidth:1300}}>{scene.title}</div>
   <div style={{position:"absolute",left:135,top:650,fontSize:32,color:"#AAB5C8",opacity}}>{scene.sub}</div>
   <div style={{position:"absolute",left:135,bottom:100,width:1650,height:3,background:"#263247"}}><div style={{height:3,width:`${(frame/449)*100}%`,background:scene.accent}}/></div>
   <div style={{position:"absolute",right:135,bottom:125,fontSize:20,color:"#8391A8",letterSpacing:4}}>FIELD NOTES  /  001</div>
   <div style={{position:"absolute",left:135,bottom:125,fontSize:20,color:"#8391A8"}}>INDEPENDENT DOCUMENTARY STUDIO</div>
 </AbsoluteFill>;
};
