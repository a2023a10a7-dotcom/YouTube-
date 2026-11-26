# Director's Blueprint contract

Renderer input is a scene-by-scene JSON file. Each scene describes timing, a visual (graphic, video, or image), motion, transition, audio layers, and timed captions. Media paths must point to acquired assets whose licenses/source are recorded; do not place unlicensed reference-video footage in a blueprint.

Implemented renderer fields: graphic background/accent/title/subtitle/eyebrow, scene duration, simple rise/fade motion, caption timing. Media, audio, transition types and additional motion are progressively supported; unsupported fields are rejected or ignored with explicit QA rather than claimed as rendered.

Blueprint should be produced by the AI Director from script beats, asset acquisition evidence, and (when available) reference style evidence. Each decision should include evidence/source, confidence, license information, and constraints.
