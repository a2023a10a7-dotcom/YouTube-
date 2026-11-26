import test from "node:test";import assert from "node:assert/strict";
import {choosePexelsVideo,relevanceScore} from "./asset-acquisition.mjs";
test("scores relevance with query token overlap",()=>assert.equal(relevanceScore("ocean storm","storm over ocean"),1));
test("chooses relevant candidate and highest resolution mp4",()=>{
 const videos=[{id:1,url:"forest",tags:["forest"]},{id:2,url:"ocean waves",tags:["ocean","waves"],video_files:[{link:"low",width:640,file_type:"video/mp4"},{link:"high",width:1920,file_type:"video/mp4"}]}];
 const result=choosePexelsVideo("ocean waves",videos);assert.equal(result.video.id,2);assert.equal(result.file.link,"high");
});
test("does not select unrelated results",()=>assert.equal(choosePexelsVideo("deep space",[{url:"kitchen",tags:["food"]}]),null));
