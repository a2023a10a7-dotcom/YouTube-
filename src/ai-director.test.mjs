import test from "node:test";import assert from "node:assert/strict";
import {validateDirectorOutput} from "./ai-director.mjs";
test("rejects incomplete scenes",()=>assert.throws(()=>validateDirectorOutput({scenes:[{id:"s"}]}),/missing/));
test("normalizes captions and defaults visual/audio fields",()=>{
 const result=validateDirectorOutput({scenes:[{id:"s",durationSeconds:6,narration:"line",visualQuery:"wildlife",captions:[{startSeconds:-2,endSeconds:8,text:"caption"}]}]});
 assert.equal(result.scenes[0].visual.kind,"video");assert.equal(result.scenes[0].visual.src,"");assert.equal(result.scenes[0].captions[0].startSeconds,0);assert.equal(result.scenes[0].captions[0].endSeconds,6);assert.deepEqual(result.scenes[0].audio,[]);
});
test("rejects scene duration out of bounds",()=>assert.throws(()=>validateDirectorOutput({scenes:[{id:"s",durationSeconds:20,narration:"ok",visualQuery:"x"}]}),/duration/));
