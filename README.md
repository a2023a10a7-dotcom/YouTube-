# YouTube Agent — production workspace

The workflow has two modes: a 15-second technical demo, and a topic-only production path (requires API credentials).

## Production from a topic
1. Open [Actions → Documentary production pipeline](https://github.com/a2023a10a7-dotcom/YouTube-/actions/workflows/render-demo.yml).
2. Run the workflow and enter a topic in `production_script` (the field accepts a topic, not only a script).
3. Production mode requires the repository Actions secrets `OPENAI_API_KEY` and `PEXELS_API_KEY`. Optional `OPENAI_MODEL`, `OPENAI_RESEARCH_MODEL`, and `TTS_VOICE` customize models/voice.
4. It researches with web search, drafts narration, creates scenes, searches/downloads stock video, generates voiceover, renders, and runs QA. Artifacts include MP4, source register, research, and project files.

## Reference videos
Enter exactly 3 or 5 YouTube URLs in `reference_urls`. The profile saves URLs and available oEmbed metadata. If `OPENAI_API_KEY` is set, the workflow can analyze thumbnails only (composition/color/thumbnail typography/mood). It cannot infer full-video editing rhythm, transitions, motion, audio, or in-video grading from thumbnails. See [reference analysis limits](docs/REFERENCE-STYLE-ANALYSIS.md).

## Implemented renderer
Blueprint-driven Remotion supports video/image/graphic visuals, title styling, captions, fade/cut/wipe/slide/zoom transitions, voice/audio layers, looping and fades.

## Limits and safety
- Footage selection uses Pexels query results with a heuristic rank (text match when metadata exists, provider result order and resolution otherwise). It is not semantic vision selection.
- Source and license/usage references are recorded, but they still require review before monetized publication.
- No reference footage is downloaded or reused.
- Research citations are saved for editorial review; generated narration is not a guarantee of factual accuracy.
- Background music and sound-effects acquisition/mixing are not yet implemented.
- Production render has not been run with live API keys in this repository, so the complete workflow is not yet proven.
- The demo render is a technical sample, not a finished documentary.

See [production workflow](docs/PRODUCTION-AGENT.md), [Director's Blueprint](docs/DIRECTOR-BLUEPRINT.md), [asset acquisition](docs/ASSET-ACQUISITION.md), and [QA](docs/DIRECTOR-BLUEPRINT.md).
