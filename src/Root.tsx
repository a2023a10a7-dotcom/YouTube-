import React from "react";
import {Composition} from "remotion";
import {Documentary} from "./Documentary";
import {demoBlueprint,SceneBlueprint,Soundtrack} from "./blueprint";

type Props={scenes?:SceneBlueprint[];soundtrack?:Soundtrack};
const getScenes=(props:Props)=>props.scenes?.length?props.scenes:demoBlueprint;
export const RemotionRoot:React.FC=()=> <Composition id="Documentary" component={Documentary} defaultProps={{scenes:demoBlueprint}} durationInFrames={360} fps={24} width={1920} height={1080} calculateMetadata={({props})=>({durationInFrames:Math.max(1,Math.ceil(getScenes(props as Props).reduce((sum,s)=>sum+s.durationSeconds,0)*30))})}/>;
