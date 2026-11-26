# OpenMontage integration

This repository tracks the upstream OpenMontage production engine as a Git submodule:

- Upstream: https://github.com/OpenMontageInc/OpenMontage
- Local path: `vendor/OpenMontage`
- Pinned upstream commit: `2e003e65fa99a0f329478a2c1cdcf26bc481933a`
- Upstream license: GNU AGPL-3.0 (see `vendor/OpenMontage/LICENSE`)

## Clone and initialize

Use a recursive clone so the production engine is present:

```bash
git clone --recurse-submodules https://github.com/a2023a10a7-dotcom/YouTube-.git
```

For an existing checkout:

```bash
git submodule update --init --recursive
```

OpenMontage's documented local setup requires Python 3.10+, FFmpeg, a supported patched Node.js release (see upstream `.node-version`), then `make setup` from `vendor/OpenMontage`. Its dependencies and runtime are separate from this repository's Remotion prototype; do not install its requirements into the Node-only workflow blindly.

## Documentary production route

The upstream engine contains a dedicated retrieval-first documentary pipeline:

- Manifest: `vendor/OpenMontage/pipeline_defs/documentary-montage.yaml`
- Executive producer: `vendor/OpenMontage/skills/pipelines/documentary-montage/executive-producer.md`
- Scene director: `vendor/OpenMontage/skills/pipelines/documentary-montage/scene-director.md`
- Asset director: `vendor/OpenMontage/skills/pipelines/documentary-montage/asset-director.md`
- Edit director: `vendor/OpenMontage/skills/pipelines/documentary-montage/edit-director.md`
- Composer: `vendor/OpenMontage/skills/pipelines/documentary-montage/compose-director.md`
- Reference analyst: `vendor/OpenMontage/skills/meta/video-reference-analyst.md`

This pipeline searches and retrieves real footage from supported stock and public archives, records asset provenance, builds an edit timeline, and renders through the upstream composition tools.

## Important integration gaps — do not misrepresent them

The upstream documentary manifest currently says `reference_input.supported: false`. Reference analysis exists as a separate meta-skill, but the documentary pipeline does not yet declare native reference-input support. Our existing `src/reference-videos.mjs` only validates/saves 3 or 5 YouTube URLs and public oEmbed metadata; it does **not** analyze full video frames, timing, transitions, typography, or audio. The existing thumbnail-analysis workflow is explicitly limited evidence.

Therefore this submodule integration is the upstream engine foundation, not proof that the end-to-end YouTube workflow is complete. The next adapter work must:
1. Analyze each supplied reference using authorized, accessible frame/audio evidence and store evidence + confidence in the channel profile.
2. Convert the resulting style profile into documentary scene/edit constraints (shot duration distribution, camera/motion language, transitions, typography, palette, sound design).
3. Keep reference media as style-only input; never reuse copyrighted reference footage or audio.
4. Let the agent select and retrieve footage autonomously, but reject assets without source URL and license/provenance evidence.
5. Run render QA (duration, resolution, black/frozen frames, audio peaks/loudness, subtitle timing, missing media) before offering the MP4.
6. Require user approval before publishing, not for every routine asset choice.

The upstream documentary manifest defaults to guided checkpoints and human approvals. Do not silently claim autonomous operation until the local adapter overrides those gates safely and is tested.

## License and attribution

OpenMontage is GNU AGPL-3.0. Keep the upstream submodule pointer and its LICENSE intact. If code is copied, modified, combined, or offered as a network service, review and comply with the AGPL-3.0 source and notice requirements before distribution/deployment. This document is not legal advice.
