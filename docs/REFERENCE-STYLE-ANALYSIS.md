# Full reference-video style analysis

The reference workflow accepts exactly 3 or 5 HTTPS YouTube video links. It stores the links and public metadata, then runs the pinned OpenMontage `VideoAnalyzer` against each accessible reference.

For every reference, OpenMontage attempts to retrieve accessible media, detect scene boundaries, measure pacing, extract keyframes, obtain available transcript data, and estimate audio energy. The local vision step examines extracted keyframes and records evidence-backed observations for subject, subject motion, scene/overlays, spatial framing, camera language, color, typography, transitions where evidence supports them, sound evidence, and story structure.

Run after saving the profile:

```bash
python -m pip install -r vendor/OpenMontage/requirements.txt yt-dlp youtube-transcript-api "scenedetect[opencv]"
node src/reference-video-analysis.mjs
```

The generated `data/REFERENCE-STYLE-PROFILE.json` is consumed by `src/ai-director.mjs`. The AI Director is instructed to use only observations with evidence and confidence, and to treat reference media as style-only input. Reference video/audio is not copied into the new production.

Limitations are explicit: unavailable/private/blocked videos cannot be analyzed; sampled keyframes cannot prove every transition or exact camera/lens setting; audio-energy analysis does not identify every sound effect or music instrument. A failed reference analysis must stop production rather than silently substitute thumbnail-only guesses.
