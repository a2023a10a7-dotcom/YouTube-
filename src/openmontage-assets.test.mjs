import test from "node:test";
import assert from "node:assert/strict";
import {acquireOpenMontageAssets} from "./openmontage-assets.mjs";

test("OpenMontage footage selection requires an AI key",async()=>{
 await assert.rejects(()=>acquireOpenMontageAssets({scenes:[{id:"scene-1",visualQuery:"historic harbor"}],apiKey:""}),/OPENAI_API_KEY/);
});

test("OpenMontage footage selection rejects an empty scene plan",async()=>{
 await assert.rejects(()=>acquireOpenMontageAssets({scenes:[],apiKey:"test"}),/scenes are required/);
});
