# Reference style evidence analysis

An optional vision-enabled AI analysis uses the public thumbnail URLs returned by YouTube oEmbed to assess only thumbnail composition, colors, typography and mood. Each observation includes confidence, evidence indices, and limitations.

This is **not video inspection**. It cannot establish edit rhythm, shot lengths, transitions, camera movement, in-video typography, full-video color grading, audio, narration, music or sound design. These categories remain unassessed. This adapter requires `OPENAI_API_KEY` and can be run after reference links are saved:
```
node src/reference-style-analysis.mjs data/channel-profile.json
```
