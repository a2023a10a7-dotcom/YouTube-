# Autonomous footage acquisition (first adapter)

The Pexels adapter searches a scene's descriptive query, ranks results by text-token relevance, selects the highest-resolution MP4, downloads it, and writes a provenance record. This is a deterministic starter selector, not a semantic vision model. It requires a `PEXELS_API_KEY` environment secret and does not contain credentials.

Call from a Node service:
```js
import {acquirePexelsClip} from "./src/asset-acquisition.mjs";
const asset=await acquirePexelsClip({query:"storm clouds over ocean",apiKey:process.env.PEXELS_API_KEY});
```

Before publishing, verify the current provider terms, clip rights, creator/source record, and usage constraints. Never use reference video footage as source material. Asset provenance must accompany the project.
