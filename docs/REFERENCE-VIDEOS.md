# YouTube reference links — first implementation

The repository now has a small Node.js reference-profile manager.

## Commands

```sh
npm run references:help
node src/reference-videos.mjs save <URL-1> <URL-2> <URL-3>
node src/reference-videos.mjs save <URL-1> <URL-2> <URL-3> <URL-4> <URL-5>
npm run references:list
```

The save command accepts exactly three or five distinct HTTPS YouTube video URLs. It supports standard watch URLs, youtu.be, Shorts, embed, and live URL forms. It rejects other hosts, malformed IDs, and duplicate videos. Links are stored canonically in `data/channel-profile.json`.

For each URL the manager makes a best-effort request to YouTube's public oEmbed endpoint. Title, channel, and thumbnail are stored only when returned. A failed or unavailable response is recorded as such; it does not abort saving the other references.

## Important boundary

oEmbed supplies metadata, not the actual visual or audio content. This implementation does **not** analyze cuts, transitions, camera movement, typography, color grading, narration, music, or sound effects. It does not download reference videos or audio, bypass DRM, or reuse reference footage. The saved profile explicitly marks style analysis as pending and lists evidence that is unavailable.

The next required stages are an authorized visual/audio evidence provider, an evidence-backed style-profile analyzer, Director's Blueprint integration, renderer implementation, and rendered-video conformance tests. A metadata-only profile must never be presented as a completed style analysis.
