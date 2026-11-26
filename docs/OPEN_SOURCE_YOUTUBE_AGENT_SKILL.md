# Open-source YouTube Agent Skill integration

## Upstream
- Repository: https://github.com/Jakeschincariol/youtube-agent-skill
- License: MIT
- Upstream commit reviewed: a2feb2104981a375ffd4f87ee04f4f5344ac43c6
- Original author: Jake Schincariol

## Skills to adapt
1. `yt-script`: script outline, hook options and hook scoring.
2. `yt-package`: title and thumbnail pairing review.
3. `yt-edit`: transcript-based edit decision list.
4. `yt-comment`: comment triage and response drafts.
5. `yt-plan`: publishing schedule planning.
6. `yt-viral`: analysis of supplied public video metrics.
7. `yt-retention`: audience-retention export analysis.
8. `yt-shorts`: identify short-form segments in long transcripts.
9. `yt-seo`: description and search-term drafting.
10. `yt-chapters`: chapter generation and validation.
11. `yt-audit`: channel review and prioritization.

## Important capability boundary
This is a creator-assistance skill pack, not an autonomous video production system. It primarily drafts text and analyzes user-provided data. It does not autonomously source/license/download scene footage, create the Director's Blueprint, edit/render a finished MP4, or publish videos. Our own production pipeline must implement those capabilities.

## Integration rules
- Adapt the skills for the project's agent runtime (prefer the shared `.agents/skills/` layout where supported).
- Preserve the upstream MIT copyright and license notice in any copied or modified distribution.
- Keep upstream attribution and record the exact upstream commit used.
- Review each skill and helper before enabling it; do not blindly execute shell commands or accept untrusted data as instructions.
- Connect `yt-script`, `yt-package`, `yt-seo`, and `yt-chapters` to our script, metadata, and final-timeline outputs.
- Connect `yt-edit` to the transcript/timeline pipeline as an advisory edit-decision layer; the actual renderer remains our own.
- Treat analytics-dependent skills as optional unless the required exports/data are supplied.
- Add tests and document any changes from upstream.

## Upstream installation reference
The upstream README documents installation through Skills CLI:

```bash
npx skills add Jakeschincariol/youtube-agent-skill --all
```

For our repository, prefer vendoring reviewed skill files into `.agents/skills/` so the exact version is pinned and reproducible.
