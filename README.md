# YouTube Agent — production workspace

This repository is the production workspace for an autonomous English-language documentary video agent. It currently contains a Remotion demo renderer and the first implementation of YouTube reference-link management.

## Add 3 or 5 YouTube reference videos

1. Open the repository's **Actions** tab.
2. Select **Render demo video**.
3. Choose **Run workflow**.
4. Paste exactly 3 or 5 YouTube video links into **reference_urls**, one link per line.
5. Start the workflow.

The workflow validates the links, attempts to resolve public YouTube oEmbed metadata, and uploads a `channel-reference-profile` artifact. It also renders and uploads the current demo MP4.

Supported link forms: standard YouTube watch URLs, youtu.be, Shorts, embed, and live URLs. Duplicate or invalid links are rejected.

## What this stage does — and does not do

- Saves canonical reference URLs and available title/channel/thumbnail metadata.
- Generates `REFERENCE-STYLE-PROFILE.json` and `.md` with evidence and confidence fields.
- Marks visual/audio style attributes as **not assessed** until authorized evidence is available.
- Does **not** download reference videos/audio, bypass DRM, or copy reference footage.
- Does **not yet** infer actual cuts, transitions, shot rhythm, camera language, typography, grading, narration, music, or sound design.
- The profile artifact is a workflow output, not yet a durable cross-run channel database.

The current 15-second Remotion composition remains a technical demo, not a finished documentary. Autonomous rights-cleared footage selection, AI script/research, voiceover, music, scene-by-scene Director's Blueprint, full editing integration, and final-video QA remain production milestones.

## Open-source skills

Selected YouTube creator skills are included under `.agents/skills/` with attribution and their original MIT license. See [third-party attribution and scope](third_party/youtube-agent-skill/README.md) and [the reference-link implementation notes](docs/REFERENCE-VIDEOS.md).
