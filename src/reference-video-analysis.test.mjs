import test from "node:test";
import assert from "node:assert/strict";
import {analyzeReferenceProfile} from "./reference-video-analysis.mjs";

test("reference analysis refuses to claim completion without an OpenAI key",async()=>{
 await assert.rejects(()=>analyzeReferenceProfile({apiKey:""}),/OPENAI_API_KEY/);
});
