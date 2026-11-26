import React from "react";
import {AbsoluteFill, Audio, Img, Sequence, Video, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {demoBlueprint, SceneBlueprint} from "./blueprint";

const secondsToFrames=(seconds:number,fps:number)=>Math.round(seconds*fps);

const SceneView:React.FC<{scene:SceneBlueprint;index:number;start:number}> = ({scene,index,start})=>{
 const frame=useCurrentFrame(); const {fps,durationInFrames}=useVideoConfig();
 const length=secondsToFrames(scene.durationSeconds,fps);
 const transitionFrames=Math.min(scene.transition?.durationFrames??0,Math.floor(length/3));
 const isFade=scene.transition?.kind==="fade";
 const opacity=isFade?interpolate(frame,[0,transitionFrames,length-transitionFrames,length],[0,1,1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"}):1;
 const transitionProgress=interpolate(frame,[0,Math.max(1,transitionFrames)],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
 const transitionTransform=scene.transition?.kind==="slide"?`translateX(${interpolate(frame,[0,Math.max(1,transitionFrames)],[100,0],{extrapolateRight:"clamp"})}%)`:scene.transition?.kind==="zoom"?`scale(${interpolate(frame,[0,Math.max(1,transitionFrames)],[1.18,1],{extrapolateRight:"clamp"})})`:"none";
 const transitionClip=scene.transition?.kind==="wipe"?`inset(0 ${100-transitionProgress*100}% 0 0)`:"none";
 const entrance=scene.motion?.enter==="rise-fade";
 const introOpacity=entrance?interpolate(frame,[0,Math.min(24,length)],[0,1],{extrapolateRight:"clamp"}):1;
 const rise=entrance?interpolate(frame,[0,24],[45,0],{extrapolateRight:"clamp"}):0;
 const scaleFrom=scene.motion?.scaleFrom??1;
 const zoom=interpolate(frame,[0,length],[scaleFrom,1],{extrapolateRight:"clamp"});
 const visual=scene.visual;
 const accent=visual.accent??"#7CE7D4";
 const background=visual.background??"#080D18";
 return <AbsoluteFill style={{background,color:"#F4F7FB",overflow:"hidden",opacity,transform:transitionTransform,clipPath:transitionClip}}>
  {visual.kind==="video" && <Video src={visual.src} style={{width:"100%",height:"100%",objectFit:"cover",transform:`scale(${zoom})`}} />}
  {visual.kind==="image" && <Img src={visual.src} style={{width:"100%",height:"100%",objectFit:"cover",transform:`scale(${zoom})`}} />}
  {visual.kind==="graphic" && <AbsoluteFill style={{background}}>
    <AbsoluteFill style={{opacity:.16,backgroundImage:"linear-gradient(rgba(124,231,212,.16) 1px, transparent 1px),linear-gradient(90deg, rgba(124,231,212,.16) 1px, transparent 1px)",backgroundSize:"80px 80px",transform:`scale(${zoom})`}} />
    <div style={{position:"absolute",width:760,height:760,borderRadius:"50%",right:-180,top:-240,border:`1px solid ${accent}55`,boxShadow:`0 0 160px ${accent}22`}} />
  </AbsoluteFill>}
  {visual.eyebrow && <div style={{position:"absolute",left:130,top:105,fontSize:22,letterSpacing:7,color:accent,fontWeight:700,opacity:introOpacity}}>●  {visual.eyebrow}</div>}
  {visual.title && <div style={{position:"absolute",left:125,top:300,opacity:introOpacity,transform:`translateY(${rise}px)`,fontSize:scene.style?.titleSize??112,lineHeight:1.02,fontWeight:800,letterSpacing:-5,whiteSpace:"pre-line",maxWidth:1300,fontFamily:scene.style?.fontFamily??"Arial, sans-serif",color:scene.style?.titleColor??"#F4F7FB",textAlign:scene.style?.titleAlign??"left",top:scene.style?.titleTop??300,textShadow:"0 4px 35px #0008"}}>{visual.title}</div>}
  {visual.subtitle && <div style={{position:"absolute",left:135,top:650,fontSize:32,color:"#AAB5C8",opacity:introOpacity,maxWidth:1500}}>{visual.subtitle}</div>}
  {scene.captions?.map((cue,i)=>{const a=secondsToFrames(cue.startSeconds,fps),b=secondsToFrames(cue.endSeconds,fps); return frame>=a&&frame<b?<div key={i} style={{position:"absolute",bottom:155,left:180,right:180,textAlign:"center",fontSize:scene.style?.titleSize?Math.max(24,scene.style.titleSize*.38):42,fontFamily:scene.style?.fontFamily??"Arial, sans-serif",color:scene.style?.captionColor??"#FFFFFF",fontWeight:700,textShadow:"0 3px 8px #000",background:"#0007",padding:"14px 24px",borderRadius:10}}>{cue.text}</div>:null})}
  {scene.audio?.map((layer,i)=>{
    const audioStart=secondsToFrames(layer.startSeconds??0,fps);
    const audioLength=secondsToFrames(layer.durationSeconds??(scene.durationSeconds-(layer.startSeconds??0)),fps);
    const fadeIn=secondsToFrames(layer.fadeInSeconds??0,fps);
    const fadeOut=secondsToFrames(layer.fadeOutSeconds??0,fps);
    return <Sequence key={i} from={audioStart} durationInFrames={Math.max(1,Math.min(audioLength,length-audioStart))}>
      <Audio src={layer.src} loop={layer.loop} volume={(f)=>interpolate(f,[0,Math.max(1,fadeIn),Math.max(1,audioLength-fadeOut),audioLength],[0,layer.volume??1,layer.volume??1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"})}/>
    </Sequence>;
  })}
 </AbsoluteFill>;
};

export const Documentary:React.FC<{scenes?:SceneBlueprint[]}>=({scenes})=>{
 const {fps}=useVideoConfig();
 let cursor=0;
 const arranged=(scenes?.length?scenes:demoBlueprint).map(scene=>{const start=cursor;cursor+=secondsToFrames(scene.durationSeconds,fps);return {scene,start}});
 const frame=useCurrentFrame();
 const progress=Math.min(100,frame/(cursor-1)*100);
 const current=arranged.find(({start,scene})=>frame>=start&&frame<start+secondsToFrames(scene.durationSeconds,fps))?.scene;
 return <AbsoluteFill style={{fontFamily:"Arial, sans-serif",background:"#080D18"}}>
  {arranged.map(({scene,start},i)=><Sequence key={scene.id} from={start} durationInFrames={secondsToFrames(scene.durationSeconds,fps)}><SceneView scene={scene} index={i} start={start}/></Sequence>)}
  <div style={{position:"absolute",left:135,bottom:100,width:1650,height:3,background:"#263247"}}><div style={{height:3,width:`${progress}%`,background:current?.visual.accent??"#7CE7D4"}}/></div>
  <div style={{position:"absolute",right:135,bottom:125,fontSize:20,color:"#8391A8",letterSpacing:4}}>FIELD NOTES / {String(arranged.indexOf(arranged.find(x=>x.scene===current)??arranged[0])+1).padStart(3,"0")}</div>
  <div style={{position:"absolute",left:135,bottom:125,fontSize:20,color:"#8391A8"}}>INDEPENDENT DOCUMENTARY STUDIO</div>
 </AbsoluteFill>;
};
