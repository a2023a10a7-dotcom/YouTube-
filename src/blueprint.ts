export type CaptionCue = {startSeconds:number; endSeconds:number; text:string};
export type AudioLayer = {src:string; startSeconds?:number; durationSeconds?:number; volume?:number; loop?:boolean; fadeInSeconds?:number; fadeOutSeconds?:number};
export type Soundtrack = {src:string; volume?:number; duckingVolume?:number; fadeInSeconds?:number; fadeOutSeconds?:number};
export type SceneStyle = {fontFamily?:string; titleColor?:string; captionColor?:string; titleSize?:number; titleAlign?:"left"|"center"|"right"; titleTop?:number};
export type Visual =
 | {kind:"graphic"; background:string; accent:string; eyebrow?:string; title:string; subtitle?:string}
 | {kind:"video"|"image"; src:string; background?:string; accent?:string; eyebrow?:string; title?:string; subtitle?:string};
export type SceneBlueprint = {
 id:string; durationSeconds:number; visual:Visual; style?:SceneStyle;
 motion?:{enter?:"rise-fade"|"fade"|"none";exit?:"fade"|"none";scaleFrom?:number};
 transition?:{kind:"fade"|"cut"|"wipe"|"slide"|"zoom";durationFrames?:number};
 audio?:AudioLayer[]; captions?:CaptionCue[];
};
export const demoBlueprint:SceneBlueprint[]=[
 {id:"opening",durationSeconds:5,visual:{kind:"graphic",background:"#080D18",accent:"#7CE7D4",eyebrow:"THE HIDDEN ENGINE",title:"THE WORLD\nIN NUMBERS",subtitle:"A visual story, built frame by frame"},motion:{enter:"rise-fade",exit:"fade",scaleFrom:1.04},transition:{kind:"fade",durationFrames:12},audio:[],captions:[]},
 {id:"chapter",durationSeconds:5,visual:{kind:"graphic",background:"#080D18",accent:"#F5C66A",eyebrow:"CHAPTER 01",title:"EVERY NUMBER\nTELLS A STORY",subtitle:"Data becomes meaningful when we see the pattern."},motion:{enter:"rise-fade",exit:"fade",scaleFrom:1.04},transition:{kind:"fade",durationFrames:12},audio:[],captions:[]},
 {id:"outro",durationSeconds:5,visual:{kind:"graphic",background:"#080D18",accent:"#9DA8FF",eyebrow:"THE BIG PICTURE",title:"LOOK CLOSER.\nTHINK BIGGER.",subtitle:"A first render pipeline — the foundation for real documentaries."},motion:{enter:"rise-fade",exit:"fade",scaleFrom:1.04},transition:{kind:"fade",durationFrames:12},audio:[],captions:[]}
];
