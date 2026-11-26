# AI Director and scene footage workflow

The AI Director uses the OpenAI Chat Completions API (credential from `OPENAI_API_KEY`) to turn a supplied English script into structured scenes, narration, visual search prompts, transitions, and timed caption cues. It then queries the Pexels API using `PEXELS_API_KEY`, picks a candidate using text-match ranking, downloads the clip, and records provenance.

Run with a script file in a provisioned environment:
```sh
OPENAI_API_KEY=... PEXELS_API_KEY=... node src/ai-director.mjs script.txt
```

This currently creates `public/project/blueprint.json` and `props.json`, plus clip files and the source manifest. It is not yet integrated into the Remotion render command. Stock candidate ranking is heuristic rather than a vision model, and license/usage must be reviewed before publication. Voice generation is a separate milestone.
